class Sudoku {
    board: number[]
    readonly size: number
    readonly sizeSq: number
    is_frozen: boolean[]

    constructor(size: number) {
        this.size = size
        this.sizeSq = size ** 2
        this.board = []
        this.is_frozen = []
        for (let i = 0; i < this.sizeSq ** 2; ++i) {
            this.board.push(0)
            this.is_frozen.push(false)
        }
    }

    freezeCell(row: number, col: number): void {
        const idx = this._get_idx(row, col)
        if (this.board[idx] == 0) {
            throw new Error(`Can't freeze an empty cell: (${row}, ${col})`)
        }
        this.is_frozen[idx] = true
    }

    unfreezeCell(row: number, col: number): void {
        const idx = this._get_idx(row, col)
        this.is_frozen[idx] = false
    }

    isCellFrozen(row: number, col: number): boolean {
        const idx = this._get_idx(row, col)
        return this.is_frozen[idx]
    }

    setCell(row: number, col: number, val: number): void {
        if (this.sizeSq < val || val < 1) {
            throw new Error(`Unexpected cell value: ${val}.`)
        }
        const idx = this._get_idx(row, col)
        if (this.is_frozen[idx]) {
            throw new Error(`Can't change a frozen cell: (${row}, ${col})`)
        }
        this.board[idx] = val
    }

    getCell(row: number, col: number): number {
        const idx = this._get_idx(row, col)
        return this.board[idx]
    }

    clearCell(row: number, col: number): void {
        const idx = this._get_idx(row, col)
        if (this.is_frozen[idx]) {
            throw new Error(`Can't change a frozen cell: (${row}, ${col})`)
        }
        this.board[idx] = 0
    }

    clear(): void {
        for (let i = 0; i < this.board.length; ++i) {
            this.board[i] = 0
        }
        for (let i = 0; i < this.is_frozen.length; ++i) {
            this.is_frozen[i] = false
        }
    }

    isDone(): boolean {
        console.log("isdone?")

        let seen: boolean[] = new Array(this.sizeSq)

        const clearSeen = () => {
            for (let i = 0; i < seen.length; ++i) {
                seen[i] = false
            }
        }

        const allSeen = () => {
            for (let i = 0; i < seen.length; ++i) {
                if (!seen[i]) {
                    return false
                }
            }
            return true
        }

        clearSeen()

        // rows
        for (let rowStartIdx = 0; rowStartIdx < this.board.length; rowStartIdx += this.sizeSq) {
            for (let i = 0; i < this.sizeSq; ++i) {
                const val = this.board[rowStartIdx + i]
                if (val == 0) { return false }
                seen[val - 1] = true
            }
            if (!allSeen()) {
                return false
            }
            clearSeen()
        }

        console.log("rows ok")

        // cols
        for (let colStartIdx = 0; colStartIdx < this.sizeSq; ++colStartIdx) {
            for (let i = 0; i < this.sizeSq; ++i) {
                const val = this.board[colStartIdx + (this.sizeSq * i)]
                if (val == 0) { return false }
                seen[val - 1] = true
            }
            if (!allSeen()) {
                return false
            }
            clearSeen()
        }

        console.log("cols ok")


        // squares
        for (let sqRowIdx = 0; sqRowIdx < this.board.length; sqRowIdx += this.size ** 3) {
            for (let sqInRowIdx = 0; sqInRowIdx < this.sizeSq; sqInRowIdx += this.size) {
                for (let r = 0; r < this.size; ++r) {
                    for (let c = 0; c < this.size; ++c) {
                        const idx = sqRowIdx + sqInRowIdx + (r * this.sizeSq) + c
                        const val = this.board[idx]
                        if (val == 0) { return false }
                        seen[val - 1] = true
                    }
                }
                if (!allSeen()) {
                    return false
                }
                clearSeen()
            }
        }

        return true
    }

    _get_idx(row: number, col: number): number {
        const idx = (row * this.sizeSq) + col
        if (idx >= this.board.length) {
            throw new Error(`Invalid row and col combination: ${row}, ${col}.`)
        }
        return idx
    }
}


const sudoku = new Sudoku(3)
let currentSudokuCellId = ""


function sudokuCellIdToRowAndCol(cellId: string): [number, number] {
    if (cellId == "") {
        throw new Error("currentSudokuCellId not set")
    }
    const num = parseInt(cellId.split("-")[2])
    return [Math.floor(num / sudoku.sizeSq), num % sudoku.sizeSq]
}

