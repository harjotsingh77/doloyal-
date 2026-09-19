import 'reflect-metadata';
import { createApp } from './create-app';
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
  const app = await createApp();
  const isProduction = process.env.NODE_ENV === 'production';

  // Managed hosts inject the port to bind as `PORT`. `API_PORT` stays
  // supported for local `pnpm dev`. The Vercel path never reaches here —
  // `api/index.js` uses init() instead of listen().
  const port = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Doloyal API listening on 0.0.0.0:${port}`);
  if (isProduction) {
    console.log(`CORS origins: ${getAllowedOrigins().join(', ')}`);
  }
}

void bootstrap();
