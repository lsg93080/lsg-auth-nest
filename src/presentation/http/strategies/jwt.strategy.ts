import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CurrentUserData } from '../types/authenticated-request.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // Passport requires validate to be async per framework contract, even though this implementation has no async operations
  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: JwtPayload): Promise<CurrentUserData> {
    if (
      !payload.sub ||
      !payload.email ||
      !Array.isArray(payload.roles) ||
      payload.roles.length === 0
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // This object is attached to request.user
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
