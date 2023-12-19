class Sudoku {
    readonly n: number
    board: number[][]

    constructor(n: number, board?: number[][]) {
        this.n = n
        this.board = []
        if (board !== undefined) {
            if (board.length != n*n) {
                throw new Error("invalid board dimensions")
            }
            for (let row = 0; row < n*n; row++) {
                if (board[row].length != n*n) {
                    throw new Error("invalid board dimensions")
                }
                this.board.push(board[row].slice(0))
            }
        } else {
            for (let row = 0; row < n*n; row++) {
                this.board.push([])
                for (let col = 0; col < n*n; col++) {
                    this.board[row].push(0)
                }
            }
        }
    }

    get rows(): number {
        return this.board.length
    }

    get cols(): number {
        return this.board.length
    }

    get values(): number {
        return this.board.length
    }

    get minValue(): number {
        return 1
    }

    get maxValue(): number {
        return this.values
    }

    isValidValue(n: number): boolean {
        return n >= 1 && n <= this.values
    }

    at(pos: [number, number]): number {
        const [row, col] = pos
        return this.board[row][col]
    }

    setAt(pos: [number, number], value: number): void {
        const [row, col] = pos
        this.board[row][col] = value
    }


    isDone(): boolean {
        let seen: boolean[] = new Array(this.n * this.n)

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

        // rows
        for (const row of this.board) {
            clearSeen()
            for (const v of row) {
                if (v == 0) {
                    return false
                }
                seen[v-1] = true
            }
            if (!allSeen()) {
                return false
            }
        }

        // cols
        for (let col = 0; col < this.cols; col++) {
            clearSeen()
            for (const row of this.board) {
                if (row[col] == 0) {
                    return false
                }
                seen[row[col]-1] = true
            }
            if (!allSeen()) {
                return false
            }
        }

        // squares
        for (let topRow = 0; topRow < this.rows; topRow += this.n) {
            for (let leftCol = 0; leftCol < this.cols; leftCol += this.n) {
                clearSeen()
                for (let row = topRow; row < topRow + this.n; row++) {
                    for (let col = leftCol; col < leftCol + this.n; col++) {
                        if (this.board[row][col] == 0) {
                            return false
                        }
                        seen[this.board[row][col]-1] = true
                    }
                }
                if (!allSeen()) {
                    return false
                }
            }
        }

        return true
    }

    clearAll(): [number, number][] {
        let cleared: [number, number][] = []
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] != 0) {
                    this.board[row][col] = 0
                    cleared.push([row, col])
                }
            }
        }
        return cleared
    }
}

function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
    }
}

function shuffleDigits(sudoku: Sudoku): void {
    let nums = []
    for (let v = sudoku.minValue; v <= sudoku.maxValue; v++) {
        nums.push(v)
    }
    shuffleArray(nums)
    for (let row = 0; row < sudoku.rows; row++) {
        for (let col = 0; col < sudoku.cols; col++) {
            const curr = sudoku.board[row][col]
            sudoku.board[row][col] = (curr == 0) ? 0 : nums[curr-1]
        }
    }
}

function shuffleRowsInBands(sudoku: Sudoku): void {
    for (let band = 0; band < sudoku.n; band++) {
        let perm = []
        let rows = []
        for (let row = 0; row < sudoku.n; row++) {
            perm.push(row)
            rows.push(sudoku.board[(sudoku.n*band)+row])
        }
        shuffleArray(perm)

        for (let row = 0; row < sudoku.n; row++) {
            sudoku.board[(sudoku.n*band)+row] = rows[perm[row]]
        }
    }
}

function shuffleBands(sudoku: Sudoku): void {
    let rows = []
    for (const row of sudoku.board) {
        rows.push(row)
    }

    let perm = []
    for (let band = 0; band < sudoku.n; band++) {
        perm.push(band)
    }
    shuffleArray(perm)

    for (let band = 0; band < sudoku.n; band++) {
        for (let row = 0; row < sudoku.n; row++) {
            sudoku.board[(band*sudoku.n)+row] = rows[(perm[band]*sudoku.n)+row]
        }
    }
}

function shuffleColsInStacks(sudoku: Sudoku): void {
    for (let stack = 0; stack < sudoku.n; stack++) {
        let perm = []
        let cols: number[][] = []
        for (let col = 0; col < sudoku.n; col++) {
            perm.push(col)
            cols.push([])
            for (const row of sudoku.board) {
                cols[col].push(row[(sudoku.n*stack)+col])
            }
        }
        shuffleArray(perm)
        for (let col = 0; col < sudoku.n; col++) {
            for (let row = 0; row < sudoku.rows; row++) {
                sudoku.board[row][(sudoku.n*stack)+col] = cols[perm[col]][row]
            }
        }
    }
}

function shuffleStacks(sudoku: Sudoku): void {
    let cols: number[][] = []
    for (let col = 0; col < sudoku.cols; col++) {
        cols.push([])
        for (const row of sudoku.board) {
            cols[col].push(row[col])
        }
    }

    let perm = []
    for (let stack = 0; stack < sudoku.n; stack++) {
        perm.push(stack)
    }
    shuffleArray(perm)

    for (let stack = 0; stack < sudoku.n; stack++) {
        for (let col = 0; col < sudoku.n; col++) {
            for (let row = 0; row < sudoku.rows; row++) {
                sudoku.board[row][(sudoku.n*stack)+col] =
                    cols[(sudoku.n*perm[stack])+col][row]
            }
        }
    }
}

function transpose(sudoku: Sudoku): void {
    for (let row = 0; row < sudoku.rows; row++) {
        for (let col = row + 1; col < sudoku.cols; col++) {
            [sudoku.board[row][col], sudoku.board[col][row]] = [
                sudoku.board[col][row],
                sudoku.board[row][col]
            ]
        }
    }
}

function shuffleSudoku(sudoku: Sudoku): void {
    shuffleDigits(sudoku)
    shuffleRowsInBands(sudoku)
    shuffleBands(sudoku)
    shuffleColsInStacks(sudoku)
    shuffleStacks(sudoku)
    if (Math.round(Math.random()) == 1) {
        transpose(sudoku)
    }
}

export { Sudoku, shuffleSudoku }
