#!/usr/bin/env sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
self_host_dir="$(dirname "$script_dir")"
stamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$self_host_dir/backups"
backup_file="$backup_dir/te-pinta-${stamp}.sql"

mkdir -p "$backup_dir"

docker compose -f "$self_host_dir/compose.yml" --env-file "$self_host_dir/.env" exec -T postgres \
  pg_dump -U te_pinta -d te_pinta --clean --if-exists > "$backup_file"

echo "Backup creado: $backup_file"
