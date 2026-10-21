// Dependency-free error types (safe to import from scripts and any runtime).

/** An error whose message is safe and helpful to show to the user. */
export class UserError extends Error {}

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401,
  ) {
    super(message);
  }
}
