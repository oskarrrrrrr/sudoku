package main

import (
	"html/template"
	"io"
	"log"
	"os"
	"path"
	"path/filepath"
	"strconv"
)

var UI_DIR string = filepath.Join("ui", "src")
var OUT_DIR string = filepath.Join("site", "static")

func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func readTemplateString(file_name string) string {
	f, err := os.Open(file_name)
	check(err)
	defer f.Close()
	templateStringBytes, err := io.ReadAll(f)
	check(err)
	return string(templateStringBytes[:])
}

func renderTemplate(inFile, outFile, tempName string, input any) {
	tempPath := path.Join(UI_DIR, inFile)
	templateString := readTemplateString(tempPath)

	temp, err := template.New(tempName).Parse(templateString)
	check(err)

	outPath := path.Join(OUT_DIR, outFile)
	of, err := os.Create(outPath)
	check(err)
	defer of.Close()

	err = temp.ExecuteTemplate(of, tempName, input)
	check(err)
}

type Ids struct {
	TableData string
	TextArea  string
	Style     template.CSS
}

type SudokuCell struct {
	Id         string
	VertBorder bool
}

type SudokuRow struct {
	Cells       []SudokuCell
	HorizBorder bool
}

type Sudoku struct {
	Rows []SudokuRow
}

func newSudoku(n int) Sudoku {
	rows := make([]SudokuRow, n*n)
	for rowIdx := range rows {
		row := &rows[rowIdx]
		if (rowIdx+1)%n == 0 && rowIdx+1 < n*n {
			row.HorizBorder = true
		}
		row.Cells = make([]SudokuCell, n*n)
		for colIdx := 0; colIdx < n*n; colIdx++ {
			posStr := strconv.Itoa(rowIdx) + "-" + strconv.Itoa(colIdx)
			row.Cells[colIdx].Id = "sudoku-cell-" + posStr
			if (colIdx+1)%n == 0 && colIdx+1 < n*n {
				row.Cells[colIdx].VertBorder = true
			}
		}
	}
	return Sudoku{Rows: rows[:]}
}

func home(header template.HTML) {
	input := struct {
		Header template.HTML
		Sudoku Sudoku
	}{
		Header: header,
		Sudoku: newSudoku(3),
	}
	renderTemplate("index.html", "index.html", "index", input)
}

func login(header template.HTML) {
	renderTemplate(
		"login.html", "login.html", "login",
		struct{ Header template.HTML }{Header: header},
	)
}

type authMessageInput struct {
	Header  template.HTML
	Message string
}

func register(header template.HTML) {
	renderTemplate(
		"register.html", "register.html", "register",
		struct{ Header template.HTML }{Header: header},
	)
	renderTemplate(
		"auth-message.html", "register-complete.html", "register-complete",
		authMessageInput {
            Header: header,
            Message: "Registration complete. Check your email to activate your account.",
        },
	)
}

func verification(header template.HTML) {
	renderTemplate(
		"auth-message.html", "verification-succeeded.html", "verification-succeeded",
		authMessageInput {
            Header: header,
            Message: "Verification successful. You can now use your account.",
        },
	)
	renderTemplate(
		"auth-message.html", "verification-failed.html", "verification-failed",
		authMessageInput {
            Header: header,
            Message: "Verification failed. Invalid or expired token. Register again.",
        },
	)
}

func forgot_password(header template.HTML) {
	renderTemplate(
		"forgot-password.html", "forgot-password.html", "forgot-password",
		struct{ Header template.HTML }{Header: header},
	)
}

func main() {
	err := os.MkdirAll(OUT_DIR, os.FileMode(0777))
	check(err)

	headerPath := path.Join(UI_DIR, "header.html")
	header := template.HTML(readTemplateString(headerPath))

	home(header)
	login(header)
	register(header)
    verification(header)
	forgot_password(header)
}
