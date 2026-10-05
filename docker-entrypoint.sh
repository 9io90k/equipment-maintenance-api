#!/bin/sh
set -e

DB_HOST_VAL="${PGHOST:-${DB_HOST:-db}}"
DB_PORT_VAL="${PGPORT:-${DB_PORT:-5432}}"

echo "[entrypoint] Waiting for PostgreSQL at ${DB_HOST_VAL}:${DB_PORT_VAL}..."
while ! nc -z "$DB_HOST_VAL" "$DB_PORT_VAL"; do
  sleep 1
done
echo "[entrypoint] PostgreSQL port is open."

echo "[entrypoint] Applying database migrations..."
npx sequelize-cli db:migrate

if [ "${RUN_SEEDS:-true}" = "true" ]; then
  echo "[entrypoint] Applying demo seeders..."
  npx sequelize-cli db:seed:all || echo "[entrypoint] Seeders already applied or skipped."
else
  echo "[entrypoint] Demo seeders skipped (RUN_SEEDS=${RUN_SEEDS})."
fi

echo "[entrypoint] Launching application..."
exec "$@"
