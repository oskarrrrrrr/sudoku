import { Sudoku, shuffleSudoku } from "./sudoku.js"
import {
    RichSudoku,
    CursorMoveEvent,
    ValueSetEvent,
    HintUpdateEvent,
    FreezeEvent,
    SudokuSolvedEvent,
    SudokuGameLoadEvent,
    ConflictMarkEvent,
    SudokuHighlightEvent,
} from "./richSudoku.js"

function getHtmlElement<T extends HTMLElement>(id: string, type: { new(): T; }, typeName: string): T {
    let el = document.getElementById(id)
    if (el == null) {
        const msg = `'${typeName}' with id '${id}' not found`
        console.log(msg)
        throw new Error(msg)
    }
    if (!(el instanceof type)) {
        const msg = `DOM element with id '${id}' expected to be a '${typeName}'`
        console.log(msg)
        throw new Error(msg)
    }
    return el
}

function getDiv(id: string): HTMLDivElement {
    return getHtmlElement(id, HTMLDivElement, "div")
}

function getButton(id: string): HTMLButtonElement {
    return getHtmlElement(id, HTMLButtonElement, "button")
}

function getDialog(id: string): HTMLDialogElement {
    return getHtmlElement(id, HTMLDialogElement, "dialog")
}

function getImg(id: string): HTMLImageElement {
    return getHtmlElement(id, HTMLImageElement, "image")
}

// SETTINGS

let settingsButton = getButton("settings-button")
let settingsDialog = getDialog("settings-dialog")
let settingsDialogCloseButton = getDiv("settings-dialog-close-button")
settingsDialog.onclose = () => {
    resumeTimer()
}
settingsButton.onclick = () => {
    richSudoku.timer.pause()
    settingsDialog.showModal()
    refreshHighlightConflictsSettings()
    refreshHighlightRegionSettings()
    refreshThemeSettings()
}
settingsDialogCloseButton.onclick = () => {
    settingsDialog.close()
}

type Theme = "light" | "dark"

function isTheme(s: string): s is Theme {
    return s == "light" || s == "dark"
}

class SudokuSettings {
    highlightConflicts: boolean
    highlightRegion: boolean
    theme: Theme

    constructor() {
        this.highlightConflicts = true
        this.highlightRegion = false
        this.theme = "light"
    }

    save(): void {
        localStorage.setItem("highlightConflicts", this.highlightConflicts.toString())
        localStorage.setItem("highlightRegion", this.highlightRegion.toString())
        localStorage.setItem("theme", this.theme)
    }

    load(): void {
        const highlightConflicts = localStorage.getItem("highlightConflicts")
        if (highlightConflicts != null) {
            this.highlightConflicts = (highlightConflicts == "true")
        }
        const highlightRegion = localStorage.getItem("highlightRegion")
        if (highlightRegion != null) {
            this.highlightRegion = (highlightRegion == "true")
        }
        const theme = localStorage.getItem("theme")
        if (theme != null) {
            if (!isTheme(theme)) {
                throw new Error(`unexpected theme value in local storage: ${theme}`)
            }
            this.theme = theme
        }
    }
}

let sudokuSettings = new SudokuSettings()
sudokuSettings.load()

let highlightConflictsYes = getDiv("highlight-conflicts-yes")
let highlightConflictsNo = getDiv("highlight-conflicts-no")

function refreshHighlightConflictsSettings() {
    const toggleOptionSelected = "toggle-option-selected"
    if (sudokuSettings.highlightConflicts) {
        highlightConflictsYes.classList.add(toggleOptionSelected)
        highlightConflictsNo.classList.remove(toggleOptionSelected)
    } else {
        highlightConflictsYes.classList.remove(toggleOptionSelected)
        highlightConflictsNo.classList.add(toggleOptionSelected)
    }
}

highlightConflictsYes.onclick = () => {
    sudokuSettings.highlightConflicts = true
    sudokuSettings.save()
    refreshHighlightConflictsSettings()
    refreshCells()
}

highlightConflictsNo.onclick = () => {
    sudokuSettings.highlightConflicts = false
    sudokuSettings.save()
    refreshHighlightConflictsSettings()
    refreshCells()
}

let highlightRegionYes = getDiv("highlight-region-yes")
let highlightRegionNo = getDiv("highlight-region-no")

