import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@/domain/value-objects/role.vo';
import { AddRoleUseCase } from '@/application/use-cases/roles/add-role.use-case';
import { RemoveRoleUseCase } from '@/application/use-cases/roles/remove-role.use-case';
import { GetProfileUseCase } from '@/application/use-cases/auth/get-profile.use-case';
import { AddRoleDto } from '@/application/dto/roles/add-role.dto';
import {
  ApiGetUser,
  ApiAddRole,
  ApiRemoveRole,
} from '../decorators/swagger/users.swagger';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // Protect all endpoints with JWT + Roles
export class UsersController {
  constructor(
    private addRoleUseCase: AddRoleUseCase,
    private removeRoleUseCase: RemoveRoleUseCase,
    private getProfileUseCase: GetProfileUseCase,
  ) {}

  @Get(':id')
  @Roles(Role.ADMIN) // Only admins can view any user
  @ApiGetUser()
  async getUser(@Param('id') userId: string) {
    return this.getProfileUseCase.execute(userId);
  }

  @Post(':id/roles')
  @Roles(Role.ADMIN) // Only admins can add roles
  @HttpCode(HttpStatus.OK)
  @ApiAddRole()
  async addRole(@Param('id') userId: string, @Body() addRoleDto: AddRoleDto) {
    return this.addRoleUseCase.execute(userId, addRoleDto.role);
  }

  @Delete(':id/roles/:role')
  @Roles(Role.ADMIN) // Only admins can remove roles
  @HttpCode(HttpStatus.OK)
  @ApiRemoveRole()
  async removeRole(@Param('id') userId: string, @Param('role') role: Role) {
    return this.removeRoleUseCase.execute(userId, role);
  }
}
