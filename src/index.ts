class CursorMoveEvent {
    from_pos: number
    to_pos: number

    constructor(from_pos: number, to_pos: number) {
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
    pos: number
    value: number

    constructor(pos: number, value: number) {
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
    pos: number
    hints: boolean[]

    constructor(pos: number, hints: boolean[]) {
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
    pos: number
    frozen: boolean

    constructor(pos: number, frozen: boolean) {
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

    freezeCell(pos: number): void {
        if (this.board[pos] == 0) {
            const [row, col] = [Math.floor(pos/this.sizeSq), pos % this.sizeSq]
            throw new Error(`Can't freeze an empty cell at pos: ${pos} (${row}, ${col})`)
        }
        this.is_frozen[pos] = true
        new FreezeEvent(pos, true).emit()
    }

    unfreezeCell(pos: number): void {
        this.is_frozen[pos] = false
        new FreezeEvent(pos, false).emit()
    }

    isCellFrozen(pos: number): boolean {
        return this.is_frozen[pos]
    }

    setCell(pos: number, val: number): void {
        if (this.sizeSq < val || val < 1) {
            throw new Error(`Unexpected cell value: ${val}.`)
        }
        if (this.is_frozen[pos]) {
            const [row, col] = this._getRowAndCol(pos)
            throw new Error(`Can't change a frozen cell at pos: ${pos} (${row}, ${col})`)
        }
        this.board[pos] = val
        new ValueSetEvent(pos, val).emit()
    }

    getCell(pos: number): number {
        return this.board[pos]
    }

    clearCell(pos: number): void {
        if (this.is_frozen[pos]) {
            const [row, col] = this._getRowAndCol(pos)
            throw new Error(`Can't change a frozen cell at pos: ${pos} (${row}, ${col})`)
        }
        this.board[pos] = 0
        new ValueSetEvent(pos, 0).emit()
    }

    clear(): void {
        for (let i = 0; i < this.board.length; ++i) {
            if (this.board[i] != 0) {
                this.board[i] = 0
                new ValueSetEvent(i, 0).emit()
            }
        }
        for (let i = 0; i < this.is_frozen.length; ++i) {
            if (this.is_frozen[i]) {
                this.is_frozen[i] = false
                new FreezeEvent(i, false).emit()
            }
        }
    }

    isDone(): boolean {
        const result = this._isDone()
        if (result) {
            new SudokuSolvedEvent().emit()
        }
        return result
    }

    _isDone(): boolean {
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

    _getRowAndCol(pos: number): [number, number] {
        return [Math.floor(pos/this.sizeSq), pos % this.sizeSq]
    }
}

class Hints {
    sudoku: Sudoku
    hints: boolean[]

    constructor(sudoku: Sudoku) {
        this.sudoku = sudoku
        this.hints = []
        for (let i = 0; i < this.sudoku.size ** 6; ++i) {
            this.hints.push(false)
        }
    }

    toggle(pos: number, value: number): void {
        this.sudoku.clearCell(pos)
        const idx = pos * this.sudoku.sizeSq + value - 1
        this.hints[idx] = !this.hints[idx]
        new HintUpdateEvent(pos, this.get(pos)).emit()
    }

    clear(pos: number): void {
        const start = pos * this.sudoku.sizeSq
        for (let i = 0; i < this.sudoku.sizeSq; ++i) {
            this.hints[start + i] = false
        }
    }

    get(pos: number): boolean[] {
        const start = pos * this.sudoku.sizeSq
        return this.hints.slice(start, start + this.sudoku.sizeSq)
    }
}

class RichSudoku {
    sudoku: Sudoku
    cursor: number // -1 for no cursor
    hints: Hints

    constructor(sudoku: Sudoku, cursor: number) {
        this.sudoku = sudoku
        this.cursor = cursor
        if (this.cursor >= 0) {
            new CursorMoveEvent(-1, this.cursor).emit()
        }
        this.hints = new Hints(sudoku)
    }

    setCursor(newCursor: number): void {
        const oldCursor = this.cursor
        this.cursor = newCursor
        new CursorMoveEvent(oldCursor, this.cursor).emit()
    }

    unsetCursor(): void {
        const oldCursor = this.cursor
        this.cursor = -1
        new CursorMoveEvent(oldCursor, -1).emit()
    }

    moveCursorRight(): void {
        const on_right_edge = ((this.cursor + 1) % this.sudoku.sizeSq) == 0
        if (!on_right_edge) {
            const oldCursor = this.cursor
            ++this.cursor
            new CursorMoveEvent(oldCursor, this.cursor).emit()
        }
    }

    moveCursorLeft(): void {
        const on_left_edge = (this.cursor % this.sudoku.sizeSq) == 0
        if (!on_left_edge) {
            const oldCursor = this.cursor
            --this.cursor
            new CursorMoveEvent(oldCursor, this.cursor).emit()
        }
    }

    moveCursorUp() {
        const in_first_row = this.cursor < this.sudoku.sizeSq
        if (!in_first_row) {
            const oldCursor = this.cursor
            this.cursor -= this.sudoku.sizeSq
            new CursorMoveEvent(oldCursor, this.cursor).emit()
        }
    }

    moveCursorDown(): void {
        const in_last_row = this.cursor >= (this.sudoku.sizeSq ** 2) - this.sudoku.sizeSq
        if (!in_last_row) {
            const oldCursor = this.cursor
            this.cursor += this.sudoku.sizeSq
            new CursorMoveEvent(oldCursor, this.cursor).emit()
        }
    }
}

function getPosFromCellId(cellId: string): number {
    return parseInt(cellId.split("-")[2])
}

function getSudokuCell(pos: number): HTMLDivElement {
    const cellId = "sudoku-cell-" + pos
    const el = document.getElementById(cellId)
    if (el == null) {
        throw new Error("Could not find document with id: '" + cellId + "'.")
    }
    if (!(el instanceof HTMLDivElement)) {
        throw new Error("Expected cell element to be of type 'HTMLTextAreaElement'.")
    }
    return el
}

function highlightSudokuCell(cell: HTMLDivElement): void {
    const newCursor = getPosFromCellId(cell.id)
    richSudoku.setCursor(newCursor)
}

function handleClearCell() {
    const cursor = richSudoku.cursor
    if (richSudoku.sudoku.isCellFrozen(cursor)) {
        return
    }
    if (richSudoku.sudoku.getCell(cursor) == 0) {
        richSudoku.hints.clear(cursor)
    } else {
        richSudoku.sudoku.clearCell(cursor)
    }
    new HintUpdateEvent(cursor, richSudoku.hints.get(cursor)).emit()
}

function handleDigitInput(digit: number): void {
    if (digit > richSudoku.sudoku.sizeSq) {
        return
    }
    if (!richSudoku.sudoku.isCellFrozen(richSudoku.cursor)) {
        const inputMode = getInputMode()
        switch (inputMode) {
        case "normal":
            richSudoku.sudoku.setCell(richSudoku.cursor, digit)
            break;
        case "hint":
            richSudoku.hints.toggle(richSudoku.cursor, digit)
            break;
        default:
            throw new Error(`Unexpected input mode: ${inputMode}`)
        }
        richSudoku.sudoku.isDone()
    }
}

document.onkeydown = (e: KeyboardEvent) => {
    if (richSudoku.cursor == -1) {
        return
    }
    switch (e.key) {
        case "Backspace":
        case "Delete":
            handleClearCell()
            break
        case "1": case "2": case "3": case "4": case "5": case "6": case "7": case "8": case "9":
            handleDigitInput(parseInt(e.key))
            break
        case "ArrowLeft":
            richSudoku.moveCursorLeft()
            break
        case "ArrowRight":
            richSudoku.moveCursorRight()
            break
        case "ArrowUp":
            richSudoku.moveCursorUp()
            break
        case "ArrowDown":
            richSudoku.moveCursorDown()
            break
        case "m":
            toggleInputMode()
    }
};

function onDigitButtonClick(btn: HTMLDivElement): void {
    if (!(btn instanceof HTMLDivElement)) {
        throw new Error("Expected HTMLDivElement")
    }
    if (richSudoku.sudoku.isCellFrozen(richSudoku.cursor)) {
        return
    }
    const suffix = btn.id.split("-")[2]
    if (suffix == "x") {
        handleClearCell()
    } else {
        handleDigitInput(parseInt(suffix))
    }
}

function getHintsHtml(hints: boolean[]): string {
    function getHint(digit: number): string {
        const d = digit > 0 ? digit.toString() : ""
        return `<div class="hint flex-center">${d}</div>`
    }

    function getHintsRow(digits: number[]): string {
        let result = `<div class="hint-row">`
        for (const d of digits) {
            result += getHint(hints[d-1] ? d : 0)
        }
        result += `</div>`
        return result
    }

    return `
        <div class="hint-wrapper">
            ${getHintsRow([1,2,3])}
            ${getHintsRow([4,5,6])}
            ${getHintsRow([7,8,9])}
        </div>
    `
}


type InputMode = "normal" | "hint"

function isInputMode(s: string): s is InputMode {
    return s == "normal" || s == "hint"
}

function getInputModeDiv(): HTMLDivElement {
    const inputModeDiv = document.getElementById("input-mode-button")
    if (!(inputModeDiv instanceof HTMLDivElement)) {
        throw new Error("Expected HTMLDivElement")
    }
    return inputModeDiv
}

function toggleInputMode() {
    let inputModeDiv = getInputModeDiv()
    switch (inputModeDiv.innerText) {
    case "normal":
        inputModeDiv.innerText = "hint"
        break
    case "hint":
        inputModeDiv.innerText = "normal"
        break
    default:
        throw new Error(`Unexpected input mode: ${inputModeDiv.innerText}`)
    }
}

function getInputMode(): InputMode {
    const inputModeDiv = document.getElementById("input-mode-button")
    if (!(inputModeDiv instanceof HTMLDivElement)) {
        throw new Error("Expected HTMLDivElement")
    }
    const text = inputModeDiv.innerText
    if (isInputMode(text)) {
        return text
    }
    throw new Error(`Expected input mode, got: ${text}`)
}

function onLoad(): void {
    const board = [
        0, 0, 0, 0, 8, 4, 0, 0, 6,
        0, 0, 0, 0, 0, 0, 0, 0, 4,
        4, 8, 6, 0, 0, 0, 9, 7, 5,
        9, 0, 5, 3, 0, 7, 0, 0, 0,
        3, 2, 0, 0, 0, 0, 0, 5, 9,
        0, 0, 0, 5, 0, 0, 3, 6, 0,
        0, 4, 1, 8, 0, 0, 5, 0, 3,
        5, 7, 0, 0, 0, 6, 0, 4, 0,
        2, 0, 0, 4, 0, 0, 0, 0, 0
    ]
    for (let pos = 0; pos < richSudoku.sudoku.sizeSq ** 2; ++pos) {
        if (board[pos] != 0) {
            richSudoku.sudoku.setCell(pos, board[pos])
            richSudoku.sudoku.freezeCell(pos)
        }
    }
}

function showCursor(pos: number): void {
    if (pos < 0) { return }
    let cell = getSudokuCell(pos)
    cell.classList.add("sudoku-cell-cursor")
}

function hideCursor(pos: number): void {
    if (pos < 0) { return }
    let cell = getSudokuCell(pos)
    cell.classList.remove("sudoku-cell-cursor")
}

CursorMoveEvent.listen((event: CursorMoveEvent) => {
    hideCursor(event.from_pos); showCursor(event.to_pos)
})

ValueSetEvent.listen((event: ValueSetEvent) => {
    const cell = getSudokuCell(event.pos)
    if (event.value == 0) {
        cell.innerText = ""
    } else {
        cell.innerText = event.value.toString()
    }
})

HintUpdateEvent.listen((event: HintUpdateEvent) => {
    let cell = getSudokuCell(event.pos)
    cell.innerHTML = getHintsHtml(event.hints)
})

FreezeEvent.listen((event: FreezeEvent) => {
    const cell = getSudokuCell(event.pos)
    if (event.frozen) {
        cell.classList.add("sudoku-cell-frozen")
    } else {
        cell.classList.remove("sudoku-cell-frozen")
    }
})

SudokuSolvedEvent.listen((_: SudokuSolvedEvent) => {
    setTimeout(
        function() { alert("you win!") },
        50
    )
})

// must be initialized after event handlers so that they get triggered
// on any events emitted in the constructor
const richSudoku = new RichSudoku(new Sudoku(3), 30)

onLoad()

function getDiv(id: string): HTMLDivElement {
    let button = document.getElementById(id)
    if (button == null) {
        throw new Error(`div with id ${id} not found`)
    }
    if (!(button instanceof HTMLDivElement)) {
        throw new Error(`DOM element with id ${id} expected to be a div`)
    }
    return button
}

for (let i = 1; i < 11; i++) {
    const suffix = i <= 9 ? i.toString() : "x"
    const id = "digit-btn-" + suffix
    let button = getDiv(id)
    button.onclick = () => onDigitButtonClick(button)
}

let button = getDiv("input-mode-button")
button.onclick = toggleInputMode

for (let i = 0; i < 81; i++) {
    const id = "sudoku-cell-" + i.toString()
    let cell = getDiv(id)
    cell.onclick = () => highlightSudokuCell(cell)
}