function refreshHighlightRegionSettings() {
    const toggleOptionSelected = "toggle-option-selected"
    if (sudokuSettings.highlightRegion) {
        highlightRegionYes.classList.add(toggleOptionSelected)
        highlightRegionNo.classList.remove(toggleOptionSelected)
    } else {
        highlightRegionYes.classList.remove(toggleOptionSelected)
        highlightRegionNo.classList.add(toggleOptionSelected)
    }
}

function refreshRegionHighlighting(): void {
    if (sudokuSettings.highlightRegion) {
        richSudoku.regionHighlighter.enable(richSudoku.cursor.pos)
    } else {
        richSudoku.regionHighlighter.disable()
    }
}


highlightRegionYes.onclick = () => {
    sudokuSettings.highlightRegion = true
    sudokuSettings.save()
    refreshHighlightRegionSettings()
    richSudoku.regionHighlighter.enable(richSudoku.cursor.pos)
}

highlightRegionNo.onclick = () => {
    sudokuSettings.highlightRegion = false
    sudokuSettings.save()
    refreshHighlightRegionSettings()
    richSudoku.regionHighlighter.disable()
}

let themeLight = getDiv("theme-light")
let themeDark = getDiv("theme-dark")

function refreshThemeSettings() {
    const toggleOptionSelected = "toggle-option-selected"
    if (sudokuSettings.theme == "light") {
        themeLight.classList.add(toggleOptionSelected)
        themeDark.classList.remove(toggleOptionSelected)
    } else {
        themeLight.classList.remove(toggleOptionSelected)
        themeDark.classList.add(toggleOptionSelected)
    }
}

function setTheme(theme: Theme): void {
    document.documentElement.setAttribute("data-theme", theme)
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
        dialog.setAttribute("data-theme", "dark");
    });
}

themeLight.onclick = () => {
    sudokuSettings.theme = "light"
    sudokuSettings.save()
    refreshThemeSettings()
    setTheme("light")
}

themeDark.onclick = () => {
    sudokuSettings.theme = "dark"
    sudokuSettings.save()
    refreshThemeSettings()
    setTheme("dark")
}

setTheme(sudokuSettings.theme)

// INPUT MODE

type InputMode = "pen" | "pencil"
let inputMode: InputMode = "pen"

function getInputModeDiv(): HTMLDivElement {
    return getDiv("input-mode-button")
}

function toggleInputMode(): void {
    let inputModeDiv = getInputModeDiv()
    switch (inputMode) {
        case "pen":
            inputMode = "pencil"
            break
        case "pencil":
            inputMode = "pen"
            break
        default:
            throw new Error(`Unexpected input mode: ${inputMode}`)
    }
    inputModeDiv.innerText = inputMode
}

// SUDOKU CELLS UTILITIES

function getSudokuCell(pos: [number, number]): HTMLDivElement {
    const [row, col] = pos
    const cellId = `sudoku-cell-${row}-${col}`
    return getDiv(cellId)
}

function getPosFromCellId(cellId: string): [number, number] {
    const split = cellId.split("-")
    return [parseInt(split[2]), parseInt(split[3])]
}

function highlightSudokuCell(cell: HTMLDivElement): void {
    const newCursor = getPosFromCellId(cell.id)
    richSudoku.cursor.set(newCursor)
}

// INPUT HANDLERS

function handleDigitInput(value: number) {
    if (richSudoku.previouslyDone) {
        return
    }
    switch (inputMode) {
        case "pen":
            richSudoku.set(value)
            break
        case "pencil":
            richSudoku.toggleHint(value)
            break
    }
}

