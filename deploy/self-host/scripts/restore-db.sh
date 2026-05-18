#!/usr/bin/env sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
self_host_dir="$(dirname "$script_dir")"

if [ "${1:-}" = "" ]; then
  echo "Uso: $0 deploy/self-host/backups/archivo.sql" >&2
  exit 1
fi

backup_file="$1"

if [ ! -f "$backup_file" ]; then
  echo "No existe el backup: $backup_file" >&2
  exit 1
fi

cat "$backup_file" | docker compose -f "$self_host_dir/compose.yml" --env-file "$self_host_dir/.env" exec -T postgres \
  psql -U te_pinta -d te_pinta

echo "Restore completado desde: $backup_file"
