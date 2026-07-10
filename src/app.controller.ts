import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  getHealth() {
    const dbState = this.connection.readyState;
    const dbStatus =
      dbState === ConnectionStates.connected
        ? 'connected'
        : dbState === ConnectionStates.connecting
          ? 'connecting'
          : 'disconnected';

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'Auth Service',
      database: dbStatus,
    };
  }
}
