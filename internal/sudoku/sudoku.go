package sudoku

import (
	"math/rand"
	"net/http"
	"os"
	"strings"
)

type Sudoku struct {
	hints int
	value string
}

type difficulty int

const (
	easy difficulty = iota
	medium
	hard
)

type parseError struct {
	msg string
}

func (err parseError) Error() string {
	return err.msg
}

func validateDifficulty(value string, default_ difficulty) (difficulty, *parseError) {
	switch value {
	case "":
		return default_, nil
	case "easy":
		return easy, nil
	case "medium":
		return medium, nil
	case "hard":
		return hard, nil
	default:
		msg := "Invalid difficulty. Expected one of: 'easy', 'medium', 'hard'. " +
			"Got: '" + value + "'"
		return easy, &parseError{msg: msg}
	}
}

func difficultyToString(diff difficulty) string {
	switch diff {
	case easy:
		return "easy"
	case medium:
		return "medium"
	case hard:
		return "hard"
	default:
		panic("unexpected difficulty value")
	}
}

func getSudokuWithDifficulty(sudokus map[int][]Sudoku, difficulty difficulty) Sudoku {
	var hints int
	switch difficulty {
	case easy:
		hints = 40
	case medium:
		hints = 32
	case hard:
		hints = 25
	default:
		panic("unknown difficulty")
	}
	arr := sudokus[hints]
	return arr[rand.Intn(len(arr))]
}

func ReadSudokus() map[int][]Sudoku {
	sudokusText, err := os.ReadFile("sudokus.txt")
	if err != nil {
		panic(err)
	}
	rawSudokus := strings.Split(strings.Trim(string(sudokusText), "\n"), "\n")
	sudokus := make(map[int][]Sudoku)
	for _, rawSudoku := range rawSudokus {
		// works only for 9x9 sudoku!
		hints := 81 - strings.Count(rawSudoku, "0")
		sudoku := Sudoku{hints: hints, value: rawSudoku}
		if hintsArr, ok := sudokus[hints]; ok {
			hintsArr = append(hintsArr, sudoku)
		} else {
			hintsArr := make([]Sudoku, 0)
			hintsArr = append(hintsArr, sudoku)
			sudokus[hints] = hintsArr
		}
	}
	return sudokus
}

func RandomSudoku(sudokus map[int][]Sudoku, w http.ResponseWriter, r *http.Request) {
	rawDiff := r.URL.Query().Get("difficulty")
	diff, err := validateDifficulty(rawDiff, difficulty(rand.Intn(3)))
	if err != nil {
		http.Error(w, err.msg, http.StatusUnprocessableEntity)
	}
	sudoku := getSudokuWithDifficulty(sudokus, diff)
	body := difficultyToString(diff) + "\n" + sudoku.value
	w.Write([]byte(body))
}
