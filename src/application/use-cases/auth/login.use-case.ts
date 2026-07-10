import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticationResponseDto } from '@/application/dto/auth/authentication-response.dto';
import {
  AUTH_PROVIDER,
  type IAuthProvider,
} from '@/domain/services/auth-provider.interface';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '@/domain/repositories/user.repository.interface';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private authProvider: IAuthProvider,
    @Inject(USER_REPOSITORY) private userRepository: IUserRepository,
    private jwtService: JwtService,
  ) {}

  async execute(authProviderToken: string): Promise<AuthenticationResponseDto> {
    // Verify token with auth provider
    const decodedToken = await this.authProvider.verifyToken(authProviderToken);

    // Search for user in database by auth provider ID
    let user = await this.userRepository.findByAuthProviderId(decodedToken.uid);

    if (!user) {
      throw new UnauthorizedException('User not found. Please register first.');
    }
    // Update last login date
    user = await this.userRepository.update(user.id!, {
      lastLogin: new Date(),
    });

    // Generate own JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    // Return token and user profile
    return {
      access_token: accessToken,
      isNewUser: false,
      user: {
        id: user.id!,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
      },
    };
  }
}
