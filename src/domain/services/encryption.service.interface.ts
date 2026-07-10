export interface IEncryptionService {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}

export const ENCRYPTION_SERVICE = Symbol('ENCRYPTION_SERVICE');
