import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from '@/application/application.module';
import { PresentationModule } from '@/presentation/presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ApplicationModule,
    PresentationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
