import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from '@/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

let port: number;
const globalPrefix = 'api/v1';

function validateEnvironment(): void {
  port = parseInt(process.env.PORT ?? '3000', 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(
      '.env file: PORT must be a valid number between 1 and 65535',
    );
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('.env file: MONGODB_URI is not defined');
  }
}

function logStartup(): void {
  const logger = new Logger('Bootstrap');
  logger.verbose(`Application is running on port ${port}`);
  logger.verbose(
    `MongoDB URI: ${process.env.MONGODB_URI!.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`,
  );
  logger.verbose(`Swagger docs available at: ${globalPrefix}/docs`);
}

async function bootstrap(): Promise<void> {
  validateEnvironment();
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'AuthService',
    }),
  });

  app.setGlobalPrefix(globalPrefix);

  // Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
  app.use(helmet());

  // Enable CORS, origins configurable via CORS_ORIGINS (comma-separated, 12-Factor)
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3007'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key', 'Accept'],
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration (disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Auth Service API')
      .setDescription(
        `
Authentication and authorization service for LifeSync Games

Features:
- JWT-based authentication
- Role-based access control (RBAC)
- API key support for internal services
- Admin user management

All protected endpoints require a Bearer JWT token.

Authorization header format:
Authorization: Bearer <access_token>
      `,
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token from /auth/login or /auth/register',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'API key for internal service-to-service communication',
        },
        'API-key',
      )
      .addTag('Auth', 'Authentication endpoints (register, login, profile)')
      .addTag('Users', 'User management endpoints (admin only)')
      .addTag('Internal', 'Internal service-to-service endpoints')
      .addTag('OAuth', 'OAuth provider connections (GitLab, GitHub)')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
    });
    SwaggerModule.setup(globalPrefix + '/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'Auth Service API Docs',
    });
  }

  await app.listen(port);
  logStartup();
}

bootstrap().catch((err) => {
  console.error(
    `Bootstrap error: ${err instanceof Error ? err.message : 'Unknown error'}`,
  );
  process.exit(1);
});
