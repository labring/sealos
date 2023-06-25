import * as crypto from 'crypto'

// use sha256 to hash the password
export function hashPassword(password: string): string {
    const hash = crypto.createHash('sha256')
    hash.update(password + process.env.PASSWORD_SALT)
    return hash.digest('hex')
}

export const verifyPassword = (password: string, hash: string): boolean => hashPassword(password) === hash
export const strongPassword = (password: string): boolean => /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(password)