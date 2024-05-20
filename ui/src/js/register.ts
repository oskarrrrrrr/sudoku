import { themeSetting } from "./settings.js"
import * as docUtils from "./docUtils.js"
import * as auth from "./auth.js"

const registerForm = docUtils.getForm("register-form")
const emailInput = docUtils.getInput("email-input")
const passwordInput = docUtils.getInput("pass-input")
const errorMsgsDiv = docUtils.getDiv("register-form-errors")

async function onRegisterSubmit(event: Event) {
    event.preventDefault()
    errorMsgsDiv.innerText = ""
    const errors = await auth.register(emailInput.value, passwordInput.value)
    if (errors.length == 0) {
        window.location.href = "/register-complete"
    } else {
        errorMsgsDiv.innerText = errors.join("\n")
    }
}

registerForm.addEventListener("submit", onRegisterSubmit)
themeSetting.runOnSet()
