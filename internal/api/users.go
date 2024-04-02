package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5"
)

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Login(
	conn *pgx.Conn, ctx context.Context,
	w http.ResponseWriter, r *http.Request,
) {
	var creds credentials
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil || creds.Email == "" || creds.Password == "" {
		http.Error(w, "Failed to parse request.", http.StatusBadRequest)
		return
	}

	var password string
	err = conn.QueryRow(
		ctx,
		"SELECT password FROM users WHERE email = $1",
		creds.Email,
	).Scan(&password)

	if err != nil || creds.Password != password {
		http.Error(w, "Access denied.", http.StatusUnauthorized)
		return
	}

	w.Write([]byte("Access granted."))
}
