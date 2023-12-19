import { Sudoku } from "./sudoku.js"

type Pos = [number, number]

class CursorMoveEvent {
    from_pos: Pos | null
    to_pos: Pos | null

    constructor(from_pos: Pos | null, to_pos: Pos | null) {
        this.from_pos = from_pos
        this.to_pos = to_pos
    }

    emit(): void {
        emitSudokuEvent("CursorMoveEvent", this)
    }

    static listen(cb: (event: CursorMoveEvent) => void): void {
        listenToSudokuEvent("CursorMoveEvent", cb)
    }
}

class ValueSetEvent {
    pos: Pos
    value: number

    constructor(pos: Pos, value: number) {
        this.pos = pos
        this.value = value
    }

    emit(): void {
        emitSudokuEvent("ValueSetEvent", this)
    }

    static listen(cb: (event: ValueSetEvent) => void): void {
        listenToSudokuEvent("ValueSetEvent", cb)
    }
}

class HintUpdateEvent {
    pos: Pos
    hints: boolean[]

    constructor(pos: Pos, hints: boolean[]) {
        this.pos = pos
        this.hints = hints
    }

    emit(): void {
        emitSudokuEvent("HintUpdateEvent", this)
    }

    static listen(cb: (event: HintUpdateEvent) => void): void {
        listenToSudokuEvent("HintUpdateEvent", cb)
    }
}

class FreezeEvent {
    pos: Pos
    frozen: boolean

    constructor(pos: Pos, frozen: boolean) {
        this.pos = pos
        this.frozen = frozen
    }

    emit(): void {
        emitSudokuEvent("FreezeEvent", this)
    }

    static listen(cb: (event: FreezeEvent) => void): void {
        listenToSudokuEvent("FreezeEvent", cb)
    }
}

class SudokuSolvedEvent {
    emit(): void {
        emitSudokuEvent("SudokuSolvedEvent", this)
    }

    static listen(cb: (event: SudokuSolvedEvent) => void): void {
        listenToSudokuEvent("SudokuSolvedEvent", cb)
    }
}

type SudokuEventName =
    "CursorMoveEvent"
    | "ValueSetEvent"
    | "HintUpdateEvent"
    | "FreezeEvent"
    | "SudokuSolvedEvent"


type SudokuEvent =
    CursorMoveEvent
    | ValueSetEvent
    | HintUpdateEvent
    | FreezeEvent
    | SudokuSolvedEvent


function emitSudokuEvent<SudokuEventT extends SudokuEvent>(
    name: SudokuEventName,
    event: SudokuEventT
): void {
    const _event = new CustomEvent(name, {detail: event})
    document.dispatchEvent(_event)
}

function listenToSudokuEvent<SudokuEventT extends SudokuEvent>(
    name: SudokuEventName,
    cb: (event: SudokuEventT) => void
): void {
    document.addEventListener(
        name,
        (event: Event) => {
            if (!(event instanceof CustomEvent)) {
                throw new Error(`Expected CustomEvent.`)
            }
            cb(event.detail)
        },
    )
}

class Hints {
    sudoku: Sudoku
    hints: boolean[]

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.hints = []
        const hintsCount = this.sudoku.rows * this.sudoku.cols * this.sudoku.values
        for (let i = 0; i < hintsCount; ++i) {
            this.hints.push(false)
        }
    }

    private posToIdx(pos: Pos): number {
        const [row, col] = pos
        return ((row * this.sudoku.cols) + col) * this.sudoku.values
    }

    toggle(pos: Pos, value: number): void {
        const idx = this.posToIdx(pos) + value - 1
        this.hints[idx] = !this.hints[idx]
        new HintUpdateEvent(pos, this.get(pos)).emit()
    }

    clear(pos: Pos): void {
        const start = this.posToIdx(pos)
        for (let i = 0; i < this.sudoku.values; ++i) {
            this.hints[start + i] = false
        }
        new HintUpdateEvent(pos, this.get(pos)).emit()
    }

    get(pos: Pos): boolean[] {
        const start = this.posToIdx(pos)
        return this.hints.slice(start, start + this.sudoku.values)
    }
}

