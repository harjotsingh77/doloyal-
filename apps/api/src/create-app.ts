import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { TransformInterceptor } from './common/transform.interceptor';
import { getAllowedOrigins } from './common/helpers';
import { isLocalhostDatabaseUrl, validateVercelProductionEnv } from './common/production-env';

/**
 * Shared Nest/Fastify bootstrap used by local `app.listen()` and the Vercel
 * serverless handler. Does not bind a port — callers either listen or call
 * `init()` depending on the runtime.
 */
export async function createApp(): Promise<NestFastifyApplication> {
  const isProduction = process.env.NODE_ENV === 'production';
  const onVercel = Boolean(process.env.VERCEL);

  // Vercel copies of local .env often set NODE_ENV=development. Auth and JWT
  // rules must still follow the hosting environment.
  if (onVercel || isProduction) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'doloyal-jwt-secret-dev' || jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set to a strong random secret (>= 32 chars) in production.',
      );
    }
  }

  if (onVercel) {
    try {
      validateVercelProductionEnv();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[boot] production database env is invalid:', message);
      // Localhost is a known misconfig: keep the function alive so /health and
      // /auth/* can return DATABASE_UNAVAILABLE instead of a boot crash.
      if (!isLocalhostDatabaseUrl(process.env.DATABASE_URL || '')) {
        throw err;
      }
    }
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      bodyLimit: 45 * 1024 * 1024,
      trustProxy: isProduction,
    }),
    { rawBody: true },
  );

  await app.register(multipart as any, {
    limits: {
      fileSize: 40 * 1024 * 1024,
      files: 2,
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

  app.enableShutdownHooks();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  return app;
}
