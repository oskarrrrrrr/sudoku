export function validateEmail(email: string): string[] {
    let errors: string[] = []
    const re = /^[^@]+@[^@]+\.[^@]+$/
    if (email.length > 320) {
        errors.push("Email too long.")
    } else if (!re.test(email)) {
        errors.push("Invalid email format.")
    }
    return errors
}

export function validatePassword(password: string): string[] {
    let errors: string[] = []
    if (password.length < 8) {
        errors.push("Password has to be at least 8 characters long.")
    }
    if (password.length > 128) {
        errors.push("Password can be no longer than 128 characters.")
    }
    return errors
}
