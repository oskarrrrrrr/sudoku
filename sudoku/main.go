package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"os"
	"runtime/pprof"
	"strconv"
)

var cpuprofile = flag.String("cpuprofile", "", "write cpu profile to file")
var sudokuCount = flag.Int("sudoku-count", 1, "number of sudokus to be generated")
var sudokuHints = flag.Int("sudoku-hints", 30, "number of hints in generated sudokus")
var sudokuSize = flag.Int("sudoku-size", 3, "size of sudoku")
var printToStdout = flag.Bool("stdout", true, "print sudokus to stdout")
var outFileName = flag.String("out", "", "output file")
var outAppend = flag.Bool("out-append", true, "append to output file if exists")

type sudokuPrint int

const (
	sudokuPrintInline sudokuPrint = iota
	sudokuPrintMultiline
)

func printSudoku(w io.Writer, sudoku [][]int, sudokuPrint sudokuPrint) {
	switch sudokuPrint {
	case sudokuPrintInline:
		first := true
		for _, row := range sudoku {
			for _, value := range row {
				if first {
					first = false
				} else {
					fmt.Fprint(w, ",")
				}
				fmt.Fprint(w, value)
			}
		}
		fmt.Fprintln(w)
	case sudokuPrintMultiline:
		for _, row := range sudoku {
			for _, value := range row {
				fmt.Fprintf(w, "%v ", value)
			}
			fmt.Fprintln(w)
		}
		fmt.Fprintln(w)
	default:
		panic("Unsupported sudoku print mode")
	}

}

func checkSudokuRules(n int, sudoku [][]int) bool {
	seen := make([]bool, n*n)

	clearSeen := func() {
		for i := range seen {
			seen[i] = false
		}
	}

	for _, row := range sudoku {
		clearSeen()
		for _, v := range row {
			if v == 0 {
				continue
			}
			if seen[v-1] {
				return false
			}
			seen[v-1] = true
		}
	}

	for colIdx := 0; colIdx < n*n; colIdx++ {
		clearSeen()
		for _, row := range sudoku {
			v := row[colIdx]
			if v == 0 {
				continue
			}
			if seen[v-1] {
				return false
			}
			seen[v-1] = true
		}
	}

	for startRowIdx := 0; startRowIdx < n*n; startRowIdx += n {
		for startColIdx := 0; startColIdx < n*n; startColIdx += n {
			clearSeen()
			for row := 0; row < n; row++ {
				for col := 0; col < n; col++ {
					v := sudoku[startRowIdx+row][startColIdx+col]
					if v == 0 {
						continue
					}
					if seen[v-1] {
						return false
					}
					seen[v-1] = true
				}
			}
		}
	}

	return true
}

func copySudoku(n int, sudoku [][]int) [][]int {
	_sudoku := make([][]int, n*n)
	for rowIdx := range _sudoku {
		_sudoku[rowIdx] = make([]int, n*n)
		for colIdx := range _sudoku[rowIdx] {
			_sudoku[rowIdx][colIdx] = sudoku[rowIdx][colIdx]
		}
	}
	return _sudoku
}

func countSolutions(n int, sudoku [][]int, stopAfter int, random bool) (solutions [][][]int) {
	_sudoku := copySudoku(n, sudoku)

	rows, cols, uniqueValues := n*n, n*n, n*n
	tried := make([]bool, rows*cols*uniqueValues)

	triedIdx := func(row, col, value int) int {
		return (row * cols * uniqueValues) + (col * uniqueValues) + value - 1
	}

	addTried := func(row, col, value int) {
		tried[triedIdx(row, col, value)] = true
	}

	nextNotTried := func(row, col int) int {
		start := triedIdx(row, col, 1)
		for i := 0; i < uniqueValues; i++ {
			if !tried[start+i] {
				return i + 1
			}
		}
		return 0
	}

	randomNotTried := func(row, col int) int {
		untried := 0
		start := triedIdx(row, col, 1)
		for i := 0; i < uniqueValues; i++ {
			if !tried[start+i] {
				untried++
			}
		}

		if untried == 0 {
			return 0
		}

		selectedOrd := rand.Intn(untried)
		for i := 0; i < uniqueValues; i++ {
			if !tried[start+i] {
				if selectedOrd == 0 {
					return i + 1
				}
				selectedOrd--
			}
		}

		panic("random not tried failed")
	}

	clearTriedFrom := func(row, col int) {
		for i := triedIdx(row, col, 1); i < len(tried); i++ {
			tried[i] = false
		}
	}

	nextRowCol := func(row, col int) (int, int, bool) {
		for r := row; r < n*n; r++ {
			var startC int
			if r == row {
				startC = col
			} else {
				startC = 0
			}
			for c := startC; c < n*n; c++ {
				if _sudoku[r][c] == 0 {
					return r, c, true
				}
			}
		}
		return 0, 0, false
	}

	var dfs func(int, int)
	dfs = func(row, col int) {
		for {
			var v int
			if random {
				v = randomNotTried(row, col)
			} else {
				v = nextNotTried(row, col)
			}
			if v == 0 {
				_sudoku[row][col] = 0
				clearTriedFrom(row, col)
				return
			}
			_sudoku[row][col] = v
			if checkSudokuRules(n, _sudoku) {
				r, c, notFull := nextRowCol(row, col)
				if notFull {
					dfs(r, c)
					if len(solutions) == stopAfter {
						return
					}
				} else {
					solutions = append(solutions, copySudoku(n, _sudoku))
					if len(solutions) == stopAfter {
						return
					}
				}
			}
			addTried(row, col, v)
		}
	}

	if row, col, notFull := nextRowCol(0, 0); notFull {
		dfs(row, col)
	} else {
		solutions = append(solutions, _sudoku)
		return
	}

	return
}

