class ParseError extends Error {
    constructor(msg: string) {
        super(msg)
    }
}

class Setting<T> {
    key: string
    default_: () => T
    serialize: (v: T) => string
    deserialize: (s: string) => T
    onSet: ((v: T) => void)[]

    constructor(
        key: string,
        default_: () => T,
        serialize: (v: T) => string,
        deserialize: (s: string) => T,
        onSet: ((v: T) => void) | null,
    ) {
        this.key = key
        this.default_ = default_
        this.serialize = serialize
        this.deserialize = deserialize
        if (onSet == null) {
            this.onSet = []
        } else {
            this.onSet = [onSet]
        }
    }

    get(): T {
        const value = localStorage.getItem(this.key)
        if (value == null) {
            return this.default_()
        }
        try {
            return this.deserialize(value)
        } catch (e) {
            if (e instanceof ParseError) {
                console.error(
                    `Failed to parse: '${this.key}' setting. ` +
                    `Erroneous value: '${value}'. ${e.message}`
                )
            } else {
                console.error(e)
            }
            return this.default_()
        }
    }

    set(v: T): void {
        localStorage.setItem(this.key, this.serialize(v))
        for (const f of this.onSet) {
            f(v)
        }
    }

    runOnSet(): void {
        const v = this.get()
        for (const f of this.onSet) {
            f(v)
        }
    }

    extendOnSet(f: (v: T) => void): void {
        this.onSet.push(f)
    }
}

type Theme = "light" | "dark"

function isTheme(s: string): s is Theme {
    return s == "light" || s == "dark"
}

function setTheme(theme: Theme): void {
    document.documentElement.setAttribute("data-theme", theme)
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
        dialog.setAttribute("data-theme", "dark");
    });
}

let themeSetting = new Setting<Theme>(
    "theme",
    () => "light",
    (t: Theme): string => t,
    (s: string): Theme => {
        if (isTheme(s)) {
            return s
        }
        throw new ParseError("Invalid theme value.")
    },
    setTheme,
)

addEventListener("visibilitychange", (_) => {
    if (document.visibilityState == "visible") {
        themeSetting.runOnSet()
    }
});

type Highlight = "region" | "numbers" | "none"

function isHighlight(val: string): val is Highlight {
    return ["region", "numbers", "none"].includes(val)
}

let highlightSetting = new Setting<Highlight>(
    "highlight",
    () => "none",
    (h: Highlight): string => h,
    (s: string): Highlight => {
        if (isHighlight(s)){
            return s
        }
        throw new ParseError("Invalid highlight value.")
    },
    null,
)

let highlightConflictsSetting = new Setting<boolean>(
    "highlightConflicts",
    () => true,
    (hc: boolean): string => hc.toString(),
    (s: string): boolean => s == "true",
    null,
)

export {
    Setting,
    Highlight,
    Theme,
    themeSetting,
    highlightSetting,
    highlightConflictsSetting
}
