import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { redisClient } from './redis/redis.provider';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  // Merge environment variable URLs with hardcoded defaults
  const envUrls =
    process.env.FRONTEND_URLS?.split(',')
      .map((url) => url.trim())
      .filter(Boolean) || [];
  const defaultUrls = [
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
  ];
  // Combine and deduplicate
  const allowedOrigins = [...new Set([...envUrls, ...defaultUrls])];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  console.log('🌐 CORS enabled for origins:', allowedOrigins);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
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

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);

  // Graceful shutdown - disconnect Redis on app close
  app.enableShutdownHooks();
  process.on('SIGINT', async () => {
    await redisClient.quit();
    process.exit(0);
  });
}

bootstrap();
//