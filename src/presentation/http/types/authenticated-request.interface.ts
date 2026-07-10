import { Request } from 'express';

export interface CurrentUserData {
  userId: string;
  email: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: CurrentUserData;
}
