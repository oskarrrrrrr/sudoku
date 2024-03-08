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

    toggle(pos: Pos, value: number, quiet: boolean = false): void {
        const idx = this.posToIdx(pos) + value - 1
        this.hints[idx] = !this.hints[idx]
        if (!quiet || this.sudoku.at(pos) == 0) {
            new HintUpdateEvent(pos, this.get(pos)).emit()
        }
    }

    clear(pos: Pos): void {
        const start = this.posToIdx(pos)
        for (let i = 0; i < this.sudoku.values; ++i) {
            this.hints[start + i] = false
        }
        new HintUpdateEvent(pos, this.get(pos)).emit()
    }

    clearAll(): void {
        const hintsCount = this.sudoku.rows * this.sudoku.cols * this.sudoku.values
        for (let row = 0; row < this.sudoku.rows; row++) {
            for (let col = 0; col < this.sudoku.cols; col++) {
                let update = false
                for (let value = 0; value < this.sudoku.values; value++) {
                    const idx = (row * this.sudoku.cols * this.sudoku.values)
                        + (col * this.sudoku.values) + value
                    if (this.hints[idx]) {
                        update = true
                        this.hints[idx] = false
                    }
                }
                new HintUpdateEvent([row, col], this.get([row, col])).emit()
            }
        }
    }

    get(pos: Pos): boolean[] {
        const start = this.posToIdx(pos)
        return this.hints.slice(start, start + this.sudoku.values)
    }
}

class Cursor {
    richSudoku: RichSudoku
    sudoku: Sudoku
    active: boolean
    pos: Pos

    constructor(richSudoku: RichSudoku) {
        this.richSudoku = richSudoku
        this.sudoku = richSudoku.sudoku
        this.active = false
        this.pos = [
            Math.floor(this.sudoku.rows/2),
            Math.floor(this.sudoku.cols/2),
        ]
    }

    activate(): void {
        if (!this.active) {
            new CursorMoveEvent(null, this.pos)
            this.active = true
        }
        this.richSudoku.save()
    }

    deactivate(): void {
        if (this.active) {
            new CursorMoveEvent(this.pos, null)
            this.active = false
        }
        this.richSudoku.save()
    }

    set(pos: Pos): void {
        const oldPos = this.pos
        this.pos = pos
        new CursorMoveEvent(oldPos, this.pos).emit()
        this.active = true
        this.richSudoku.save()
    }

