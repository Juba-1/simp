#!/usr/bin/env bash
# SIMP Platform — clean dev restart (macOS/Linux)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"

echo "==> Stopping dev servers on ports 3000 and 3001..."
for port in 3000 3001; do
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:"$port" | xargs -r kill -9 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "$port/tcp" 2>/dev/null || true
  fi
done

echo "==> Flushing build caches..."
rm -rf "$ROOT/dist" "$ROOT/tsconfig.tsbuildinfo" "$FRONTEND/.next" "$FRONTEND/tsconfig.tsbuildinfo" "$FRONTEND/out"

echo "==> Starting NestJS (port 3000)..."
(cd "$ROOT" && npm run start:dev) &
sleep 2
echo "==> Starting Next.js (port 3001)..."
(cd "$FRONTEND" && npm run dev) &

echo ""
echo "Dev stack starting."
echo "  API:      http://localhost:3000"
echo "  Frontend: http://localhost:3001"
