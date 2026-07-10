export class UserProfileDto {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
