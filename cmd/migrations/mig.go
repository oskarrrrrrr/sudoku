package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/oskarrrrrrr/sudoku-web/internal/migrations"
)

func conn() (context.Context, *pgx.Conn) {
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
    return ctx, conn
}


func main() {
	command := flag.String("cmd", "", "Command to execute")
	flag.Parse()

	if *command == "" {
		fmt.Println("Please provide a command.")
		flag.Usage()
		return
	}

	switch *command {
	case "list":
		for _, p := range migrations.ListMigrations("migrations") {
			fmt.Println(p)
		}
    case "run-all":
        ctx, conn := conn()
        defer conn.Close(context.Background())
        migs := migrations.ListMigrations("migrations")
        migrations.RunAll(conn, ctx, migs)
	default:
		fmt.Println("Unknown command:", command)
	}
}
