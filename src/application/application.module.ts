import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoginUseCase } from './use-cases/auth/login.use-case';
import { RegisterUseCase } from './use-cases/auth/register.use-case';
import { GetProfileUseCase } from './use-cases/auth/get-profile.use-case';
import { GrantDeveloperRoleUseCase } from './use-cases/roles/grant-developer-role.use-case';
import { AddRoleUseCase } from './use-cases/roles/add-role.use-case';
import { RemoveRoleUseCase } from './use-cases/roles/remove-role.use-case';
import { ValidateTokenUseCase } from './use-cases/auth/validate-token.use-case';
import { GetGitLabAuthorizationUrlUseCase } from './use-cases/oauth/get-gitlab-authorization-url.use-case';
import { HandleGitLabCallbackUseCase } from './use-cases/oauth/handle-gitlab-callback.use-case';
import { GetGitHubAuthorizationUrlUseCase } from './use-cases/oauth/get-github-authorization-url.use-case';
import { HandleGitHubCallbackUseCase } from './use-cases/oauth/handle-github-callback.use-case';
import { GetOAuthConnectionsUseCase } from './use-cases/oauth/get-oauth-connections.use-case';
import { GetOAuthTokenUseCase } from './use-cases/oauth/get-oauth-token.use-case';
import { VerifyGitLabRepoOwnershipUseCase } from './use-cases/oauth/verify-gitlab-repo-ownership.use-case';
import { DeleteOAuthConnectionUseCase } from './use-cases/oauth/delete-oauth-connection.use-case';
import { DeleteOAuthConnectionByProviderUseCase } from './use-cases/oauth/delete-oauth-connection-by-provider.use-case';

@Module({
  imports: [
    InfrastructureModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '2h', // Token expires in 2 hours
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    LoginUseCase,
    RegisterUseCase,
    GetProfileUseCase,
    GrantDeveloperRoleUseCase,
    AddRoleUseCase,
    RemoveRoleUseCase,
    ValidateTokenUseCase,
    // OAuth
    GetGitLabAuthorizationUrlUseCase,
    HandleGitLabCallbackUseCase,
    GetGitHubAuthorizationUrlUseCase,
    HandleGitHubCallbackUseCase,
    GetOAuthConnectionsUseCase,
    GetOAuthTokenUseCase,
    VerifyGitLabRepoOwnershipUseCase,
    DeleteOAuthConnectionUseCase,
    DeleteOAuthConnectionByProviderUseCase,
  ],
  exports: [
    LoginUseCase,
    RegisterUseCase,
    GetProfileUseCase,
    GrantDeveloperRoleUseCase,
    AddRoleUseCase,
    RemoveRoleUseCase,
    ValidateTokenUseCase,
    // OAuth
    GetGitLabAuthorizationUrlUseCase,
    HandleGitLabCallbackUseCase,
    GetGitHubAuthorizationUrlUseCase,
    HandleGitHubCallbackUseCase,
    GetOAuthConnectionsUseCase,
    GetOAuthTokenUseCase,
    VerifyGitLabRepoOwnershipUseCase,
    DeleteOAuthConnectionUseCase,
    DeleteOAuthConnectionByProviderUseCase,
  ],
})
export class ApplicationModule {}
