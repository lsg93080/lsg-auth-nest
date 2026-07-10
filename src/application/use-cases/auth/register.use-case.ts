import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '@/domain/entities/user.entity';
import { AuthenticationResponseDto } from '@/application/dto/auth/authentication-response.dto';
import {
  AUTH_PROVIDER,
  type IAuthProvider,
} from '@/domain/services/auth-provider.interface';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '@/domain/repositories/user.repository.interface';
import {
  ID_GENERATOR,
  type IIdGenerator,
} from '@/domain/services/id-generator.interface';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private authProvider: IAuthProvider,
    @Inject(USER_REPOSITORY) private userRepository: IUserRepository,
    @Inject(ID_GENERATOR) private idGenerator: IIdGenerator,
    private jwtService: JwtService,
  ) {}

  async execute(authProviderToken: string): Promise<AuthenticationResponseDto> {
    // Verify token with auth provider
    const decodedToken = await this.authProvider.verifyToken(authProviderToken);

    // Search for user in database by auth provider ID
    const existingUser = await this.userRepository.findByAuthProviderId(
      decodedToken.uid,
    );
    if (existingUser) {
      throw new ConflictException('User already exists. Please login instead.');
    }

    // Generate ID
    const userId = this.idGenerator.generate();

    // Create new user in database
    const newUser = UserEntity.create(
      userId,
      decodedToken.uid,
      decodedToken.email,
      decodedToken.name,
    );
    const savedUser = await this.userRepository.save(newUser);

    // Generate own JWT token
    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      roles: savedUser.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    // Return token and user profile
    return {
      access_token: accessToken,
      isNewUser: true,
      user: {
        id: savedUser.id!,
        email: savedUser.email,
        displayName: savedUser.displayName,
        roles: savedUser.roles,
      },
    };
  }
}
