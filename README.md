# Te Pinta 2.0

Sistema interno de gestión para **Te Pinta**, organizado como monorepo TypeScript.

## Stack

- Monorepo: pnpm workspaces y Turborepo
- Web: React 19, Vite y TypeScript
- API: Express 5, TypeScript, Zod y JWT
- Base de datos: PostgreSQL y Drizzle ORM
- Código compartido: schemas, tipos y utilidades en `packages/shared`
- Deploy: Vercel, Render o Docker Compose self-hosted

## Requisitos

- Node.js 24
- pnpm 10.10.0
- PostgreSQL
- Docker y Docker Compose sólo para el entorno self-hosted

## Instalación

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Los ejemplos contienen únicamente valores locales o placeholders. Reemplazalos en cada entorno sin commitear archivos `.env`.

Antes de iniciar el API por primera vez:

```bash
pnpm --filter @te-pinta/api db:migrate
pnpm --filter @te-pinta/api db:seed
```

`db:seed` crea o actualiza el administrador configurado y agrega únicamente settings faltantes. No reemplaza valores comerciales existentes. Consultá [Operaciones](docs/operations.md) antes de ejecutarlo sobre una base con datos.

## Desarrollo local

```bash
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Comandos

| Comando | Uso |
| --- | --- |
| `pnpm dev` | Inicia los workspaces en modo desarrollo |
| `pnpm lint` | Ejecuta ESLint |
| `pnpm typecheck` | Verifica tipos TypeScript |
| `pnpm test` | Ejecuta los tests una vez |
| `pnpm build` | Compila shared, API y web |

Antes de entregar cambios:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions ejecuta esos controles en cada pull request y push a `main`. El workflow no usa secretos ni despliega.

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| `apps/api` | API Express, acceso a PostgreSQL, migraciones y seed |
| `apps/web` | Aplicación React/Vite |
| `packages/shared` | Schemas Zod, tipos y utilidades compartidas |
| `deploy/self-host` | Dockerfiles, Compose, backups y restore |
| `docs` | Guías operativas y decisiones técnicas |
| `scripts` | Automatización del deploy en notebook |

## Operación y deploy

- [Variables, seed, migraciones, runtime y backups](docs/operations.md)
- [Deploy de prueba con Vercel, Render y Neon](docs/deploy-trial.md)
- [Deploy self-hosted en notebook](docs/self-host-notebook.md)

Self-host rápido:

```bash
cp deploy/self-host/.env.example deploy/self-host/.env
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env build
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env --profile tools run --rm migrate
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env up -d postgres api web
```

No ejecutes imports legacy, restores ni generación de migraciones sin revisar primero la guía operativa.
