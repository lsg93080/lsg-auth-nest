import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  internalService?: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('API key missing');
    }

    const services =
      this.configService
        .get<string>('INTERNAL_SERVICES')
        ?.split(',')
        .map((s) => s.trim().toLowerCase()) ?? [];

    for (const service of services) {
      const key = this.configService.get<string>(
        `${service.toUpperCase()}_API_KEY`,
      );

      if (key && this.safeCompare(apiKey, key)) {
        request.internalService = service;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  // Timing-safe string comparison to prevent timing attacks
  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  }
}
