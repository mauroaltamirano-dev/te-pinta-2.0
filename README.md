# Te Pinta 2.0

Sistema interno de gestión para el emprendimiento de empanadas **Te Pinta**.

## Stack planificado

- Monorepo: pnpm workspaces + Turborepo
- Web: React 19 + Vite + TypeScript
- API: Express + TypeScript
- Shared: Zod schemas, types and pricing utilities
- DB: PostgreSQL + Drizzle

## Scripts

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Seguridad de entorno

Las credenciales reales van en `.env` y no se commitean. Los ejemplos deben vivir en `.env.example`.

## Self-host en notebook

La configuración para correr **web + API + PostgreSQL** en la notebook vive en:

- `deploy/self-host/compose.yml`
- `deploy/self-host/.env.example`
- `docs/self-host-notebook.md`

Guía rápida:

```bash
cp deploy/self-host/.env.example deploy/self-host/.env
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env build
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env --profile tools run --rm migrate
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env up -d postgres api web
```
