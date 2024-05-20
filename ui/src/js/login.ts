import { themeSetting } from "./settings.js"
import * as auth from "./auth.js"
import * as docUtils from "./docUtils.js"

const loginForm = docUtils.getForm("login-form")
const emailInput = docUtils.getInput("email-input")
const passwordInput = docUtils.getInput("pass-input")
const errorMsgsDiv = docUtils.getDiv("login-form-errors")

async function onLoginSubmit(event: Event): Promise<void> {
    event.preventDefault()
    errorMsgsDiv.innerText = ""
    const errors = await auth.login(emailInput.value, passwordInput.value)
    if (errors.length == 0) {
        window.location.href = "/"
    } else {
        errorMsgsDiv.innerText = errors.join("\n")
    }
}

loginForm.addEventListener("submit", onLoginSubmit)
themeSetting.runOnSet()
