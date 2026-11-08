#!/bin/sh
set -e

echo "[*] Initializing NexusPanel API container..."

# Wait for PostgreSQL to accept connections
echo "[*] Verifying database connectivity..."
MAX_TRIES=30
COUNT=1

while [ $COUNT -le $MAX_TRIES ]; do
  if npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
    echo "[✓] Prisma database schema synchronized successfully!"
    break
  fi
  echo "[!] Waiting for database to be ready (attempt $COUNT/$MAX_TRIES)..."
  sleep 2
  COUNT=$((COUNT + 1))
done

if [ $COUNT -gt $MAX_TRIES ]; then
  echo "[WARNING] Could not run prisma db push automatically. Starting API server anyway..."
fi

echo "[*] Starting NexusPanel API Server on port 3000..."
exec node dist/index.js
