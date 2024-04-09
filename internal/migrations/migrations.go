package migrations

import (
	"context"
	"errors"
	"log"
	"os"
	"path"
	"regexp"
	"slices"
	"strconv"

	"github.com/jackc/pgx/v5"
)

func parseNumOfMigrationFile(fileName string) int {
	re := regexp.MustCompile(`\d+`)
	numStr := re.Find([]byte(fileName))
	num, err := strconv.Atoi(string(numStr))
	if err != nil {
		panic(err)
	}
	return num
}

func sortMigrations(migs []string) {
	cmp := func(a, b string) int {
		na := parseNumOfMigrationFile(a)
		nb := parseNumOfMigrationFile(b)
		return na - nb
	}
	slices.SortFunc(migs, cmp)
}

func validateMigrationFileName(fileName string) bool {
	fileName = path.Base(fileName)
	matched, err := regexp.Match(`^\d+_.*\.sql$`, []byte(fileName))
	if err != nil {
		panic(err)
	}
	return matched
}

func ListMigrations(migrationsDir string) []string {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		panic(err)
	}
	var paths []string
	for _, e := range entries {
		p := path.Join(migrationsDir, e.Name())
		if validateMigrationFileName(e.Name()) {
			paths = append(paths, p)
		} else {
			log.Printf("Ignoring: '%v'\n", p)
		}
	}
	sortMigrations(paths)
	return paths
}

var ErrMigrationFailed = errors.New("Migration failed.")

func Run(conn *pgx.Conn, ctx context.Context, migrationFile string) error {
	query, err := os.ReadFile(migrationFile)
	if err != nil {
		return errors.Join(err, ErrMigrationFailed)
	}
	_, err = conn.Exec(ctx, string(query))
	if err != nil {
		return errors.Join(err, ErrMigrationFailed)
	}
	return nil
}

func RunAll(conn *pgx.Conn, ctx context.Context, migrationFiles []string) error {
	for _, migration := range migrationFiles {
		log.Printf("Running migration: '%v'\n", migration)
		err := Run(conn, ctx, migration)
		if err != nil {
			log.Printf("Failed. %v", err.Error())
			return err
		}
	}
	return nil
}
