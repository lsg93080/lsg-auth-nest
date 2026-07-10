import { UserEntity } from '@/domain/entities/user.entity';
import { UserDocument } from '../schemas/user.schema';

export class UserMapper {
  // Maps a MongoDB User document to a UserEntity domain object or returns null if the input is null
  static toDomain(mongoUser: UserDocument | null): UserEntity | null {
    if (!mongoUser) return null;

    return new UserEntity(
      mongoUser.id,
      mongoUser.authProviderId,
      mongoUser.email,
      mongoUser.roles,
      mongoUser.displayName,
      mongoUser.isActive,
      mongoUser.lastLogin,
      mongoUser.createdAt,
      mongoUser.updatedAt,
    );
  }

  // Maps a MongoDB User document to a UserEntity domain object or throws an error if the input is null
  static toDomainOrThrow(mongoUser: UserDocument | null): UserEntity {
    if (!mongoUser) {
      throw new Error('Cannot map null user to domain entity');
    }

    return new UserEntity(
      mongoUser.id,
      mongoUser.authProviderId,
      mongoUser.email,
      mongoUser.roles,
      mongoUser.displayName,
      mongoUser.isActive,
      mongoUser.lastLogin,
      mongoUser.createdAt,
      mongoUser.updatedAt,
    );
  }

  // Maps a UserEntity domain object to a plain object suitable for MongoDB persistence, excluding the id field
  static toPersistence(domainUser: UserEntity): Partial<UserDocument> {
    return {
      id: domainUser.id!,
      authProviderId: domainUser.authProviderId,
      email: domainUser.email,
      displayName: domainUser.displayName,
      roles: domainUser.roles,
      isActive: domainUser.isActive,
      lastLogin: domainUser.lastLogin,
    };
  }

  // Maps an array of MongoDB User documents to an array of UserEntity domain objects, filtering out any null values
  static toDomainList(mongoUsers: UserDocument[]): UserEntity[] {
    return mongoUsers
      .map((user) => this.toDomain(user))
      .filter((user): user is UserEntity => user !== null);
  }
}
