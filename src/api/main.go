package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
)

func methodNotAllowed(w http.ResponseWriter) {
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func randomSudoku(sudokus []string, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
    i := rand.Intn(len(sudokus))
	w.Write([]byte(sudokus[i]))
}

func main() {
    sudokusText, err := os.ReadFile("sudokus.txt")
	if err != nil {
		panic(err)
	}
    sudokus := strings.Split(strings.Trim(string(sudokusText), "\n"), "\n")

	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/api/random-sudoku", func(w http.ResponseWriter, r *http.Request) { randomSudoku(sudokus, w, r) })
	fmt.Println("Server starting on port 9100...")
	if err := http.ListenAndServe(":9100", nil); err != nil {
		fmt.Println(err)
	}
}
