import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GrantDeveloperRoleUseCase } from '@/application/use-cases/roles/grant-developer-role.use-case';
import { GrantDeveloperRoleDto } from '@/application/dto/internal/grant-developer-role.dto';
import { ApiTags } from '@nestjs/swagger';
import { GetProfileUseCase } from '@/application/use-cases/auth/get-profile.use-case';
import {
  ApiGrantDeveloper,
  ApiValidateToken,
  ApiGetOAuthToken,
  ApiDeleteOAuthConnection,
} from '../decorators/swagger/internal.swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ValidateTokenUseCase } from '@/application/use-cases/auth/validate-token.use-case';
import { ValidateTokenDto } from '@/application/dto/internal/validate-token.dto';
import { GetOAuthTokenUseCase } from '@/application/use-cases/oauth/get-oauth-token.use-case';
import { DeleteOAuthConnectionByProviderUseCase } from '@/application/use-cases/oauth/delete-oauth-connection-by-provider.use-case';
import { DeleteOAuthConnectionInternalDto } from '@/application/dto/internal/delete-oauth-connection.dto';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

@ApiTags('Internal')
@UseGuards(ApiKeyGuard)
@Controller('internal')
export class InternalController {
  constructor(
    private grantDeveloperRoleUseCase: GrantDeveloperRoleUseCase,
    private validateTokenUseCase: ValidateTokenUseCase,
    private getProfileUseCase: GetProfileUseCase,
    private getOAuthTokenUseCase: GetOAuthTokenUseCase,
    private deleteOAuthConnectionByProviderUseCase: DeleteOAuthConnectionByProviderUseCase,
  ) {}

  @Post('grant-developer')
  @HttpCode(HttpStatus.OK)
  @ApiGrantDeveloper()
  async grantDeveloperRole(@Body() body: GrantDeveloperRoleDto) {
    return this.grantDeveloperRoleUseCase.execute(body.userId);
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @ApiValidateToken()
  async validateToken(@Body() body: ValidateTokenDto) {
    // 1: Validate JWT signature and expiration
    const tokenResult = this.validateTokenUseCase.execute(body.token);

    if (!tokenResult.valid) {
      return { valid: false };
    }

    // 2: Fetch current user data from database
    try {
      const user = await this.getProfileUseCase.execute(tokenResult.userId!);

      // 3: Return current user data
      return {
        valid: true,
        userId: user.id,
        email: user.email,
        roles: user.roles,
      };
    } catch {
      // User not found or inactive
      return { valid: false };
    }
  }

  @Get('oauth/token')
  @ApiGetOAuthToken()
  getOAuthToken(
    @Query('userId') userId: string,
    @Query('provider') provider: OAuthProvider,
  ) {
    return this.getOAuthTokenUseCase.execute({ userId, provider });
  }

  @Delete('oauth/connection')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteOAuthConnection()
  deleteOAuthConnection(@Body() body: DeleteOAuthConnectionInternalDto) {
    return this.deleteOAuthConnectionByProviderUseCase.execute({
      userId: body.userId,
      provider: body.provider,
    });
  }
}
