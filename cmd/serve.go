package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/oskarrrrrrr/sudoku-web/internal/api"
	"github.com/oskarrrrrrr/sudoku-web/internal/migrations"
	"github.com/oskarrrrrrr/sudoku-web/internal/sudoku"
)

func isProd() bool {
	return strings.ToLower(os.Getenv("SUDOKU_ENV")) == "prod"
}

type HTMLDir struct {
	Dir http.Dir
}

func (d HTMLDir) Open(name string) (http.File, error) {
	f, err := d.Dir.Open(name)
	if os.IsNotExist(err) {
		if f, err := d.Dir.Open(name + ".html"); err == nil {
			return f, nil
		}
	}
	return f, err
}

func main() {
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(context.Background())

	migs := migrations.ListMigrations("migrations")
	migrations.RunAll(conn, ctx, migs)

	fs := http.FileServer(HTMLDir{Dir: http.Dir("./static")})
	http.Handle("/", fs)

	sudokus := sudoku.ReadSudokus()
	http.HandleFunc(
		"GET /api/random-sudoku",
		func(w http.ResponseWriter, r *http.Request) {
			sudoku.RandomSudoku(sudokus, w, r)
		},
	)

	http.HandleFunc(
		"POST /api/login",
		func(w http.ResponseWriter, r *http.Request) {
			api.Login(conn, ctx, w, r)
		},
	)

	emailSender := api.MockEmailSend
	if isProd() {
		postmarkToken := os.Getenv("POSTMARK_TOKEN")
		if postmarkToken == "" {
			panic("Postmark token undefined")
		}
		emailSender = api.GetPostmarkEmailSender("https://api.postmarkapp.com/email", postmarkToken)
	}

	http.HandleFunc(
		"POST /api/register",
		func(w http.ResponseWriter, r *http.Request) {
			api.CreateUser(conn, ctx, emailSender, !isProd(), w, r)
		},
	)

	http.HandleFunc(
		"GET /verify/{token}",
		func(w http.ResponseWriter, r *http.Request) {
			api.VerifyUser(conn, ctx, w, r)
		},
	)

	log.Println("Server starting on port 9100...")
	if err := http.ListenAndServe(":9100", nil); err != nil {
		fmt.Println(err)
	}
}
