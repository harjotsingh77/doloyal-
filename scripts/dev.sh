#!/usr/bin/env bash
# Stable local dev: raises file-descriptor limit (prevents Watchpack EMFILE /
# corrupted Next.js chunks) then starts the monorepo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# macOS default soft limit is often 256 — far too low for Next + Nest watchers.
TARGET_FD="${DOLOYAL_ULIMIT:-65536}"
if ulimit -n "$TARGET_FD" 2>/dev/null; then
  echo "[doloyal] ulimit -n $(ulimit -n)"
else
  echo "[doloyal] warning: could not raise ulimit -n (current: $(ulimit -n))"
fi

# Ensure PostgreSQL is up before API boots (Docker or embedded fallback)
node "$ROOT/scripts/ensure-postgres.mjs" || {
  echo "[doloyal] error: database is required. Fix DATABASE_URL or install Docker/Postgres."
  exit 1
}

# A leftover Next.js on :3000 sharing .next with a new `next dev` produces
# 404s for error.js / global-error.js ("missing required error components").
if lsof -nP -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[doloyal] stopping leftover process on port 3000"
  lsof -nP -tiTCP:3000 -sTCP:LISTEN | xargs kill 2>/dev/null || true
  sleep 1
fi

# Always purge stale Next.js server chunks to prevent MODULE_NOT_FOUND errors.
# Webpack chunk IDs (e.g. 3867.js) can drift between restarts; removing the
# server cache forces a clean recompile and costs only ~1-2s on startup.
echo "[doloyal] clearing stale .next cache"
rm -rf "$ROOT/apps/web/.next"

if [[ "${DOLOYAL_CLEAN:-}" == "1" ]]; then
  echo "[doloyal] full clean: clearing .next and apps/api/dist"
  rm -rf "$ROOT/apps/web/.next" "$ROOT/apps/api/dist"
fi

exec pnpm exec turbo run dev --parallel
