package api

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

func parseErr(w http.ResponseWriter) {
	http.Error(w, "Failed to parse request.", http.StatusBadRequest)
}

func internalErr(w http.ResponseWriter, err error) {
	http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	log.Printf("Inernal err: %v", err)
}

func hashPassword(pass string) ([]byte, error) {
	const BCRYPT_MAX_PASS_LEN = 72
	const BCRYPT_COST = 10 // same as default at the moment, should take ~100ms
	if len(pass) > BCRYPT_MAX_PASS_LEN {
		pass = pass[:BCRYPT_MAX_PASS_LEN]
	}
	return bcrypt.GenerateFromPassword([]byte(pass), BCRYPT_COST)
}

func checkPassword(hash, pass string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pass)) == nil
}

func validateEmail(email string) (bool, error) {
	if len(email) > 320 {
		return false, nil
	}
	emailOk, err := regexp.Match(`^[^@]+@[^@]+\.[^@]+$`, []byte(email))
	if err != nil {
		log.Printf("ERR: Failed email validation: '%s'\n", email)
		return false, err
	}
	return emailOk, nil
}

type loginCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Login(
	conn *pgx.Conn, ctx context.Context,
	w http.ResponseWriter, r *http.Request,
) {
	var creds loginCredentials
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		parseErr(w)
		return
	}

	emailOk, err := validateEmail(creds.Email)
	if err != nil {
		internalErr(w, err)
		return
	}
	if !emailOk {
		http.Error(w, "Invalid email format.", http.StatusBadRequest)
		return
	}
	if len(creds.Password) < PASSWORD_MIN_LEN {
		http.Error(w, "Password too short.", http.StatusBadRequest)
		return
	}

	var password string
	var verified bool
	err = conn.QueryRow(
		ctx,
		"SELECT password, verified FROM users WHERE email = $1",
		creds.Email,
	).Scan(&password, &verified)

	if !verified || err != nil {
		if !verified || errors.Is(err, pgx.ErrNoRows) {
			// Perform the same amount of work regardless of whether the email exists.
			// This should prevent a timing attack that tries to detect if an email is registered.
			const DUMMY_PASS = "$2a$10$jC.KuAg.b116zcRTLTUcS.h/puEb.QViFkuB3tbvvmJXfMXSz.jIm"
			checkPassword(DUMMY_PASS, "abc123")
			http.Error(w, "Access denied.", http.StatusUnauthorized)
		} else {
			internalErr(w, err)
		}
		return
	}

	if checkPassword(password, creds.Password) {
		w.Write([]byte("Access granted."))
	} else {
		http.Error(w, "Access denied.", http.StatusUnauthorized)
	}
}

const PASSWORD_MIN_LEN = 8

type createUserCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func SendNewUserEmail(ctx context.Context, sendEmail EmailSender, to, token string) error {
    link :=  `https://www.` + Domain + `/verify/` + token
    linkHtml := `<a href="` + link + `">` + link + `</a>`
	email := Email{
		From:    "verify-email@" + Domain,
		To:      to,
		Subject: "Sudoku - Verify Email",
		HtmlBody: `Hi,<br><br>here is your activation link: ` + linkHtml + `<br><br>Best,<br>Oskar`,
		MessageStream: MessageStreamOutbound,
	}
	return sendEmail(ctx, email)
}

func CreateUser(
	conn *pgx.Conn, ctx context.Context, sendEmail EmailSender, debug bool,
	w http.ResponseWriter, r *http.Request,
) {
	var creds createUserCredentials
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		parseErr(w)
		return
	}

	emailOk, err := regexp.Match(`^[^@]+@[^@]+\.[^@]+$`, []byte(creds.Email))
	if err != nil {
		internalErr(w, err)
		return
	}
	if !emailOk {
		http.Error(w, "Invalid email format.", http.StatusBadRequest)
		return
	}
	if len(creds.Password) < PASSWORD_MIN_LEN {
		http.Error(w, "Password too short.", http.StatusBadRequest)
		return
	}

	pass, err := hashPassword(creds.Password)
	if err != nil {
		internalErr(w, err)
		return
	}

	var userId string
	err = conn.QueryRow(
		ctx,
		`INSERT INTO users (email, password) VALUES ($1, $2)
        ON CONFLICT DO NOTHING RETURNING id`,
		creds.Email, pass,
	).Scan(&userId)

    if errors.Is(err, pgx.ErrNoRows) {
        // TODO: send password reset link instead
        err = conn.QueryRow(
            ctx,
            `SELECT id FROM users WHERE email =  $1`,
            creds.Email,
        ).Scan(&userId)
    }
    if err != nil {
        internalErr(w, err)
		return
	}

	expires_at := time.Now().Add(15 * time.Minute)
	var token string
	err = conn.QueryRow(
		ctx,
		`INSERT INTO verification_tokens (user_id, expires_at) VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
            SET token = gen_random_uuid(),
                expires_at = $2
        RETURNING token`,
		userId, expires_at,
	).Scan(&token)

	if err != nil {
		internalErr(w, err)
		return
	}

    if debug {
        log.Printf("New user: '%v', token: %v\n", creds.Email, token)
    }

    err = SendNewUserEmail(ctx, sendEmail, creds.Email, token)
    if err != nil {
        internalErr(w, err)
        return
    }
	w.WriteHeader(http.StatusNoContent)
}

func VerifyUser(
	conn *pgx.Conn, ctx context.Context,
	w http.ResponseWriter, r *http.Request,
) {
	token := r.PathValue("token")
	err := uuid.Validate(token)
	if err != nil {
		parseErr(w)
		return
	}

	tx, err := conn.Begin(ctx)
	defer tx.Rollback(context.Background())
	if err != nil {
		internalErr(w, err)
		return
	}

	var expires_at time.Time
	var user_id string
	err = tx.QueryRow(
		ctx,
		`DELETE FROM verification_tokens WHERE token = $1 RETURNING user_id, expires_at`,
		token,
	).Scan(&user_id, &expires_at)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Token not found.", http.StatusConflict)
		} else {
			internalErr(w, err)
		}
		return
	}

	if time.Now().After(expires_at) {
		tx.Commit(ctx)
		http.Error(w, "Token expired.", http.StatusConflict)
		return
	}

	ct, err := tx.Exec(ctx, `UPDATE users SET verified = true WHERE id = $1`, user_id)

	if err != nil || ct.RowsAffected() != 1 {
		internalErr(w, err)
		tx.Rollback(ctx)
		return
	}

	tx.Commit(ctx)
	w.WriteHeader(http.StatusNoContent)
}
