#!/usr/bin/env node
/**
 * Ensures PostgreSQL is reachable at DATABASE_URL.
 * Order: existing process → docker compose → detached embedded-postgres daemon.
 */
import fs from "fs";
import path from "path";
import net from "net";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, ".data", "postgres");
const DAEMON_PID = path.join(ROOT, ".data", "embedded-pg.daemon.pid");
const DAEMON_LOG = path.join(ROOT, ".data", "embedded-pg.daemon.log");
const DEFAULT_URL = "postgresql://postgres:postgres@localhost:5432/doloyal?schema=public";

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function parseUrl(url) {
  const u = new URL(url.replace(/^postgresql:/, "http:"));
  return {
    host: u.hostname || "localhost",
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || "postgres"),
    database: (u.pathname || "/doloyal").replace(/^\//, "").split("?")[0] || "doloyal",
  };
}

function portOpen(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      try {
        socket.destroy();
      } catch {}
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

async function waitForPort(host, port, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    if (await portOpen(host, port, 1000)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function tryDockerCompose(cfg) {
  return new Promise((resolve) => {
    const child = spawn("docker", ["compose", "up", "-d", "postgres"], {
      cwd: ROOT,
      stdio: "ignore",
    });
    child.on("error", () => resolve(false));
    child.on("exit", async (code) => {
      if (code !== 0) return resolve(false);
      resolve(await waitForPort(cfg.host, cfg.port));
    });
  });
}

function spawnDaemon(cfg) {
  fs.mkdirSync(path.dirname(DAEMON_LOG), { recursive: true });
  const out = fs.openSync(DAEMON_LOG, "a");
  const child = spawn(
    process.execPath,
    [path.join(__dirname, "embedded-pg-daemon.mjs")],
    {
      cwd: ROOT,
      detached: true,
      stdio: ["ignore", out, out],
      env: {
        ...process.env,
        DOLOYAL_PG_PORT: String(cfg.port),
        DOLOYAL_PG_USER: cfg.user,
        DOLOYAL_PG_PASSWORD: cfg.password,
        DOLOYAL_PG_DATABASE: cfg.database,
        DOLOYAL_PG_DATA: DATA_DIR,
      },
    },
  );
  child.unref();
  fs.writeFileSync(DAEMON_PID, String(child.pid));
  return child.pid;
}

async function main() {
  const env = loadEnv();
  const url = process.env.DATABASE_URL || env.DATABASE_URL || DEFAULT_URL;
  const cfg = parseUrl(url);

  if (await portOpen(cfg.host, cfg.port)) {
    console.log(`[doloyal] PostgreSQL already reachable at ${cfg.host}:${cfg.port}`);
    process.exit(0);
  }

  console.log(`[doloyal] No PostgreSQL on ${cfg.host}:${cfg.port}`);

  if (await tryDockerCompose(cfg)) {
    console.log("[doloyal] Started Postgres via docker compose");
    process.exit(0);
  }

  try {
    // Kill stale daemon pid file if process is gone
    if (fs.existsSync(DAEMON_PID)) {
      const oldPid = Number(fs.readFileSync(DAEMON_PID, "utf8").trim());
      try {
        process.kill(oldPid, 0);
      } catch {
        fs.unlinkSync(DAEMON_PID);
      }
    }

    const pid = spawnDaemon(cfg);
    console.log(`[doloyal] Started embedded Postgres daemon (pid ${pid})`);
    if (!(await waitForPort(cfg.host, cfg.port, 60))) {
      throw new Error("Embedded Postgres daemon started but port never opened");
    }
    console.log("[doloyal] Embedded PostgreSQL is ready");
    process.exit(0);
  } catch (e) {
    console.error("[doloyal] Failed to start PostgreSQL:", e?.message || e);
    console.error(
      "Install Docker Desktop and run: docker compose up -d postgres\n" +
        "Or install Postgres and set DATABASE_URL in .env",
    );
    process.exit(1);
  }
}

main();
