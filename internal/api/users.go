package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

func parseErr(w http.ResponseWriter) {
	http.Error(w, "Failed to parse request.", http.StatusBadRequest)
}

func internalErr(w http.ResponseWriter) {
	http.Error(w, "Internal Server Error", http.StatusInternalServerError)
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
	if err != nil || creds.Email == "" || creds.Password == "" {
		parseErr(w)
		return
	}

	var password string
	err = conn.QueryRow(
		ctx,
		"SELECT password FROM users WHERE email = $1",
		creds.Email,
	).Scan(&password)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Perform the same amount of work regardless of whether the email exists.
			// This should prevent a timing attack that tries to detect if an email is registered.
			const DUMMY_PASS = "$2a$10$jC.KuAg.b116zcRTLTUcS.h/puEb.QViFkuB3tbvvmJXfMXSz.jIm"
			checkPassword(DUMMY_PASS, "abc123")
			http.Error(w, "Access denied.", http.StatusUnauthorized)
		} else {
			internalErr(w)
		}
		return
	}

	if checkPassword(password, creds.Password) {
		w.Write([]byte("Access granted."))
	} else {
		http.Error(w, "Access denied.", http.StatusUnauthorized)
	}
}

type createUserCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func CreateUser(
	conn *pgx.Conn, ctx context.Context,
	w http.ResponseWriter, r *http.Request,
) {
	var creds createUserCredentials
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil || creds.Email == "" || creds.Password == "" {
		parseErr(w)
		return
	}

	pass, err := hashPassword(creds.Password)
	if err != nil {
		internalErr(w)
		return
	}

	ct, err := conn.Exec(
		ctx,
		"INSERT INTO users (email, password) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		creds.Email, pass,
	)

	if err != nil {
		internalErr(w)
		return
	}

	// TODO: send a reset password email and return success message.
	if ct.RowsAffected() == 0 {
		http.Error(w, "User with this email already exists.", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
