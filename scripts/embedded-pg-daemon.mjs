#!/usr/bin/env node
/**
 * Long-running process that keeps embedded-postgres alive.
 * Started detached by ensure-postgres.mjs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DATA_DIR = process.env.DOLOYAL_PG_DATA || path.join(ROOT, ".data", "postgres");
const port = Number(process.env.DOLOYAL_PG_PORT || 5432);
const user = process.env.DOLOYAL_PG_USER || "postgres";
const password = process.env.DOLOYAL_PG_PASSWORD || "postgres";
const database = process.env.DOLOYAL_PG_DATABASE || "doloyal";

async function main() {
  const mod = await import("embedded-postgres");
  const EmbeddedPostgres = mod.default || mod.EmbeddedPostgres || mod;
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user,
    password,
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  const initMarker = path.join(DATA_DIR, "PG_VERSION");
  if (!fs.existsSync(initMarker)) {
    console.log("[embedded-pg] initialise…");
    await pg.initialise();
  }

  console.log(`[embedded-pg] start on :${port}`);
  await pg.start();

  try {
    await pg.createDatabase(database);
    console.log(`[embedded-pg] database ${database} ready`);
  } catch (e) {
    if (!/already exists/i.test(String(e?.message || e))) {
      console.warn("[embedded-pg] createDatabase:", e?.message || e);
    }
  }

  const keepAlive = () => {
    // Stay alive forever so async-exit-hook does not stop postgres.
  };
  setInterval(keepAlive, 60_000);

  const shutdown = async (signal) => {
    console.log(`[embedded-pg] ${signal} — stopping`);
    try {
      await pg.stop();
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error("[embedded-pg] fatal:", e);
  process.exit(1);
});
