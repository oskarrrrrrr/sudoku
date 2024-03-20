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
    previouslyDone: boolean

    constructor(previouslyDone: boolean) {
        this.previouslyDone = previouslyDone
    }

    emit(): void {
        emitSudokuEvent("SudokuSolvedEvent", this)
    }

    static listen(cb: (event: SudokuSolvedEvent) => void): void {
        listenToSudokuEvent("SudokuSolvedEvent", cb)
    }
}

class SudokuGameLoadEvent {
    emit(): void {
        emitSudokuEvent("SudokuGameLoadEvent", this)
    }

    static listen(cb: (event: SudokuGameLoadEvent) => void): void {
        listenToSudokuEvent("SudokuGameLoadEvent", cb)
    }
}

class ConflictMarkEvent {
    // list of positions and conflict indicators;
    // true - conflict, false - no conflict
    changes: [Pos, boolean][]

    constructor(changes: [Pos, boolean][]) {
        this.changes = changes
    }

    emit(): void {
        emitSudokuEvent("ConflictMarkEvent", this)
    }

    static listen(cb: (event: ConflictMarkEvent) => void): void {
        listenToSudokuEvent("ConflictMarkEvent", cb)
    }
}

class SudokuHighlightEvent {
    // list of positions and new state
    // true - to be highlighted, false - higlighting to be removed
    changes: [Pos, boolean][]

    constructor(changes: [Pos, boolean][]) {
        this.changes = changes
    }

    emit(): void {
        emitSudokuEvent("SudokuHighlightEvent", this)
    }

    static listen(cb: (event: SudokuHighlightEvent) => void): void {
        listenToSudokuEvent("SudokuHighlightEvent", cb)
    }
}

type SudokuEventName =
    "CursorMoveEvent"
    | "ValueSetEvent"
    | "HintUpdateEvent"
    | "FreezeEvent"
    | "SudokuSolvedEvent"
    | "SudokuGameLoadEvent"
    | "ConflictMarkEvent"
    | "SudokuHighlightEvent"


type SudokuEvent =
    CursorMoveEvent
    | ValueSetEvent
    | HintUpdateEvent
    | FreezeEvent
    | SudokuSolvedEvent
    | SudokuGameLoadEvent
    | ConflictMarkEvent
    | SudokuHighlightEvent