function getSudokuCell(cellId: string): HTMLDivElement {
    const el = document.getElementById(cellId)
    if (el == null) {
        throw new Error("Could not find document with id: '" + cellId + "'.")
    }
    if (!(el instanceof HTMLDivElement)) {
        throw new Error("Expected cell element to be of type 'HTMLTextAreaElement'.")
    }
    return el
}

function getSudokuCellAt(row: number, col: number): HTMLDivElement {
    const cellId = "sudoku-cell-" + ((row * sudoku.sizeSq) + col)
    return getSudokuCell(cellId)
}

function highlightSudokuCell(cellId: string): void {
    if (currentSudokuCellId != "") {
        const cell = getSudokuCell(currentSudokuCellId)
        cell.classList.remove("sudoku-cell-cursor", "sudoku-cell-cursor-frozen")
        const [row, col] = sudokuCellIdToRowAndCol(cell.id)
        if (sudoku.isCellFrozen(row, col)) {
            cell.classList.add("sudoku-cell-frozen")
        }
    }
    const cell = getSudokuCell(cellId)
    const [row, col] = sudokuCellIdToRowAndCol(cell.id)
    if (sudoku.isCellFrozen(row, col)) {
        cell.classList.remove("sudoku-cell-frozen")
        cell.classList.add("sudoku-cell-cursor-frozen")
    } else {
        cell.classList.add("sudoku-cell-cursor")
    }
    currentSudokuCellId = cellId
}


document.onkeydown = (e: KeyboardEvent) => {
    if (currentSudokuCellId == "") {
        return
    }
    const [row, col] = sudokuCellIdToRowAndCol(currentSudokuCellId)

    if (e.key == "Backspace" || e.key == "Delete") {
        sudoku.clearCell(row, col)
        const cell = getSudokuCell(currentSudokuCellId)
        cell.innerText = ""
    } else if ("0" <= e.key && e.key <= "9") {
        if (!sudoku.isCellFrozen(row, col)) {
            sudoku.setCell(row, col, parseInt(e.key))
            const cell = getSudokuCell(currentSudokuCellId)
            cell.innerText = e.key
        }
        if (sudoku.isDone()) {
            setTimeout(
                function() { alert("you win!") },
                50
            )
        }
    }

};


function onLoad(): void {
    const board = [
        0, 0, 0, 1, 0, 5, 0, 0, 3,
        0, 0, 3, 7, 6, 0, 0, 4, 0,
        2, 0, 0, 0, 8, 0, 0, 7, 1,
        0, 3, 2, 0, 0, 9, 0, 0, 4,
        0, 0, 8, 0, 0, 0, 3, 0, 0,
        9, 0, 0, 5, 0, 0, 2, 8, 0,
        6, 8, 0, 0, 3, 0, 0, 0, 2,
        0, 1, 0, 0, 5, 8, 7, 0, 0,
        7, 0, 0, 9, 1, 6, 0, 0, 0
    ]
    let idx = 0
    for (let r = 0; r < sudoku.sizeSq; ++r) {
        for (let c = 0; c < sudoku.sizeSq; ++c) {
            if (board[idx] != 0) {
                sudoku.setCell(r, c, board[idx])
                sudoku.freezeCell(r, c)
            }
            ++idx
        }
    }

    refreshSudoku()
}


function refreshSudoku(): void {
    currentSudokuCellId = ""
    for (let r = 0; r < sudoku.sizeSq; ++r) {
        for (let c = 0; c < sudoku.sizeSq; ++c) {
            let htmlElem = getSudokuCellAt(r, c)
            htmlElem.innerText = ""
            const cellVal = sudoku.getCell(r, c)
            if (cellVal != 0) {
                htmlElem.innerText = cellVal.toString()
                let cellElem = getSudokuCellAt(r, c)
                if (sudoku.isCellFrozen(r, c)) {
                    cellElem.classList.remove("sudoku-cell-cursor", "sudoku-cell-cursor-frozen")
                    cellElem.classList.add("sudoku-cell-frozen")
                } else {
                    cellElem.classList.remove(
                        "sudoku-cell-cursor", "sudoku-cell-cursor-frozen", "sudoku-cell-frozen"
                    )
                }
            }
        }
    }
}
