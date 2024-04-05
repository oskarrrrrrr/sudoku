#!/usr/bin/env bash

# drop all connections
psql \
    -U postgres \
    -d sudoku-dev \
    -c "SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid();" \
    > /dev/null

dropdb sudoku-dev
createdb sudoku-dev

export DATABASE_URL="postgresql://localhost/sudoku-dev"
go run cmd/migrations/mig.go -cmd run-all

psql \
    -U postgres \
    -d sudoku-dev \
    -c "\copy users (email, password) FROM mock/users.csv DELIMITER ',' CSV HEADER;"
