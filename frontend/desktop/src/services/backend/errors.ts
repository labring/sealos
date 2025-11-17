export class AuthError extends Error {
  constructor(
    message: string,
    public errorCode:
      | 'USER_NOT_FOUND'
      | 'INCORRECT_PASSWORD'
      | 'SIGNUP_FAILED'
      | 'DATABASE_ERROR' = 'DATABASE_ERROR'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
