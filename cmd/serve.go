package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/oskarrrrrrr/sudoku-web/internal/api"
	"github.com/oskarrrrrrr/sudoku-web/internal/migrations"
	"github.com/oskarrrrrrr/sudoku-web/internal/sudoku"
)

func main() {
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(context.Background())

	migs := migrations.ListMigrations("migrations")
	migrations.RunAll(conn, ctx, migs)

	http.Handle("/", http.FileServer(http.Dir("./static")))

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

	http.HandleFunc(
		"POST /api/users",
		func(w http.ResponseWriter, r *http.Request) {
			api.CreateUser(conn, ctx, w, r)
		},
	)

	log.Println("Server starting on port 9100...")
	if err := http.ListenAndServe(":9100", nil); err != nil {
		fmt.Println(err)
	}
}
