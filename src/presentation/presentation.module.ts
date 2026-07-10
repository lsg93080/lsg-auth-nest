import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApplicationModule } from '../application/application.module';
import { AuthController } from './http/controllers/auth.controller';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { AuthProviderModule } from '@/infrastructure/auth-provider/auth-provider.module';
import { OAuthController } from './http/controllers/oauth.controller';
import { JwtStrategy } from './http/strategies/jwt.strategy';
import { JwtAuthGuard } from './http/guards/jwt-auth.guard';
import { RolesGuard } from '@/presentation/http/guards/roles.guard';
import { UsersController } from './http/controllers/users.controller';
import { InternalController } from './http/controllers/internal.controller';

@Module({
  imports: [
    PassportModule,
    ApplicationModule,
    DatabaseModule,
    AuthProviderModule,
  ],
  controllers: [
    AuthController,
    UsersController,
    InternalController,
    OAuthController,
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class PresentationModule {}
