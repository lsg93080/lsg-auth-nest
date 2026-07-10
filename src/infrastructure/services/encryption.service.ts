import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IEncryptionService } from '@/domain/services/encryption.service.interface';

// AES-256-GCM: authenticated encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENCODING = 'hex';

@Injectable()
export class EncryptionService implements IEncryptionService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const hexKey = configService.get<string>('ENCRYPTION_KEY');

    if (!hexKey) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }

    if (hexKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes for AES-256)',
      );
    }

    this.key = Buffer.from(hexKey, ENCODING);
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (all hex)
    return [
      iv.toString(ENCODING),
      authTag.toString(ENCODING),
      encrypted.toString(ENCODING),
    ].join(':');
  }

  decrypt(cipherText: string): string {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid cipher text format');
    }

    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const encrypted = Buffer.from(encryptedHex, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
