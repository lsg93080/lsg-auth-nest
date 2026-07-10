import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserProfileDto } from '@/application/dto/auth/user-profile.dto';
import { UserProfileMapper } from '@/application/mappers/user-profile.mapper';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '@/domain/repositories/user.repository.interface';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return UserProfileMapper.toDto(user);
  }
}
