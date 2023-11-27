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

type Row struct {
	Ids []Ids
    Style template.CSS
}

type TemplateInput struct {
	Rows []Row
}

func readTemplateString(file_name string) string {
	f, err := os.Open(file_name)
	check(err)
	defer f.Close()
	templateStringBytes, err := io.ReadAll(f)
	check(err)
	return string(templateStringBytes[:])
}

func generateTemplateInput() TemplateInput {
	var rows [9]Row
	for rowIdx := range rows {
		row := &rows[rowIdx]
        if (rowIdx + 1) % 3 == 0 {
            row.Style = template.CSS("border-bottom: 3px solid black")
        }
		row.Ids = make([]Ids, 9)
		for colIdx := 0; colIdx < 9; colIdx++ {
            rowStr := strconv.Itoa(rowIdx)
            colStr := strconv.Itoa(colIdx)
			row.Ids[colIdx] = Ids {
                TableData: "sudoku_td." + rowStr + "." + colStr,
                TextArea: "c." + rowStr + "." + colStr,
            }
            if (colIdx + 1) % 3 == 0 {
                row.Ids[colIdx].Style = template.CSS("border-right: 3px solid black")
            }
		}
	}
	return TemplateInput{Rows: rows[:]}
}

func main() {
	templateString := readTemplateString("site/index.html")
	input := generateTemplateInput()
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
