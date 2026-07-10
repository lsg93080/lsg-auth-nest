import { ConflictException } from '@nestjs/common';

// Signals a deleted, unrecoverable OAuth connection. Maps to 409, not 401, to avoid triggering a JWT logout downstream.
export class ReconnectRequiredException extends ConflictException {
  constructor(provider: string) {
    super({
      message: `Your ${provider} connection is no longer valid and has been removed. Please reconnect your account.`,
      error: 'reconnect_required',
      provider,
    });
  }
}
