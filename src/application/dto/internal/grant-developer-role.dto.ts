import { IsUUID } from 'class-validator';

export class GrantDeveloperRoleDto {
  @IsUUID('4', { message: 'Invalid format for userId (must be UUID v4)' })
  userId: string;
}
