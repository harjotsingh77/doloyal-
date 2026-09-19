import 'reflect-metadata';

/**
 * Vercel Node serverless entry (`@vercel/node`).
 *
 * `vercel.json` routes every request here. NestJS is compiled by the API
 * `build` script (`tsc -b`) before this file is packaged, so we import the
 * compiled handler. That preserves decorator metadata that Vercel's bundler
 * would otherwise drop.
 */
import handler from '../dist/vercel-handler';

export default handler;
