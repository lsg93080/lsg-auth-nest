export class AuthenticationResponseDto {
  access_token: string;
  isNewUser: boolean;
  user: {
    id: string;
    email: string;
    displayName?: string;
    roles: string[];
  };
}
