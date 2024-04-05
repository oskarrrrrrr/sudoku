export function getHtmlElement<T extends HTMLElement>(id: string, type: { new(): T; }, typeName: string): T {
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

export function getDiv(id: string): HTMLDivElement {
    return getHtmlElement(id, HTMLDivElement, "div")
}

export function getButton(id: string): HTMLButtonElement {
    return getHtmlElement(id, HTMLButtonElement, "button")
}

export function getDialog(id: string): HTMLDialogElement {
    return getHtmlElement(id, HTMLDialogElement, "dialog")
}

export function getImg(id: string): HTMLImageElement {
    return getHtmlElement(id, HTMLImageElement, "image")
}

export function getForm(id: string): HTMLFormElement {
    return getHtmlElement(id, HTMLFormElement, "form")
}

export function getInput(id: string): HTMLInputElement {
    return getHtmlElement(id, HTMLInputElement, "input")
}
