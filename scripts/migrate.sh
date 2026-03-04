#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/migrations"

# Load local .env if present so `pnpm migrate` works without manual export.
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/.env"
  set +a
fi

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"

if [[ -z "${DB_URL}" ]]; then
  echo "Error: DATABASE_URL (or SUPABASE_DB_URL) is required."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is not installed. Install PostgreSQL client tools first."
  exit 1
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Error: migrations directory not found at ${MIGRATIONS_DIR}"
  exit 1
fi

echo "Applying SQL migrations from ${MIGRATIONS_DIR}"

for file in "${MIGRATIONS_DIR}"/*.sql; do
  if [[ -f "${file}" ]]; then
    echo "-> $(basename "${file}")"
    psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${file}"
  fi
done

echo "Migrations complete."
