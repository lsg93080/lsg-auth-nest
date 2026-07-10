import { IsEnum, IsUUID } from 'class-validator';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

export class DeleteOAuthConnectionInternalDto {
  @IsUUID('4', { message: 'Invalid format for userId (must be UUID v4)' })
  userId: string;

  @IsEnum(OAuthProvider, { message: 'provider must be gitlab or github' })
  provider: OAuthProvider;
}
