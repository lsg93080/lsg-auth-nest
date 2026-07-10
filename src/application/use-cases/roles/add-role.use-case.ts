import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import type { IUserRepository } from '@/domain/repositories/user.repository.interface';
import { Role } from '@/domain/value-objects/role.vo';
import { UserProfileDto } from '@/application/dto/auth/user-profile.dto';
import { UserProfileMapper } from '@/application/mappers/user-profile.mapper';

@Injectable()
export class AddRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private userRepository: IUserRepository,
  ) {}

  async execute(userId: string, role: Role): Promise<UserProfileDto> {
    // Validate role
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }

    // Find user
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Check if user already has the role
    if (user.hasRole(role)) {
      throw new BadRequestException(`User already has role: ${role}`);
    }

    // Add role
    const updatedUser = user.addRole(role);

    // Persist role changes
    const savedUser = await this.userRepository.update(userId, {
      roles: updatedUser.roles,
    });

    return UserProfileMapper.toDto(savedUser);
  }
}
