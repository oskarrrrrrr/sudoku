class Sudoku {
    board: number[]
    readonly rows: number
    readonly cols: number
    is_frozen: boolean[]

    constructor() {
        this.rows = 9
        this.cols = 9
        this.board = []
        this.is_frozen = []
        for (let r = 0; r < this.rows; ++r) {
            for (let c = 0; c < this.cols; ++c) {
                this.board.push(0)
                this.is_frozen.push(false)
            }
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
        if (9 < val || val < 1) {
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
        console.log("checking if done")

        let seen: boolean[] = new Array(9)

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
        for (let rowStartIdx = 0; rowStartIdx < this.board.length; rowStartIdx += 9) {
            for (let i = 0; i < this.cols; ++i) {
                const val = this.board[rowStartIdx + i]
                if (val == 0) { return false }
                seen[val - 1] = true
            }
            if (!allSeen()) {
                return false
            }
            clearSeen()
        }


        // cols
        for (let colStartIdx = 0; colStartIdx < this.cols; ++colStartIdx) {
            for (let i = 0; i < this.rows; ++i) {
                const val = this.board[colStartIdx + (9 * i)]
                if (val == 0) { return false }
                seen[val - 1] = true
            }
            if (!allSeen()) {
                return false
            }
            clearSeen()
        }

        // squares
        for (let sqRowIdx = 0; sqRowIdx < this.board.length; sqRowIdx += 27) {
            for (let sqInRowIdx = 0; sqInRowIdx < this.cols; sqInRowIdx += 3) {
                console.log(sqRowIdx, sqInRowIdx)
                for (let r = 0; r < 3; ++r) {
                    for (let c = 0; c < 3; ++c) {
                        const idx = sqRowIdx + sqInRowIdx + (r * this.cols) + c
                        console.log(idx)
                        const val = this.board[idx]
                        if (val == 0) { return false }
                        seen[val - 1] = true
                    }
                }
                console.log(seen)
                if (!allSeen()) {
                    return false
                }
                clearSeen()
            }
        }

        return true
    }

    _get_idx(row: number, col: number): number {
        const idx = (row * this.cols) + col
        if (idx >= this.board.length) {
            throw new Error(`Invalid row and col combination: ${row}, ${col}.`)
        }
        return idx
    }
}


const sudoku = new Sudoku()


function onLoad(): void {
    const board = [
        0, 0, 0, 1, 9, 5, 0, 0, 3,
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
    for (let r = 0; r < sudoku.rows; ++r) {
        for (let c = 0; c < sudoku.cols; ++c) {
            if (board[idx] != 0) {
                sudoku.setCell(r, c, board[idx])
                sudoku.freezeCell(r, c)
            }
            ++idx
        }
    }

    refreshSudoku()
}


function getSudokuCellText(row: number, col: number): HTMLTextAreaElement {
    const cellId = `c.${row}.${col}`
    const el = document.getElementById(cellId)
    if (el == null) {
        throw new Error("Could not find document with id: '" + cellId + "'.")
    }
    if (!(el instanceof HTMLTextAreaElement)) {
        throw new Error("Expected cell element to be of type 'HTMLTextAreaElement'.")
    }
    return el
}

function getSudokuCell(row: number, col: number): HTMLTableCellElement {
    const cellId = `sudoku_td.${row}.${col}`
    const el = document.getElementById(cellId)
    if (el == null) {
        throw new Error("Could not find document with id: '" + cellId + "'.")
    }
    if (!(el instanceof HTMLTableCellElement)) {
        throw new Error("Expected cell element to be of type 'HTMLTableElement'.")
    }
    return el
}


function refreshSudoku(): void {
    for (let r = 0; r < sudoku.rows; ++r) {
        for (let c = 0; c < sudoku.cols; ++c) {
            let htmlElem = getSudokuCellText(r, c)
            htmlElem.disabled = false
            const cellVal = sudoku.getCell(r, c)
            if (cellVal != 0) {
                htmlElem.value = cellVal.toString()
                let cellElem = getSudokuCell(r, c)
                if (sudoku.isCellFrozen(r, c)) {
                    htmlElem.disabled = true
                    cellElem.style.background = "#dddddd"
                } else {
                    cellElem.style.background = "#ffffff"
                }
            }
        }
    }
}


function onInput(textarea: HTMLTextAreaElement): void {
    const elId = textarea.id
    const [_, rowStr, colStr] = elId.split(".")
    const [row, col] = [parseInt(rowStr), parseInt(colStr)]

    if (sudoku.isCellFrozen(row, col)) {
        const val = sudoku.getCell(row, col)
        console.assert(val != 0)
        textarea.value = val.toString()
        return
    }

    const val = textarea.value
    if (!('1' <= val && val <= '9')) {
        textarea.value = ""
        return
    }
    if (val == "") {
        sudoku.clearCell(row, col)
    } else {
        sudoku.setCell(row, col, parseInt(val))
    }

    setTimeout(
        function() {
            if (sudoku.isDone()) {
                alert("you win!")
                const activeElement = document.activeElement;
                if (activeElement != null) {
                    // @ts-ignore
                    activeElement.blur()
                }
            }
        },
        50
    )
}
