package main

import (
	"fmt"
	"log"
	"net/http"
	"github.com/oskarrrrrrr/sudoku-web/internal/sudoku"
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./static")))

	sudokus := sudoku.ReadSudokus()
	http.HandleFunc(
		"GET /api/random-sudoku",
		func(w http.ResponseWriter, r *http.Request) {
			sudoku.RandomSudoku(sudokus, w, r)
		},
	)

	log.Println("Server starting on port 9100...")
	if err := http.ListenAndServe(":9100", nil); err != nil {
		fmt.Println(err)
	}
}
