# Sudoku

Checkout [here](https://www.boringsudoku.com).


# Development

To use a dev db:
- install postgres@16 and run it
- set PGUSER and PGPASSWORD env vars
- run `./scripts/reset-dev-db.sh` (there might be some errors if the db doesn't exist yet)

To run:
- go to ./site
- set DATABASE_URL="postgresql://localhost/sudoku-dev"
- set PGUSER, PGPASSWORD (or put it in DATABASE_URL)
- run `./api`
