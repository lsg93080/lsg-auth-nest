import { UserEntity } from '@/domain/entities/user.entity';
import { UserProfileDto } from '@/application/dto/auth/user-profile.dto';

export class UserProfileMapper {
  static toDto(user: UserEntity): UserProfileDto {
    return {
      id: user.id!,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
