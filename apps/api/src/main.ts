import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { TransformInterceptor } from './common/transform.interceptor';
import { getAllowedOrigins } from './common/helpers';

// @nestjs/platform-fastify mishandles handler errors thrown before the first
// `await` when the request carries a parsed JSON body (the rejection escapes
// Nest's router and becomes an unhandled rejection). Without these guards a
// single bad request would take the whole API down. Log and continue instead.
process.on('unhandledRejection', (reason, promise) => {
  const message =
    reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason);
  console.error('[lifecycle] Unhandled promise rejection:', message);
  console.error('[lifecycle] Promise:', promise);
});
process.on('uncaughtException', (error) => {
  console.error('[lifecycle] Uncaught exception:', error?.stack || error);
});

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'doloyal-jwt-secret-dev' || jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set to a strong random secret (>= 32 chars) in production.',
      );
    }
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, bodyLimit: 15 * 1024 * 1024 }),
  );

  await app.register(multipart as any, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1,
    },
  });

  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  const port = parseInt(process.env.API_PORT || '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Doloyal API running on http://localhost:${port}`);
  if (isProduction) {
    console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
  }
}

bootstrap();
