package main

import (
	"html/template"
	"io"
	"log"
	"os"
	"strconv"
)

func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

type Ids struct {
    TableData string
    TextArea string
    Style template.CSS
}

type SudokuCell struct {
    Id string
    VertBorder bool
}

type SudokuRow struct {
    Cells []SudokuCell
    HorizBorder bool
}

type Sudoku struct {
    Rows []SudokuRow
}

type TemplateInput struct {
    Sudoku Sudoku
}


func readTemplateString(file_name string) string {
	f, err := os.Open(file_name)
	check(err)
	defer f.Close()
	templateStringBytes, err := io.ReadAll(f)
	check(err)
	return string(templateStringBytes[:])
}

func generateTemplateInput(n int) TemplateInput {
    rows := make([]SudokuRow, n*n)
	for rowIdx := range rows {
		row := &rows[rowIdx]
        if (rowIdx + 1) % n == 0 {
            row.HorizBorder = true
        }
		row.Cells = make([]SudokuCell, n*n)
		for colIdx := 0; colIdx < n*n; colIdx++ {
			row.Cells[colIdx].Id = "sudoku-cell-" + strconv.Itoa((rowIdx * n * n) + colIdx)
            if (colIdx + 1) % n == 0 {
                row.Cells[colIdx].VertBorder = true
            }
		}
	}
	return TemplateInput{Sudoku{Rows: rows[:]}}
}

func main() {
	templateString := readTemplateString("site/index.html")
	input := generateTemplateInput(3)
	temp, err := template.New("index").Parse(templateString)
	check(err)

    err = os.MkdirAll("out", os.FileMode(0777))
    check(err)

    of, err := os.Create("out/index.html")
    check(err)
    defer of.Close()

	err = temp.ExecuteTemplate(of, "index", input)
	check(err)
}
