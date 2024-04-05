import { themeSetting } from "./settings.js"
import * as docUtils from "./docUtils.js"

const loginForm = docUtils.getForm("login-form")
const emailInput = docUtils.getInput("email-input")
const passwordInput = docUtils.getInput("pass-input")
const errorMsgsDiv = docUtils.getDiv("login-form-errors")

let loggedIn = false;

function validateEmail(email: string): string[] {
    let errors: string[] = []
    const re = /^[^@]+@[^@]+\.[^@]+$/
    if (email.length > 320) {
        errors.push("Email too long.")
    } else if (!re.test(email)) {
        errors.push("Invalid email format.")
    }
    return errors
}

function validatePassword(password: string): string[] {
    let errors: string[] = []
    if (password.length < 8) {
        errors.push("Password has to be at least 8 characters long.")
    }
    if (password.length > 128) {
        errors.push("Password can be no longer than 128 characters.")
    }
    return errors
}

function displayErrors(errors: string[]): void {
    errorMsgsDiv.innerText = errors.join("\n")
}

function clearErrors(): void {
    errorMsgsDiv.innerText = ""
}

async function onLoginSubmit(event: Event): Promise<void> {
    event.preventDefault()
    if (loggedIn) {
        return
    }
    let errors: string[] = []
    const email = emailInput.value
    errors.push(...validateEmail(email))
    const password = passwordInput.value
    errors.push(...validatePassword(password))
    if (errors.length > 0) {
        displayErrors(errors)
    } else {
        clearErrors()
        const request = new Request(
            "/api/login",
            {
                method: "POST",
                body: JSON.stringify({ email: email, password: password }),
            }
        )
        let response = null
        try {
            response = await fetch(request, { signal: AbortSignal.timeout(3000) })
        } catch (e) {
            displayErrors(["Failed to reach server. Try again."])
        }
        if (response != null) {
            if (response.ok) {
                loggedIn = true
                window.location.href = "/"
            } else if (response.status == 401) {
                displayErrors(["Invalid email and password combination."])
            } else {
                displayErrors(["Unexpected error."])
            }
        }
    }
}

loginForm.addEventListener("submit", onLoginSubmit)
themeSetting.runOnSet()
