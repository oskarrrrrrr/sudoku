function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
    }
}

function shuffleDigits(board: readonly number[]): number[][] {
    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    shuffleArray(nums)
    let newBoard: number[][] = []
    for (let row = 0; row < 9; row++) {
        newBoard.push([])
        for (let col = 0; col < 9; col++) {
            const n = (row * 9) + col
            newBoard[row][col] = board[n] == 0 ? 0 : nums[board[n]-1]
        }
    }
    return newBoard
}

function shuffleRowsInBands(board: readonly number[][]): number[][] {
    let newBoard: number[][] = []
    for (let bandNum = 0; bandNum < 3; bandNum++) {
        let rows = [0, 1, 2]
        shuffleArray(rows)
        for (let row = 0; row < 3; row++) {
            newBoard[3*bandNum + row] = board[3*bandNum + rows[row]].slice(0)
        }
    }
    return newBoard
}

function shuffleColsInStacks(board: readonly number[][]): number[][] {
    let newBoard: number[][] = []
    for (let row = 0; row < 9; row++) {
        newBoard.push([])
    }

    for (let stackNum = 0; stackNum < 3; stackNum++) {
        let cols = [0, 1, 2]
        shuffleArray(cols)
        for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 9; row++) {
                newBoard[row].push(board[row][3*stackNum + cols[col]])
            }
        }
    }

    return newBoard
}

function shuffleBands(board: readonly number[][]): number[][] {
    let newBoard: number[][] = []
    let bands = [0, 1, 2]
    shuffleArray(bands)
    for (let band = 0; band < 3; band++) {
        for (let row = 0; row < 3; row++) {
            newBoard.push(board[3*bands[band] + row])
        }
    }
    return newBoard
}

function shuffleStacks(board: readonly number[][]): number[][] {
    let newBoard: number[][] = []
    for (let row = 0; row < 9; row++) {
        newBoard.push([])
    }

    let stacks = [0, 1, 2]
    shuffleArray(stacks)
    for (let stack = 0; stack < 3; stack++) {
        for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 9; row++) {
                newBoard[row].push(board[row][3*stacks[stack] + col])
            }
        }
    }

    return newBoard
}

function transpose(board: readonly number[][]): number[][] {
    let newBoard: number[][] = []
    for (let row = 0; row < 9; row++) {
        newBoard.push([])
    }

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            newBoard[row].push(board[col][row])
        }
    }

    return newBoard
}

export function randomSudokuVariation(board: readonly number[]): number[] {
    let newBoard = shuffleDigits(board)
    newBoard = shuffleRowsInBands(newBoard)
    newBoard = shuffleBands(newBoard)
    newBoard = shuffleColsInStacks(newBoard)
    newBoard = shuffleStacks(newBoard)
    if (Math.floor(Math.random()) == 1) {
        newBoard = transpose(newBoard)
    }

    let result: number[] = []
    for (const row of newBoard) {
        for (const v of row) {
            result.push(v)
        }
    }
    return result
}
