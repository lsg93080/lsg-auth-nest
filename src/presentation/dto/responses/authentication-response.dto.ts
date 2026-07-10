import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class AuthenticationResponseDto {
  @ApiProperty({
    description: 'JWT access token issued by the server',
  })
  access_token: string;

  @ApiProperty({
    example: false,
    description: 'Indicates if the user was created during this authentication',
  })
  isNewUser: boolean;

  @ApiProperty({
    type: UserResponseDto,
  })
  user: UserResponseDto;
}