class Cursor {
    sudoku: Sudoku
    active: boolean
    pos: Pos

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.active = false
        this.pos = [
            Math.floor(sudoku.rows/2),
            Math.floor(sudoku.cols/2),
        ]
    }

    activate(): void {
        if (!this.active) {
            new CursorMoveEvent(null, this.pos)
            this.active = true
        }
    }

    deactivate(): void {
        if (this.active) {
            new CursorMoveEvent(this.pos, null)
            this.active = false
        }
    }

    set(pos: Pos): void {
        const oldPos = this.pos
        this.pos = pos
        new CursorMoveEvent(oldPos, this.pos).emit()
        this.active = true
    }

    moveRight(): void {
        const [row, col] = this.pos
        if (col + 1 < this.sudoku.cols) {
            const oldPos = this.pos
            this.pos = [row, col+1]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
    }

    moveLeft(): void {
        const [row, col] = this.pos
        if (col > 0) {
            const oldPos = this.pos
            this.pos = [row, col-1]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
    }

    moveUp() {
        const [row, col] = this.pos
        if (row > 0) {
            const oldPos = this.pos
            this.pos = [row-1, col]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
    }

    moveDown(): void {
        const [row, col] = this.pos
        if (row + 1 < this.sudoku.rows) {
            const oldPos = this.pos
            this.pos = [row+1, col]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
    }
}

class Freezer {
    sudoku: Sudoku
    frozen: boolean[][]

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.frozen = []
        for (let row = 0; row < sudoku.rows; row++) {
            this.frozen.push([])
            for (let col = 0; col < sudoku.cols; col++) {
                this.frozen[row].push(false)
            }
        }
    }

    at(pos: Pos): boolean {
        const [row, col] = pos
        return this.frozen[row][col]
    }

    freeze(row: number, col: number): void {
        if (this.sudoku.board[row][col] == 0) {
            throw new Error(`Can't freeze an empty cell at pos: (${row}, ${col})`)
        }
        if (!this.frozen[row][col]) {
            this.frozen[row][col] = true
            new FreezeEvent([row, col], true).emit()
        }
    }

    thaw(row: number, col: number): void {
        if (this.frozen[row][col]) {
            this.frozen[row][col] = false
            new FreezeEvent([row, col], false).emit()
        }
    }

    thawAll(): void {
        for (let row = 0; row < this.sudoku.rows; row++) {
            for (let col = 0; col < this.sudoku.cols; col++) {
                this.thaw(row, col)
            }
        }
    }
}

class RichSudoku {
    sudoku: Sudoku
    freezer: Freezer
    cursor: Cursor
    hints: Hints

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        for (let row = 0; row < sudoku.rows; row++) {
            for (let col = 0; col < sudoku.cols; col++) {
                const curr = sudoku.board[row][col]
                if (curr != 0) {
                    new ValueSetEvent([row, col], curr).emit()
                    new FreezeEvent([row, col], true).emit()
                }
            }
        }

        this.freezer = new Freezer(sudoku)
        this.cursor = new Cursor(sudoku)
        this.hints = new Hints(sudoku)
    }

    set(value: number): void {
        if (!(this.sudoku.isValidValue(value) || value == 0)) {
            return
        }
        const pos = this.cursor.pos
        if (!this.cursor.active || this.freezer.at(pos)) {
            return
        }
        this.sudoku.setAt(pos, value)
        new ValueSetEvent(pos, value).emit()
        if (value > 0 && this.sudoku.isDone()) {
            new SudokuSolvedEvent().emit()
        }
    }

    clear(): void {
        const pos = this.cursor.pos
        if (!this.cursor.active || this.freezer.at(pos))  {
            return
        }
        if (this.sudoku.at(pos) !== 0) {
            this.set(0)
            new HintUpdateEvent(pos, this.hints.get(pos)).emit()
        } else {
            this.hints.clear(pos)
        }
    }

    toggleHint(value: number) {
        if (!(this.sudoku.isValidValue(value) || value == 0)) {
            return
        }
        const pos = this.cursor.pos
        if (!this.cursor.active || this.freezer.at(pos))  {
            return
        }
        if (this.sudoku.at(pos) !== 0) {
            this.set(0)
        }
        this.hints.toggle(pos, value)
    }
}

export {
    RichSudoku,
    Freezer,
    Cursor,
    Hints,
    CursorMoveEvent,
    ValueSetEvent,
    HintUpdateEvent,
    FreezeEvent,
    SudokuSolvedEvent,
}
