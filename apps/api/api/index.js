'use strict';

require('reflect-metadata');

/**
 * Vercel Node serverless entry (`@vercel/node`).
 *
 * Files under `api/` are the only paths `vercel.json` `functions` globs may
 * match. Nest is compiled by `pnpm build` (`tsc -b`) into `dist/` first;
 * this file forwards (req, res) to that handler. Local `pnpm dev` still
 * uses `src/main.ts` + `app.listen()` and never loads this file.
 */
module.exports = require('../dist/vercel-handler.js').default;
