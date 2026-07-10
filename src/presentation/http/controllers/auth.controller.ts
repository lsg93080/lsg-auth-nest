import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  Get,
  UseGuards,
} from '@nestjs/common';
import { LoginUseCase } from '@/application/use-cases/auth/login.use-case';
import { RegisterUseCase } from '@/application/use-cases/auth/register.use-case';
import { GetProfileUseCase } from '@/application/use-cases/auth/get-profile.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../decorators/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiRegister,
  ApiLogin,
  ApiGetProfile,
} from '../decorators/swagger/auth.swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private registerUseCase: RegisterUseCase,
    private getProfileUseCase: GetProfileUseCase,
  ) {}

  @Post('register')
  @ApiRegister()
  async register(@Headers('authorization') authHeader: string) {
    const authToken = this.extractToken(authHeader);
    return this.registerUseCase.execute(authToken);
  }

  @Post('login')
  @ApiLogin()
  async login(@Headers('authorization') authHeader: string) {
    const authToken = this.extractToken(authHeader);
    return this.loginUseCase.execute(authToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiGetProfile()
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.getProfileUseCase.execute(user.userId);
  }

  private extractToken(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    return authHeader.substring(7);
  }
}