    moveRight(): void {
        const [row, col] = this.pos
        if (col + 1 < this.sudoku.cols) {
            const oldPos = this.pos
            this.pos = [row, col+1]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
        this.richSudoku.save()
    }

    moveLeft(): void {
        const [row, col] = this.pos
        if (col > 0) {
            const oldPos = this.pos
            this.pos = [row, col-1]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
        this.richSudoku.save()
    }

    moveUp() {
        const [row, col] = this.pos
        if (row > 0) {
            const oldPos = this.pos
            this.pos = [row-1, col]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
        this.richSudoku.save()
    }

    moveDown(): void {
        const [row, col] = this.pos
        if (row + 1 < this.sudoku.rows) {
            const oldPos = this.pos
            this.pos = [row+1, col]
            new CursorMoveEvent(oldPos, this.pos).emit()
        }
        this.active = true
        this.richSudoku.save()
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

class Timer {
    accumulator: number
    start: Date | null

    constructor() {
        this.accumulator = 0
        this.start = null
    }

    getDiff(): number {
        if (this.start == null) {
            return 0
        }
        return Date.now() - this.start.getTime()
    }

    pause(): void {
        this.accumulator += this.getDiff()
        this.start = null
    }

    value(): number {
        return this.accumulator + this.getDiff()
    }

    resume(): void {
        if (this.start != null) {
            return
        }
        this.start = new Date()
    }

    toString(): string {
        let diff = this.value()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        diff -= hours * 1000 * 60  * 60
        const minutes = Math.floor(diff / (1000 * 60))
        diff -= minutes * 1000 * 60
        const seconds = Math.floor(diff / 1000)
        let result = ""
        if (hours > 0) {
            result = result + hours.toString() + "hrs "
        }
        if (hours > 0 || minutes > 0) {
            result = result + minutes.toString() + "m "
        }
        result = result + seconds.toString() + "s"
        return result
    }
}


class RichSudoku {
    sudoku: Sudoku
    freezer: Freezer
    cursor: Cursor
    hints: Hints
    timer: Timer

    reloading: number

    constructor(n: number) {
        this.sudoku = new Sudoku(n)
        this.freezer = new Freezer(this.sudoku)
        this.cursor = new Cursor(this)
        this.hints = new Hints(this.sudoku)
        this.timer = new Timer()
        this.reloading = 0
    }

    newGame(sudoku: Sudoku, freeze: boolean) {
        if (sudoku.n != this.sudoku.n) {
            throw new Error("inavlid sudoku size")
        }
        this.reloading++
        this.hints.clearAll()
        this.freezer.thawAll()
        for (let row = 0; row < sudoku.rows; row++) {
            for (let col = 0; col < sudoku.cols; col++) {
                const newValue = sudoku.board[row][col]
                this.setAt([row, col], newValue)
                if (freeze && newValue != 0) {
                    this.freezer.freeze(row, col)
                }
            }
        }
        this.reloading--
        this.timer = new Timer()
        this.timer.resume()
        this.save()
    }

    setAt(pos: [number, number], value: number): void {
        if (!(this.sudoku.isValidValue(value) || value == 0)) {
            return
        }
        if (this.freezer.at(pos)) {
            return
        }
        this.sudoku.setAt(pos, value)
        new ValueSetEvent(pos, value).emit()
        if (value > 0 && this.sudoku.isDone()) {
            new SudokuSolvedEvent().emit()
        }
        this.save()
    }

    set(value: number): void {
        if (!this.cursor.active) {
            return
        }
        this.setAt(this.cursor.pos, value)
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
        this.save()
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
        this.save()
    }

    serialize(): string {
        return JSON.stringify({
            "sudoku": {
                "size": this.sudoku.n,
                "values": this.sudoku.board,
            },
            "hints": this.hints.hints,
            "cursor": {
                "active": this.cursor.active,
                "pos": this.cursor.pos,
            },
            "frozen": this.freezer.frozen,
            "timer": {
                "value": this.timer.value(),
            }
        })
    }

    save(): void {
        if (this.reloading == 0) {
            sessionStorage.setItem("sudoku", this.serialize())
        }
    }

    load(): boolean {
        const cachedSudoku = sessionStorage.getItem("sudoku")
        if (cachedSudoku == null) {
            return false
        }

        this.reloading++

        const obj = JSON.parse(cachedSudoku)
        const size = obj["sudoku"]["size"]
        const board = obj["sudoku"]["values"]
        const sudoku = new Sudoku(size, board)
        this.newGame(sudoku, false)

        // freezer
        const frozen = obj["frozen"]
        for (let row = 0; row < sudoku.rows; row++) {
            for (let col = 0; col < sudoku.cols; col++) {
                if (frozen[row][col]) {
                    this.freezer.freeze(row, col)
                }
            }
        }

        // cursor
        const pos = obj["cursor"]["pos"]
        this.cursor.set(pos)
        const cursorActive = obj["cursor"]["active"]
        if (!cursorActive) {
            this.cursor.deactivate()
        }

        // hints
        const hints = obj["hints"]
        for (let row = 0; row < sudoku.rows; row++) {
            for (let col = 0; col < sudoku.cols; col++) {
                for (let value = 0; value < sudoku.values; value++) {
                    const idx = (row*sudoku.cols*sudoku.values)
                        + (col*sudoku.values) + value
                    if (hints[idx]) {
                        this.hints.toggle([row, col], value+1, true)
                    }
                }
            }
        }

        // timer
        const timerObj = obj["timer"]
        if (timerObj["value"] !== undefined) {
            this.timer.accumulator = timerObj["value"]
        }
        this.timer.start = null
        this.timer.resume()

        this.reloading--
        this.save()
        return true
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
