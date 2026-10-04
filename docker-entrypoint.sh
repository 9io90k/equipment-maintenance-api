#!/bin/sh
set -e

echo "[entrypoint] Checking database availability and applying migrations..."
npx sequelize-cli db:migrate

echo "[entrypoint] Applying demo seeders if needed..."
npx sequelize-cli db:seed:all || echo "[entrypoint] Seeders already applied or skipped."

echo "[entrypoint] Launching application..."
exec "$@"