document.onkeydown = (e: KeyboardEvent) => {
    switch (e.key) {
        case "x":
        case "Backspace":
        case "Delete":
            if (!richSudoku.previouslyDone) {
                richSudoku.clear()
            }
            break
        case "1": case "2": case "3":
        case "4": case "5": case "6":
        case "7": case "8": case "9":
            handleDigitInput(parseInt(e.key))
            break
        case "!": case "@": case "#":
        case "$": case "%": case "^":
        case "&": case "*": case "(":
            const digit = {
                "!": 1, "@": 2, "#": 3,
                "$": 4, "%": 5, "^": 6,
                "&": 7, "*": 8, "(": 9,
            }[e.key]
            richSudoku.toggleHint(digit)
            break
        case "h":
        case "ArrowLeft":
            richSudoku.cursor.moveLeft()
            break
        case "l":
        case "ArrowRight":
            richSudoku.cursor.moveRight()
            break
        case "k":
        case "ArrowUp":
            richSudoku.cursor.moveUp()
            break
        case "j":
        case "ArrowDown":
            richSudoku.cursor.moveDown()
            break
        case "H":
            richSudoku.cursor.moveSquareLeft()
            break
        case "L":
            richSudoku.cursor.moveSquareRight()
            break
        case "K":
            richSudoku.cursor.moveSquareUp()
            break
        case "J":
            richSudoku.cursor.moveSquareDown()
            break
        case "m":
            toggleInputMode()
            break
        case " ":
            if (pauseDialog.open) {
                pauseDialog.close()
            }
            if (richSudoku.timer.status() == "running") {
                richSudoku.timer.pause()
                pauseDialog.showModal()
            }
    }
};

function onDigitButtonClick(btn: HTMLDivElement): void {
    if (richSudoku.previouslyDone) {
        return
    }
    const suffix = btn.id.split("-")[2]
    if (suffix == "x") {
        richSudoku.clear()
    } else {
        handleDigitInput(parseInt(suffix))
    }
}

// HANDLING EVENTS

CursorMoveEvent.listen((event: CursorMoveEvent) => {
    if (event.from_pos !== null) {
        let cell = getSudokuCell(event.from_pos)
        cell.classList.remove("sudoku-cell-cursor")
    }
    if (event.to_pos !== null) {
        let cell = getSudokuCell(event.to_pos)
        cell.classList.add("sudoku-cell-cursor")
    }
})

function setCellValue(pos: [number, number], value: number): void {
    const cell = getSudokuCell(pos)
    if (value == 0) {
        cell.innerText = ""
    } else {
        if (sudokuSettings.highlightConflicts && richSudoku.conflicts.at(pos)) {
            cell.innerHTML = (
                `${value.toString()}<div class="conflict-circle"></div>`
            )
        } else {
            cell.innerText = value.toString()
        }
    }
}

function refreshCells(): void {
    for (let row = 0; row < richSudoku.sudoku.rows; row++) {
        for (let col = 0; col < richSudoku.sudoku.cols; col++) {
            const pos: [number, number] = [row, col]
            const val = richSudoku.sudoku.at(pos)
            // only refresh when cell is not empty
            // otherwise we remove pencil hints
            if (val != 0) {
                setCellValue(pos, val)
            }
        }
    }
}

ValueSetEvent.listen((event: ValueSetEvent) => {
    setCellValue(event.pos, event.value)
})

function getHintsHtml(hints: boolean[]): string {
    function getHint(digit: number): string {
        const d = digit > 0 ? digit.toString() : ""
        return `<div class="hint flex-center">${d}</div>`
    }

    function getHintsRow(digits: number[]): string {
        let result = `<div class="hint-row">`
        for (const d of digits) {
            result += getHint(hints[d - 1] ? d : 0)
        }
        result += `</div>`
        return result
    }

    return `
        <div class="hint-wrapper">
            ${getHintsRow([1, 2, 3])}
            ${getHintsRow([4, 5, 6])}
            ${getHintsRow([7, 8, 9])}
        </div>
    `
}

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

let endGameDialog = getDialog("end-game-dialog")
let endGameText = getDiv("end-game-dialog-text")
let endGameCloseButton = getDiv("end-game-close-button")

endGameCloseButton.onclick = () => {
    endGameDialog.close()
}

SudokuSolvedEvent.listen((e: SudokuSolvedEvent) => {
    richSudoku.timer.pause()
    const time = richSudoku.timer.toString()
    const text = `Sudoku solved in ${time}!`
    endGameText.innerText = text
    endGameDialog.showModal()
})

SudokuGameLoadEvent.listen((_: SudokuGameLoadEvent) => {
    getDifficultyDiv().innerText = richSudoku.difficulty
})

ConflictMarkEvent.listen((e: ConflictMarkEvent) => {
    for (let i = 0; i < e.changes.length; i++) {
        const [pos, _] = e.changes[i]
        setConflict(pos)
    }
})

SudokuHighlightEvent.listen((e: SudokuHighlightEvent) => {
    for (const [pos, highlight] of e.changes) {
        const cell = getSudokuCell(pos)
        if (highlight) {
            if (sudokuSettings.highlightRegion) {
                cell.classList.add("sudoku-cell-highlight")
            }
        } else {
            cell.classList.remove("sudoku-cell-highlight")
        }
    }
})

