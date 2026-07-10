import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface ValidateTokenResult {
  valid: boolean;
  userId?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class ValidateTokenUseCase {
  constructor(private jwtService: JwtService) {}

  // Validates JWT token signature and expiration
  execute(token: string): ValidateTokenResult {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      return {
        valid: true,
        userId: payload.sub,
      };
    } catch {
      // Token invalid, expired, or malformed
      return {
        valid: false,
      };
    }
  }
}
