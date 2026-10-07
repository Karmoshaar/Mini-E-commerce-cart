/** An error whose message is safe and meant to be shown to the Discord user as-is. */
export class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserError';
  }
}
