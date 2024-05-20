import { validateEmail, validatePassword } from "./validations.js"

async function loginOrRegister(endpoint: string, email: string, password: string): Promise<string[]> {
    let errors: string[] = []
    errors.push(...validateEmail(email))
    errors.push(...validatePassword(password))
    if (errors.length > 0) {
        return errors
    }
    const request = new Request(
        endpoint,
        {
            method: "POST",
            body: JSON.stringify({ email: email, password: password }),
        }
    )
    let response = null
    try {
        response = await fetch(request, { signal: AbortSignal.timeout(5000) })
    } catch (e) {
        return ["Failed to reach server. Try again."]
    }
    if (response.ok) {
        return []
    } else if (response.status == 401) {
        return ["Invalid email and password combination."]
    } else {
        return ["Unexpected error."]
    }
}

export async function login(email: string, password: string): Promise<string[]> {
    return loginOrRegister("/api/login", email, password)
}

export async function register(email: string, password: string): Promise<string[]> {
    return loginOrRegister("/api/register", email, password)
}