function emitSudokuEvent<SudokuEventT extends SudokuEvent>(
    name: SudokuEventName,
    event: SudokuEventT
): void {
    const _event = new CustomEvent(name, { detail: event })
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

function getSquareNumber(pos: Pos, n: number): number {
    const [row, col] = pos;
    return n * Math.floor(row / n) + Math.floor(col / n)
}

function posEq(p1: Pos, p2: Pos): boolean {
    return p1[0] == p2[0] && p1[1] == p2[1]
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
            Math.floor(this.sudoku.rows / 2),
            Math.floor(this.sudoku.cols / 2),
        ]
    }

    activate(): void {
        if (!this.active) {
            new CursorMoveEvent(null, this.pos).emit()
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

    moveByVec(dx: number, dy: number): void {
        if (dx != 0 && dy != 0) {
            throw new Error(
                `only vertical and horizontal vectors supported, got: (${dx}, ${dy})`
            )
        }

        const [row, col] = this.pos
        if (
            (dx < 0 && col + dx < 0)
            || (dx > 0 && col + dx >= this.sudoku.cols)
            || (dy < 0 && row + dy < 0)
            || (dy > 0 && row + dy >= this.sudoku.rows)
        ){
            return
        }

        const oldPos = this.pos
        this.pos = [row+dy, col+dx]
        new CursorMoveEvent(oldPos, this.pos).emit()
        this.active = true
        this.richSudoku.save()
    }

    moveRight(): void {
        this.moveByVec(1, 0)
    }

    moveSquareRight(): void {
        this.moveByVec(this.sudoku.n, 0)
    }

    moveLeft(): void {
        this.moveByVec(-1, 0)
    }

    moveSquareLeft(): void {
        this.moveByVec(-this.sudoku.n, 0)
    }

    moveUp() {
        this.moveByVec(0, -1)
    }

    moveSquareUp(): void {
        this.moveByVec(0, -this.sudoku.n)
    }

    moveDown(): void {
        this.moveByVec(0, 1)
    }

    moveSquareDown(): void {
        this.moveByVec(0, this.sudoku.n)
    }
}

class RegionHighlighter {
    sudoku: Sudoku
    row: number | null
    col: number | null
    enabled: boolean
    highlightSquares: boolean

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.row = null
        this.col = null
        this.enabled = true
        this.highlightSquares = false
        CursorMoveEvent.listen((e: CursorMoveEvent) => {
            if (this.enabled) {
                this.update(e.to_pos)
            }
        })
    }

    get square(): number | null {
        if (this.row == null || this.col == null) {
            return null
        }
        return getSquareNumber([this.row, this.col], this.sudoku.n)
    }

    enable(pos: [number, number]): void {
        this.enabled = true
        this.update(pos)
    }

    disable(): void {
        this.enabled = false
        this.update(null)
    }

    update(newPos: [number, number] | null): void {
        type Pos = [number, number]

        function arrIncludes(arr: Pos[], pos: Pos): boolean {
            for (let i = 0; i < arr.length; i++) {
                if (posEq(pos, arr[i])) {
                    return true
                }
            }
            return false
        }

        function arrAdder(arr: [number, number][]): (pos: [number, number]) => void {
            return (pos: [number, number]): void => {
                if (!arrIncludes(arr, pos)) {
                    arr.push(pos)
                }
            }
        }

        let toRemove: [number, number][] = []
        const addToRemove = arrAdder(toRemove)
        if (this.row != null && this.col != null) {
            this.sudoku.getPosInRow(this.row).forEach(addToRemove)
            this.sudoku.getPosInCol(this.col).forEach(addToRemove)
            if (this.highlightSquares) {
                const square = this.square
                if (square == null) {
                    throw new Error("Expected square to be not null")
                }
                this.sudoku.getPosInSquare(square).forEach(addToRemove)
            }
        }

        let toAdd: [number, number][] = []
        const addToAdd = arrAdder(toAdd)
        if (newPos != null) {
            const [row, col] = newPos
            this.sudoku.getPosInRow(row).forEach(addToAdd)
            this.sudoku.getPosInCol(col).forEach(addToAdd)
            if (this.highlightSquares) {
                const square = getSquareNumber([row, col], this.sudoku.n)
                this.sudoku.getPosInSquare(square).forEach(addToAdd)
            }
        }

        let changes: [[number, number], boolean][] = []
        for (const rem of toRemove) {
            if (!arrIncludes(toAdd, rem)) {
                changes.push([rem, false])
            }
        }
        if (newPos != null) {
            changes.push([newPos, false])
        }
        for (const new_ of toAdd) {
            if (
                !arrIncludes(toRemove, new_)
                || (
                    this.row != null && this.col != null
                    && posEq(new_, [this.row, this.col])
                )
            ) {
                if (newPos == null || !posEq(newPos, new_)) {
                    changes.push([new_, true])
                }
            }
        }
        new SudokuHighlightEvent(changes).emit();

        [this.row, this.col] = newPos != null ? newPos : [null, null]
    }
}

class NumberHighlighter {
    sudoku: Sudoku
    curr: number | null
    cells: [number, number][]
    enabled: boolean

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.curr = null
        this.cells = []
        this.enabled = false
        CursorMoveEvent.listen((e: CursorMoveEvent) => {
            if (this.enabled && e.to_pos != null) {
                this.update(e.to_pos)
            }
        })
        ValueSetEvent.listen((e: ValueSetEvent) => {
            if (this.enabled) {
                this.update(e.pos)
            }
        })
    }

    private findNumberCells(num: number): [number, number][] {
        let positions: [number, number][] = []
        for (let row = 0; row < this.sudoku.rows; row++) {
            for (let col = 0; col < this.sudoku.cols; col++) {
                const pos: [number, number] = [row, col]
                if (this.sudoku.at(pos) == num) {
                    positions.push(pos)
                }
            }
        }
        return positions
    }

    enable(pos: [number, number]) {
        this.enabled = true
        this.update(pos)
    }

    disable() {
        this.enabled = false
        this.update(null)
    }

    update(cursorPos: [number, number] | null) {
        let newNum = null
        if (cursorPos != null) {
            const v = this.sudoku.at(cursorPos)
            newNum = v == 0 ? null : v
        }

        let changes: [[number, number], boolean][] = []

        if (this.curr != null && newNum != null && this.curr == newNum) {
            for (let pos of this.cells) {
                if (!posEq(pos, cursorPos!)) {
                    changes.push([pos, true])
                }
            }
            changes.push([cursorPos!, false])
            new SudokuHighlightEvent(changes).emit()
            return
        }

        if (this.curr != null) {
            for (let pos of this.cells) {
                changes.push([pos, false])
            }
        }

        let newCells = null
        if (newNum != null) {
            newCells = this.findNumberCells(newNum)
            for (let pos of newCells) {
                if (!posEq(pos, cursorPos!)) {
                    changes.push([pos, true])
                }
            }
        }

        new SudokuHighlightEvent(changes).emit()

        if (newNum == null) {
            this.curr = null
            this.cells = []
        } else {
            this.curr = newNum
            console.assert(newCells != null, "newCells should be not null")
            this.cells = newCells!
        }
    }
}

