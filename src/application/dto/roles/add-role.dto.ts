import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@/domain/value-objects/role.vo';

export class AddRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
