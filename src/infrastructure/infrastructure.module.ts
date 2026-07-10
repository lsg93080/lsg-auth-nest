import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthProviderModule } from './auth-provider/auth-provider.module';
import { OAuthProvidersModule } from './oauth/oauth-providers.module';
import { ID_GENERATOR } from '@/domain/services/id-generator.interface';
import { ENCRYPTION_SERVICE } from '@/domain/services/encryption.service.interface';
import { UuidIdGenerator } from './services/uuid-id-generator.service';
import { EncryptionService } from './services/encryption.service';

@Module({
  imports: [DatabaseModule, AuthProviderModule, OAuthProvidersModule],
  providers: [
    {
      provide: ID_GENERATOR,
      useClass: UuidIdGenerator,
    },
    {
      provide: ENCRYPTION_SERVICE,
      useClass: EncryptionService,
    },
  ],
  exports: [
    DatabaseModule,
    AuthProviderModule,
    OAuthProvidersModule,
    ID_GENERATOR,
    ENCRYPTION_SERVICE,
  ],
})
export class InfrastructureModule {}