class Freezer {
    sudoku: Sudoku
    frozen: boolean[][]
    frozenCount: number

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.frozen = []
        for (let row = 0; row < sudoku.rows; row++) {
            this.frozen.push([])
            for (let col = 0; col < sudoku.cols; col++) {
                this.frozen[row].push(false)
            }
        }
        this.frozenCount = 0
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
            this.frozenCount++
            new FreezeEvent([row, col], true).emit()
        }
    }

    thaw(row: number, col: number): void {
        if (this.frozen[row][col]) {
            this.frozen[row][col] = false
            this.frozenCount--
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

type TimerState = "running" | "paused"

class Timer {
    accumulator: number
    start: Date | null

    constructor() {
        this.accumulator = 0
        this.start = null
    }

    status(): TimerState {
        if (this.start == null) {
            return "paused"
        }
        return "running"
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
        diff -= hours * 1000 * 60 * 60
        const minutes = Math.floor(diff / (1000 * 60))
        diff -= minutes * 1000 * 60
        const seconds = Math.floor(diff / 1000)
        let result = ""
        if (hours > 0) {
            result = result + hours.toString() + "h "
        }
        if (hours > 0 || minutes > 0) {
            result = result + minutes.toString() + "m "
        }
        result = result + seconds.toString() + "s"
        return result
    }
}

class ConflictsTracker {
    sudoku: Sudoku
    rowCounters: number[][]
    colCounters: number[][]
    boxCounters: number[][]

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.rowCounters = this.newCountersArr()
        this.colCounters = this.newCountersArr()
        this.boxCounters = this.newCountersArr()
    }

    at(pos: Pos): boolean {
        const [row, col] = pos
        const boxNum = getSquareNumber(pos, this.sudoku.n)
        const val = this.sudoku.at(pos)
        return (
            this.rowCounters[row][val] > 1
            || this.colCounters[col][val] > 1
            || this.boxCounters[boxNum][val] > 1
        )
    }

    newCountersArr(): number[][] {
        let arr = []
        for (let i = 0; i < this.sudoku.rows; i++) {
            let subArr = Array(this.sudoku.values + 1).fill(0)
            arr.push(subArr)
        }
        return arr
    }

    findValuesInRow(row: number, value: number): Pos[] {
        const result = []
        for (let col = 0; col < this.sudoku.cols; col++) {
            const pos: Pos = [row, col]
            if (this.sudoku.at(pos) == value) {
                result.push(pos)
            }
        }
        return result
    }

    findValuesInCol(col: number, value: number): Pos[] {
        const result = []
        for (let row = 0; row < this.sudoku.rows; row++) {
            const pos: Pos = [row, col]
            if (this.sudoku.at(pos) == value) {
                result.push(pos)
            }
        }
        return result
    }

    findValuesInBox(box: number, value: number): Pos[] {
        let result = []
        const startRow = Math.floor(box / 3) * 3
        const startCol = (box % 3) * 3
        for (let row = startRow; row < startRow + this.sudoku.n; row++) {
            for (let col = startCol; col < startCol + this.sudoku.n; col++) {
                const pos: Pos = [row, col]
                if (this.sudoku.at(pos) == value) {
                    result.push(pos)
                }
            }
        }
        return result;
    }

    recordChange(pos: Pos, prevValue: number): void {
        const curr = this.sudoku.at(pos)
        if (curr == prevValue) {
            return
        }

        const [row, col] = pos
        const boxNum = getSquareNumber(pos, this.sudoku.n)

        let changes: [Pos, boolean][] = []
        function addChanges(positions: Pos[], conflict: boolean): void {
            for (let i = 0; i < positions.length; i++) {
                changes.push([positions[i], conflict])
            }
        }

        if (prevValue != 0) {
            if (this.rowCounters[row][prevValue] == 2) {
                addChanges(this.findValuesInRow(row, prevValue), false)
            }
            this.rowCounters[row][prevValue]--

            if (this.colCounters[col][prevValue] == 2) {
                addChanges(this.findValuesInCol(col, prevValue), false)
            }
            this.colCounters[col][prevValue]--

            if (this.boxCounters[boxNum][prevValue] == 2) {
                addChanges(this.findValuesInBox(boxNum, prevValue), false)
            }
            this.boxCounters[boxNum][prevValue]--
        }

        if (curr != 0) {
            if (this.rowCounters[row][curr] == 1) {
                addChanges(this.findValuesInRow(row, curr), true)
            }
            this.rowCounters[row][curr]++

            if (this.colCounters[col][curr] == 1) {
                addChanges(this.findValuesInCol(col, curr), true)
            }
            this.colCounters[col][curr]++

            if (this.boxCounters[boxNum][curr] == 1) {
                addChanges(this.findValuesInBox(boxNum, curr), true)
            }
            this.boxCounters[boxNum][curr]++
        }

        new ConflictMarkEvent(changes).emit()
    }
}

class RichSudoku {
    sudoku: Sudoku
    freezer: Freezer
    cursor: Cursor
    hints: Hints
    timer: Timer
    difficulty: string
    conflicts: ConflictsTracker
    previouslyDone: boolean
    regionHighlighter: RegionHighlighter
    numberHighlighter: NumberHighlighter

    reloading: number

    constructor(n: number) {
        this.sudoku = new Sudoku(n)
        this.freezer = new Freezer(this.sudoku)
        this.cursor = new Cursor(this)
        this.hints = new Hints(this.sudoku)
        this.timer = new Timer()
        this.difficulty = ""
        this.conflicts = new ConflictsTracker(this.sudoku)
        this.regionHighlighter = new RegionHighlighter(this.sudoku)
        this.numberHighlighter = new NumberHighlighter(this.sudoku)
        this.previouslyDone = false
        this.reloading = 0
    }

    newGame(sudoku: Sudoku, freeze: boolean, difficulty: string, previouslyDone: boolean) {
        if (sudoku.n != this.sudoku.n) {
            throw new Error("inavlid sudoku size")
        }
        this.reloading++
        this.hints.clearAll()
        this.freezer.thawAll()
        this.previouslyDone = previouslyDone
        for (let row = 0; row < sudoku.rows; row++) {
            for (let col = 0; col < sudoku.cols; col++) {
                const newValue = sudoku.board[row][col]
                this.setAt([row, col], newValue)
                if (freeze && newValue != 0) {
                    this.freezer.freeze(row, col)
                }
            }
        }
        this.timer = new Timer()
        this.timer.resume()
        this.difficulty = difficulty
        new SudokuGameLoadEvent().emit()
        this.reloading--
        this.save()
    }

    setAt(pos: [number, number], value: number): void {
        if (!(this.sudoku.isValidValue(value) || value == 0)) {
            return
        }
        if (this.freezer.at(pos)) {
            return
        }
        const prevValue = this.sudoku.at(pos)
        this.sudoku.setAt(pos, value)
        this.conflicts.recordChange(pos, prevValue)
        new ValueSetEvent(pos, value).emit()
        if (value > 0 && this.sudoku.isDone() && !this.previouslyDone) {
            new SudokuSolvedEvent(false).emit()
            this.previouslyDone = true
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
        if (!this.cursor.active || this.freezer.at(pos)) {
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
        if (!this.cursor.active || this.freezer.at(pos)) {
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
                "difficulty": this.difficulty,
            },
            "hints": this.hints.hints,
            "cursor": {
                "active": this.cursor.active,
                "pos": this.cursor.pos,
            },
            "frozen": this.freezer.frozen,
            "timer": {
                "value": this.timer.value(),
            },
            "previouslyDone": this.previouslyDone,
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

        this.previouslyDone = obj["previouslyDone"]

        const size = obj["sudoku"]["size"]
        const board = obj["sudoku"]["values"]
        const difficulty = obj["sudoku"]["difficulty"]
        const sudoku = new Sudoku(size, board)
        this.newGame(sudoku, false, difficulty, this.previouslyDone)

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
                    const idx = (row * sudoku.cols * sudoku.values)
                        + (col * sudoku.values) + value
                    if (hints[idx]) {
                        this.hints.toggle([row, col], value + 1, true)
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
        if (!this.previouslyDone) {
            this.timer.resume()
        }

        new SudokuGameLoadEvent().emit()
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
    SudokuGameLoadEvent,
    ConflictMarkEvent,
    SudokuHighlightEvent,
}