func randomSudoku(n, hints int) ([][]int, [][]int) {
	sudoku := make([][]int, n*n)
	for rowIdx := range sudoku {
		sudoku[rowIdx] = make([]int, n*n)
	}
	sudoku = countSolutions(n, sudoku, 1, true)[0]

	_sudoku := copySudoku(n, sudoku)

	findNthTaken := func(k int, seen [][]bool) (int, int) {
		for rowIdx, row := range _sudoku {
			for colIdx, v := range row {
				if v != 0 && !seen[rowIdx][colIdx] {
					k--
				}
				if k < 0 {
					return rowIdx, colIdx
				}
			}
		}
		panic("cant take such elem")
	}

	var dfs func(int) bool
	dfs = func(currHints int) bool {
		if currHints == hints {
			return true
		}
		var seen [][]bool
		for range sudoku {
			row := make([]bool, len(sudoku[0]))
			seen = append(seen, row)
		}
		seenCount := 0

		for {
			if currHints == seenCount {
				return false
			}
			targetIdx := rand.Intn(currHints - seenCount)
			row, col := findNthTaken(targetIdx, seen)
			seen[row][col] = true
			seenCount++
			v := _sudoku[row][col]
			_sudoku[row][col] = 0
			solutions := countSolutions(n, _sudoku, 2, true)
			if len(solutions) == 0 {
				panic("no solutions found")
			}
			if len(solutions) > 1 {
				_sudoku[row][col] = v
			} else {
				if dfs(currHints - 1) {
					return true
				}
				_sudoku[row][col] = v
			}
		}
	}

	dfs(n * n * n * n)
	return _sudoku, sudoku
}

func countHints(sudoku [][]int) int {
	hints := 0
	for _, row := range sudoku {
		for _, v := range row {
			if v != 0 {
				hints++
			}
		}
	}
	return hints
}

func main() {
	flag.Parse()

	if *cpuprofile != "" {
		f, err := os.Create(*cpuprofile)
		if err != nil {
			log.Fatal(err)
		}
		pprof.StartCPUProfile(f)
		defer pprof.StopCPUProfile()
	}

    var outFile *os.File
    if *outFileName != "" {
        fileFlags := os.O_WRONLY | os.O_CREATE
        if *outAppend {
            fileFlags |= os.O_APPEND
        } else {
            fileFlags |= os.O_TRUNC
        }
        var err error
        outFile, err = os.OpenFile(*outFileName, fileFlags, 0600)
        if err != nil {
            panic(err)
        }
        defer outFile.Close()
    }

	for range *sudokuCount {
		sudoku, _ := randomSudoku(*sudokuSize, *sudokuHints)

		if *printToStdout {
			printSudoku(os.Stdout, sudoku, sudokuPrintInline)
		}

        if outFile != nil {
            printSudoku(outFile, sudoku, sudokuPrintInline)
        }

		if actualHints := countHints(sudoku); actualHints != *sudokuHints {
			log.Printf("[WARN] requested hints not matching generated hints (%v != %v)", actualHints, *sudokuHints)
		}

		solutions := countSolutions(*sudokuSize, sudoku, -1, false)
		if len(solutions) == 0 {
			panic("found no solutions")
		}
		if len(solutions) > 1 {
			panic("found multiple solutions: " + strconv.Itoa(len(solutions)))
		}
	}
}
