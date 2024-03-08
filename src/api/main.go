package main

import (
	"fmt"
	"net/http"
)

func methodNotAllowed(w http.ResponseWriter) {
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func randomSudoku(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	sudoku := []byte("0,0,0,0,8,4,0,0,6,0,0,0,0,0,0,0,0,4,4,8,6,0,0,0,9,7,5,9,0,5,3,0,7,0,0,0,3,2,0,0,0,0,0,5,9,0,0,0,5,0,0,3,6,0,0,4,1,8,0,0,5,0,3,5,7,0,0,0,6,0,4,0,2,0,0,4,0,0,0,0,0")
	w.Write(sudoku)
}

func main() {
	http.Handle("/", http.FileServer(http.Dir("./site")))
	http.HandleFunc("/api/random-sudoku", randomSudoku)
	fmt.Println("Server starting on port 9100...")
	if err := http.ListenAndServe(":9100", nil); err != nil {
		fmt.Println(err)
	}
}
