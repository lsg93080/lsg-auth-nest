export interface DecodedToken {
  uid: string;
  email: string;
  name?: string;
  email_verified?: boolean;
}

export interface IAuthProvider {
  verifyToken(token: string): Promise<DecodedToken>;
  revokeToken?(uid: string): Promise<void>;
  createCustomToken?(uid: string, claims?: object): Promise<string>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
