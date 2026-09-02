#!/bin/sh
# Applies the app's SQL migrations once the auth schema exists (GoTrue runs its
# own migrations at startup, and our migrations reference auth.users).
set -eu

echo "Waiting for auth.users ..."
i=0
until psql -qtAX -c "select to_regclass('auth.users') is not null" | grep -q '^t$'; do
  i=$((i + 1))
  if [ "$i" -gt 120 ]; then
    echo "auth.users did not appear in time" >&2
    exit 1
  fi
  sleep 2
done

psql -v ON_ERROR_STOP=1 -c "
  CREATE TABLE IF NOT EXISTS public.schema_migrations_app (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  );"

for file in /migrations/*.sql; do
  [ -e "$file" ] || continue
  version=$(basename "$file")
  applied=$(psql -qtAX -c "select 1 from public.schema_migrations_app where version = '$version'")
  if [ "$applied" = "1" ]; then
    echo "skip $version"
    continue
  fi
  echo "apply $version"
  psql -v ON_ERROR_STOP=1 --single-transaction -f "$file"
  psql -v ON_ERROR_STOP=1 -c "insert into public.schema_migrations_app (version) values ('$version')"
done

echo "Migrations up to date."
