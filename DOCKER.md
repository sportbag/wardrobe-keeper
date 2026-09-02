# Docker-Setup (App + selbst gehostetes Supabase)

Der komplette Stack läuft über Docker Compose: die TanStack-Start-App (Node-Server)
plus ein selbst gehostetes Supabase-Backend (Postgres, Auth/GoTrue, PostgREST,
Realtime, Storage, Studio, Kong-Gateway).

## Start

```sh
cp .env.docker.example .env.docker
# Passwörter, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY anpassen!
docker compose --env-file .env.docker up -d --build
```

- App: http://localhost:3000
- Supabase-API (Kong): http://localhost:8000
- Supabase Studio: http://localhost:8001

## Wichtig zu den Schlüsseln

`ANON_KEY` und `SERVICE_ROLE_KEY` sind JWTs, die mit **genau** dem `JWT_SECRET`
signiert sein müssen (Payload: `{"role":"anon"|"service_role","iss":"supabase",
"iat":...,"exp":...}`). Neue Schlüssel lassen sich z. B. unter
https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys oder mit
jedem JWT-Tool (HS256) erzeugen. Nach einer Änderung des `ANON_KEY` muss die App
neu gebaut werden (`--build`), da der Wert in das Browser-Bundle einfließt.

## Ablauf beim ersten Start

1. `db` legt Rollen, Schemas (`auth`, `storage`, `_realtime`) und die
   `auth.uid()`-Hilfsfunktionen an (`docker/db/*.sql`).
2. `auth` (GoTrue) migriert das `auth`-Schema.
3. Der Einmal-Job `migrate` wartet auf `auth.users` und spielt alle Dateien aus
   `supabase/migrations/` idempotent ein (Tracking in
   `public.schema_migrations_app`).
4. `app` startet erst, wenn die Migrationen durch sind.

Neue Migrationen einfach nach `supabase/migrations/` legen und
`docker compose --env-file .env.docker up -d migrate app --build` ausführen.

## Hinweise

- Der App-Build nutzt `NITRO_PRESET=node-server`; das Ergebnis läuft unter
  `node .output/server/index.mjs` (kein Cloudflare-Worker).
- Serverseitig spricht die App Kong intern über `http://kong:8000` an, der
  Browser über `SUPABASE_PUBLIC_URL`.
- `MAILER_AUTOCONFIRM=true` bestätigt Registrierungen ohne E-Mail-Versand; für
  echten Betrieb SMTP-Daten setzen und auf `false` stellen.
- Daten liegen in den Volumes `db-data` und `storage-data`.
