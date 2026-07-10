import { SetMetadata } from '@nestjs/common';
import { Role } from '@/domain/value-objects/role.vo';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
