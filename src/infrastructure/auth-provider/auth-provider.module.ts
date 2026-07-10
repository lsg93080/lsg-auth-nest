import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_PROVIDER } from '@/domain/services/auth-provider.interface';
import { FirebaseAuthProvider } from './firebase/firebase-auth.provider';

@Module({
  providers: [
    {
      provide: AUTH_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('AUTH_PROVIDER', 'firebase');

        switch (provider) {
          case 'firebase':
            return new FirebaseAuthProvider(configService);
          default:
            return new FirebaseAuthProvider(configService);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthProviderModule {}
