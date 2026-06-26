#!/bin/sh
set -e
# Run migrations when DATABASE_URL is set (e.g. in Docker)
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npm run db:migrate || true
fi
exec node dist/server.js
