import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import {
  DecodedToken,
  IAuthProvider,
} from '@/domain/services/auth-provider.interface';

@Injectable()
export class FirebaseAuthProvider implements IAuthProvider, OnModuleInit {
  private app: admin.app.App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(this.getServiceAccount()),
      });
    } else {
      this.app = admin.app();
    }
  }

  // Reads credentials from env vars since a checked-in service account file would be absent in CI.
  private getServiceAccount(): admin.ServiceAccount {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be defined in environment variables',
      );
    }

    return {
      projectId,
      clientEmail,
      // Restores the literal newlines that .env files can't hold directly.
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  async verifyToken(token: string): Promise<DecodedToken> {
    try {
      const decodedToken = await this.app.auth().verifyIdToken(token);

      if (!decodedToken.email) {
        throw new UnauthorizedException('User must have an email address');
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name as string | undefined,
        email_verified: decodedToken.email_verified,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
  async createCustomToken(uid: string, claims?: object): Promise<string> {
    return this.app.auth().createCustomToken(uid, claims);
  }

  async revokeToken(uid: string): Promise<void> {
    await this.app.auth().revokeRefreshTokens(uid);
  }
}
