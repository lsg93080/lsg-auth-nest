import { Role } from '@/domain/value-objects/role.vo';

export class UserEntity {
  constructor(
    public readonly id: string | null,
    public readonly authProviderId: string,
    public readonly email: string,
    public readonly roles: Role[],
    public readonly displayName?: string,
    public readonly isActive: boolean = true,
    public readonly lastLogin?: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  // Roles

  hasRole(role: Role): boolean {
    return this.roles.includes(role);
  }

  hasAnyRole(roles: Role[]): boolean {
    return roles.some((role) => this.roles.includes(role));
  }

  isPlayer(): boolean {
    return this.hasRole(Role.PLAYER);
  }

  isDeveloper(): boolean {
    return this.hasRole(Role.DEVELOPER);
  }

  isAdmin(): boolean {
    return this.hasRole(Role.ADMIN);
  }

  isNewEntity(): boolean {
    return this.createdAt === undefined;
  }

  addRole(role: Role): UserEntity {
    if (this.hasRole(role)) {
      return this;
    }

    return new UserEntity(
      this.id,
      this.authProviderId,
      this.email,
      [...this.roles, role],
      this.displayName,
      this.isActive,
      this.lastLogin,
      this.createdAt,
      this.updatedAt,
    );
  }

  removeRole(role: Role): UserEntity {
    return new UserEntity(
      this.id,
      this.authProviderId,
      this.email,
      this.roles.filter((r) => r !== role),
      this.displayName,
      this.isActive,
      this.lastLogin,
      this.createdAt,
      this.updatedAt,
    );
  }

  // Create users

  static create(
    id: string,
    authProviderId: string,
    email: string,
    displayName?: string,
  ): UserEntity {
    return new UserEntity(
      id,
      authProviderId,
      email,
      [Role.PLAYER], // All start as players
      displayName,
      true,
      new Date(),
    );
  }
}
