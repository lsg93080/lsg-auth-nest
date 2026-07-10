import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import type { IUserRepository } from '@/domain/repositories/user.repository.interface';
import { Role } from '@/domain/value-objects/role.vo';
import { UserProfileDto } from '@/application/dto/auth/user-profile.dto';
import { UserProfileMapper } from '@/application/mappers/user-profile.mapper';

@Injectable()
export class GrantDeveloperRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<UserProfileDto> {
    // Find user
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // Check if user already has developer role
    if (user.hasRole(Role.DEVELOPER)) {
      return UserProfileMapper.toDto(user);
    }

    // Grant developer role
    const updatedUser = user.addRole(Role.DEVELOPER);

    // Persist role change
    const savedUser = await this.userRepository.update(id, {
      roles: updatedUser.roles,
    });

    return UserProfileMapper.toDto(savedUser);
  }
}
