import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import {
  OAuthConnection,
  OAuthConnectionSchema,
} from './schemas/oauth-connection.schema';
import { MongoUserRepository } from './repositories/mongo-user.repository';
import { MongoOAuthConnectionRepository } from './repositories/mongo-oauth-connection.repository';
import { USER_REPOSITORY } from '@/domain/repositories/user.repository.interface';
import { OAUTH_CONNECTION_REPOSITORY } from '@/domain/repositories/oauth-connection.repository.interface';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OAuthConnection.name, schema: OAuthConnectionSchema },
    ]),
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: MongoUserRepository,
    },
    {
      provide: OAUTH_CONNECTION_REPOSITORY,
      useClass: MongoOAuthConnectionRepository,
    },
  ],
  exports: [USER_REPOSITORY, OAUTH_CONNECTION_REPOSITORY],
})
export class MongoDbModule {}
