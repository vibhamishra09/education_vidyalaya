// Sentry must be imported and initialized before anything else
import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0,
  environment: process.env.NODE_ENV || 'development',
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { redisClient } from './redis/redis.provider';
import { SentryInterceptor, SentryExceptionFilter } from './common/sentry';
import { LoggerService } from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // So req.ip / protocol / host respect X-Forwarded-* when behind Next.js rewrites or a proxy.
  // Clerk's authenticateRequest builds a URL from these; wrong host can break Bearer validation.
  const expressApp = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
  };
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');

  // Enable CORS
  // Merge environment variable URLs with hardcoded defaults
  const envUrls =
    process.env.FRONTEND_URLS?.split(',')
      .map((url) => url.trim())
      .filter(Boolean) || [];
  const defaultUrls = [
    'https://webyalaya-main-3pav6whkp-debanshu-ghoshs-projects.vercel.app',
    'https://www.webyalaya.com',
    'https://webyalaya.com',
    'https://webyalaya-next.vercel.app',
    'https://test.webyalaya.com',
    'https://test2.webyalaya.com',
    'https://webyalaya-next-test.vercel.app',
    'https://dev.webyalaya.com',
    'https://dev2.webyalaya.com',
    'https://hedera.webyalaya.com',
    'https://webyalaya-green.vercel.app',
    'https://webyalaya-purple.vercel.app',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3007',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3007',
  ];
  // Combine and deduplicate
  const allowedOrigins = [...new Set([...envUrls, ...defaultUrls])];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  logger.log(`🌐 CORS enabled for origins: ${JSON.stringify(allowedOrigins)}`);

  // Sentry error tracking
  app.useGlobalFilters(new SentryExceptionFilter());
  app.useGlobalInterceptors(new SentryInterceptor());
  logger.log('🔍 Sentry error tracking enabled');

  // Enable validation
  // Note: forbidNonWhitelisted is set to false for query params to be more lenient with mobile browsers
  // that may send additional query parameters (e.g., tracking params, browser-specific params)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Changed to false to allow extra query params from mobile browsers
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // Helps with mobile browser query param conversion
      },
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Webyalaya API')
    .setDescription('Peer-to-peer learning platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);

  // Graceful shutdown - disconnect Redis on app close
  app.enableShutdownHooks();
  process.on('SIGINT', async () => {
    await redisClient.quit();
    process.exit(0);
  });
}

bootstrap();
//