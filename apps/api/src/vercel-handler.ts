import type { IncomingMessage, ServerResponse } from 'http';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from './create-app';

let appPromise: Promise<NestFastifyApplication> | undefined;

async function getApp(): Promise<NestFastifyApplication> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await createApp();
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      return app;
    })().catch((err) => {
      appPromise = undefined;
      throw err;
    });
  }
  return appPromise;
}

/**
 * Node (req, res) handler for `@vercel/node`. Fastify is not an Express-style
 * `(req, res) => void` function, so requests are forwarded to the underlying
 * Node HTTP server. The promise waits until the response finishes so Vercel
 * does not freeze the invocation early.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await getApp();
  const fastify = app.getHttpAdapter().getInstance();

  await new Promise<void>((resolve, reject) => {
    const done = () => {
      res.off('finish', done);
      res.off('close', done);
      resolve();
    };
    res.on('finish', done);
    res.on('close', done);
    try {
      fastify.server.emit('request', req, res);
    } catch (err) {
      res.off('finish', done);
      res.off('close', done);
      reject(err);
    }
  });
}
