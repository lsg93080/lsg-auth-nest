// Thrown when a refresh token is definitively unusable, such as GitLab invalid_grant. Transient failures (5xx, network) must NOT use this error.
export class UnrecoverableTokenRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnrecoverableTokenRefreshError';
  }
}