// INITIALIZATION
const richSudoku = new RichSudoku(3)

function sudokuFromStrList(s: string): number[][] {
    const nums = s.split(",").map(Number)
    const result: number[][] = []
    let i = 0
    for (let row = 0; row < 9; row++) {
        result.push([])
        for (let col = 0; col < 9; col++) {
            result[row][col] = nums[i]
            i++
        }
    }
    return result
}

async function newGame(difficulty: Difficulty = "medium"): Promise<void> {
    const params = new URLSearchParams({
        "difficulty": difficulty,
    })
    const req = `/api/random-sudoku?${params.toString()}`
    const response = await fetch(req)
    const text = await response.text()
    const lines = text.split("\n")
    let sudoku = new Sudoku(3, sudokuFromStrList(lines[1]))
    shuffleSudoku(sudoku)
    richSudoku.newGame(sudoku, true, difficulty, false)
}

if (!richSudoku.load()) {
    await newGame()
}

for (let row = 0; row < richSudoku.sudoku.rows; row++) {
    for (let col = 0; col < richSudoku.sudoku.cols; col++) {
        let cell = getSudokuCell([row, col])
        cell.onclick = () => highlightSudokuCell(cell)
    }
}

for (let i = 1; i < 11; i++) {
    const suffix = i <= 9 ? i.toString() : "x"
    const id = "digit-btn-" + suffix
    let button = getDiv(id)
    button.onclick = () => onDigitButtonClick(button)
}

let button = getDiv("input-mode-button")
button.onclick = toggleInputMode

let newGameButton = getButton("new-game-button")
let newGameDialog = getDialog("new-game-dialog")
let newGameDialogCloseButton = getDiv("new-game-dialog-close-button")
let newGameEasy = getDiv("new-game-easy-button")
let newGameMedium = getDiv("new-game-medium-button")
let newGameHard = getDiv("new-game-hard-button")

newGameButton.onclick = () => {
    richSudoku.timer.pause()
    newGameDialog.showModal()
}

newGameDialogCloseButton.onclick = () => {
    newGameDialog.close()
}

newGameDialog.onclose = () => {
    resumeTimer()
}

const newGameButtons: [HTMLDivElement, Difficulty][] = [
    [newGameEasy, "easy"],
    [newGameMedium, "medium"],
    [newGameHard, "hard"]
]
for (const [btn, diff] of newGameButtons) {
    btn.onclick = async () => {
        newGameDialog.close()
        await newGame(diff)
    }
}


let pauseButton = getDiv("pause-button")
let resumeButton = getDiv("resume-button")
let pauseDialog = getDialog("pause-dialog")

pauseDialog.onclose = () => {
    resumeTimer()
}
pauseButton.onclick = () => {
    if (richSudoku.timer.status() != "running") {
        return
    }
    richSudoku.timer.pause()
    pauseDialog.showModal()
}
resumeButton.onclick = () => {
    pauseDialog.close()
}

// TIMER

function getTimerDiv(): HTMLDivElement {
    return getDiv("game-timer")
}

function refreshTimer(): void {
    const timerDiv = getTimerDiv()
    const newTimerStr = (
        richSudoku.timer.toString() +
        (richSudoku.previouslyDone ? " (solved)" : "")
    )
    if (timerDiv.innerText != newTimerStr) {
        timerDiv.innerText = newTimerStr
    }
}

setInterval(function() {
    if (richSudoku.previouslyDone) {
        pauseButton.classList.add("hide")
    } else {
        pauseButton.classList.remove("hide")
    }
    refreshTimer()
}, 50)

function resumeTimer(): void {
    if (!richSudoku.sudoku.isDone()) {
        richSudoku.timer.resume()
    }
}

// make sure that timer state is saved regularly
setInterval(function() { richSudoku.save() }, 1000)

// DIFFICULTY

type Difficulty = "easy" | "medium" | "hard"

function getDifficultyDiv(): HTMLDivElement {
    return getDiv("game-difficulty")
}

// CONFLICT

function setConflict(pos: [number, number]): void {
    setCellValue(pos, richSudoku.sudoku.at(pos))
}

richSudoku.cursor.activate()
refreshRegionHighlighting()
