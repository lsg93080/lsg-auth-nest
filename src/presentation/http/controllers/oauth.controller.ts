import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  Redirect,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../types/authenticated-request.interface';
import { GetGitLabAuthorizationUrlUseCase } from '@/application/use-cases/oauth/get-gitlab-authorization-url.use-case';
import { HandleGitLabCallbackUseCase } from '@/application/use-cases/oauth/handle-gitlab-callback.use-case';
import { GetGitHubAuthorizationUrlUseCase } from '@/application/use-cases/oauth/get-github-authorization-url.use-case';
import { HandleGitHubCallbackUseCase } from '@/application/use-cases/oauth/handle-github-callback.use-case';
import { GetOAuthConnectionsUseCase } from '@/application/use-cases/oauth/get-oauth-connections.use-case';
import { VerifyGitLabRepoOwnershipUseCase } from '@/application/use-cases/oauth/verify-gitlab-repo-ownership.use-case';
import { DeleteOAuthConnectionUseCase } from '@/application/use-cases/oauth/delete-oauth-connection.use-case';
import {
  ApiGitLabAuthorize,
  ApiGitLabCallback,
  ApiGitHubAuthorize,
  ApiGitHubCallback,
  ApiGetOAuthConnections,
  ApiVerifyGitLabRepoOwnership,
  ApiDeleteOAuthConnection,
} from '../decorators/swagger/oauth.swagger';
import { decodeOAuthState } from '@/application/utils/oauth-state.util';

// Default safe redirect when the redirectUrl is invalid or not whitelisted
const DEFAULT_REDIRECT = '/vitrina/';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);
  private readonly allowedOrigins: string[];
  private readonly hmacKey: string;

  constructor(
    private getGitLabAuthorizationUrlUseCase: GetGitLabAuthorizationUrlUseCase,
    private handleGitLabCallbackUseCase: HandleGitLabCallbackUseCase,
    private getGitHubAuthorizationUrlUseCase: GetGitHubAuthorizationUrlUseCase,
    private handleGitHubCallbackUseCase: HandleGitHubCallbackUseCase,
    private getOAuthConnectionsUseCase: GetOAuthConnectionsUseCase,
    private verifyGitLabRepoOwnershipUseCase: VerifyGitLabRepoOwnershipUseCase,
    private deleteOAuthConnectionUseCase: DeleteOAuthConnectionUseCase,
    configService: ConfigService,
  ) {
    this.hmacKey = configService.get<string>('ENCRYPTION_KEY')!;

    const originsEnv = configService.get<string>('ALLOWED_REDIRECT_ORIGINS');
    this.allowedOrigins = originsEnv
      ? originsEnv.split(',').map((o) => o.trim())
      : ['http://localhost', 'http://localhost:80'];
  }

  @Get('gitlab/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiGitLabAuthorize()
  getGitLabAuthorizationUrl(
    @CurrentUser() user: CurrentUserData,
    @Query('redirect_url') redirectUrl: string,
  ) {
    if (!redirectUrl) {
      throw new BadRequestException('redirect_url query parameter is required');
    }

    return this.getGitLabAuthorizationUrlUseCase.execute({
      userId: user.userId,
      redirectUrl,
    });
  }

  @Get('gitlab/callback')
  @Redirect()
  @ApiGitLabCallback()
  async handleGitLabCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ) {
    // GitLab sends error query param when user denies authorization
    if (error) {
      const redirectUrl = this.extractRedirectUrlFromState(state);
      return { url: this.appendParams(redirectUrl, { error }) };
    }

    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    try {
      const result = await this.handleGitLabCallbackUseCase.execute({
        code,
        state,
      });

      const safeRedirectUrl = this.validateRedirectUrl(result.redirectUrl);

      return {
        url: this.appendParams(safeRedirectUrl, {
          success: 'true',
          new_connection: String(result.isNewConnection),
        }),
      };
    } catch (err) {
      this.logger.error('GitLab OAuth callback failed', err);
      const redirectUrl = this.extractRedirectUrlFromState(state);
      return {
        url: this.appendParams(redirectUrl, { error: 'oauth_failed' }),
      };
    }
  }

  @Get('github/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiGitHubAuthorize()
  getGitHubAuthorizationUrl(
    @CurrentUser() user: CurrentUserData,
    @Query('redirect_url') redirectUrl: string,
  ) {
    if (!redirectUrl) {
      throw new BadRequestException('redirect_url query parameter is required');
    }

    return this.getGitHubAuthorizationUrlUseCase.execute({
      userId: user.userId,
      redirectUrl,
    });
  }

  @Get('github/callback')
  @Redirect()
  @ApiGitHubCallback()
  async handleGitHubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ) {
    // GitHub sends error query param when user denies authorization
    if (error) {
      const redirectUrl = this.extractRedirectUrlFromState(state);
      return { url: this.appendParams(redirectUrl, { error }) };
    }

    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    try {
      const result = await this.handleGitHubCallbackUseCase.execute({
        code,
        state,
      });

      const safeRedirectUrl = this.validateRedirectUrl(result.redirectUrl);

      return {
        url: this.appendParams(safeRedirectUrl, {
          success: 'true',
          new_connection: String(result.isNewConnection),
        }),
      };
    } catch (err) {
      this.logger.error('GitHub OAuth callback failed', err);
      const redirectUrl = this.extractRedirectUrlFromState(state);
      return {
        url: this.appendParams(redirectUrl, { error: 'oauth_failed' }),
      };
    }
  }

  @Get('connections')
  @UseGuards(JwtAuthGuard)
  @ApiGetOAuthConnections()
  getConnections(@CurrentUser() user: CurrentUserData) {
    return this.getOAuthConnectionsUseCase.execute(user.userId);
  }

  @Get('gitlab/verify/:repoId')
  @UseGuards(JwtAuthGuard)
  @ApiVerifyGitLabRepoOwnership()
  verifyGitLabRepoOwnership(
    @CurrentUser() user: CurrentUserData,
    @Param('repoId', ParseIntPipe) repoId: number,
  ) {
    return this.verifyGitLabRepoOwnershipUseCase.execute({
      userId: user.userId,
      repoId,
    });
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiDeleteOAuthConnection()
  deleteConnection(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<void> {
    return this.deleteOAuthConnectionUseCase.execute(id, user.userId);
  }

  // Validates that a redirect URL belongs to an allowed origin, falling back to DEFAULT_REDIRECT.
  private validateRedirectUrl(url: string): string {
    // Allow relative URLs (they stay on the same origin)
    if (url.startsWith('/')) {
      return url;
    }

    // Check against allowed origins
    const isAllowed = this.allowedOrigins.some((origin) =>
      url.startsWith(origin),
    );

    if (!isAllowed) {
      this.logger.warn(`Blocked redirect to non-whitelisted URL: ${url}`);
      return DEFAULT_REDIRECT;
    }

    return url;
  }

  // Extracts and validates redirectUrl from state for error redirects, falling back to a safe default.
  private extractRedirectUrlFromState(state: string): string {
    try {
      const decoded = decodeOAuthState(state, this.hmacKey);
      return this.validateRedirectUrl(decoded.redirectUrl);
    } catch {
      return DEFAULT_REDIRECT;
    }
  }

  // Appends query params to a URL, handling relative URLs like '/' via a temporary base origin.
  private appendParams(
    baseUrl: string,
    params: Record<string, string>,
  ): string {
    const DUMMY = 'http://x';
    const isRelative = !baseUrl.startsWith('http');
    const url = new URL(baseUrl, isRelative ? DUMMY : undefined);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return isRelative ? url.pathname + url.search : url.toString();
  }
}
