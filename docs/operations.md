# Operaciones técnicas

Esta guía concentra configuración, bootstrap, migraciones, runtime, deploy y recuperación. Los comandos que modifican datos deben ejecutarse con backup y sobre el entorno correcto.

## Variables de entorno

Los valores reales viven fuera de Git:

- API local: `apps/api/.env`
- Web local: `apps/web/.env`
- Self-host: `deploy/self-host/.env`
- Vercel y Render: configuración del proveedor

| Variable | Componente | Propósito |
| --- | --- | --- |
| `DATABASE_URL` | API, Drizzle e imports | Conexión PostgreSQL principal |
| `JWT_SECRET` | API | Firma de access tokens, mínimo 32 caracteres |
| `JWT_REFRESH_SECRET` | API | Firma independiente de refresh tokens, mínimo 32 caracteres |
| `ALLOWED_ORIGIN` | API | Origen web autorizado por CORS |
| `ADMIN_EMAIL` | Seed | Email del administrador inicial |
| `ADMIN_PASSWORD` | Seed | Contraseña del administrador, mínimo 8 caracteres |
| `ADMIN_NAME` | Seed | Nombre visible del administrador |
| `PORT` | API | Puerto HTTP, por defecto `3000` |
| `NODE_ENV` | API | `development`, `test` o `production` |
| `VITE_API_URL` | Web | Base pública del API, debe terminar en `/api/v1` |
| `POSTGRES_PASSWORD` | Self-host | Password del PostgreSQL de Compose |
| `POSTGRES_BIND_ADDRESS` | Self-host | Interfaz donde se publica PostgreSQL; usar loopback salvo necesidad explícita |
| `POSTGRES_PORT` | Self-host | Puerto PostgreSQL publicado en el host |
| `CLOUDFLARE_TUNNEL_TOKEN` | Self-host | Token opcional para un túnel administrado |
| `LEGACY_DATABASE_URL` | Import manual | Base legacy leída por `db:import-legacy` |
| `OLD_NEON_DATABASE_URL` | Import manual | Base Neon histórica leída por `db:import-history-map` |
| `NEW_NEON_DATABASE_URL` | Import manual | Base Neon intermedia leída por `db:import-history-map` |

El Compose fija internamente `POSTGRES_DB=te_pinta` y `POSTGRES_USER=te_pinta`. Las tres URLs legacy son opcionales para el API normal y sólo deben configurarse durante una importación controlada.

## Migración, seed y bootstrap

Son operaciones diferentes:

1. `db:migrate` aplica cambios de esquema SQL pendientes.
2. `db:seed` prepara acceso y defaults operativos.
3. Los settings existentes permanecen intactos.
4. El administrador identificado por `ADMIN_EMAIL` se crea o actualiza con `ADMIN_NAME` y un nuevo hash de `ADMIN_PASSWORD`.

El seed usa `ON CONFLICT DO NOTHING` para settings. Por eso agrega claves faltantes, pero no pisa tarifas, promociones ni otros valores comerciales existentes.

Ejecutá el seed:

- al crear una base vacía;
- cuando necesitás crear o rotar el administrador configurado;
- después de una migración que incorpora un setting default nuevo.

No lo ejecutes por rutina si no querés actualizar las credenciales del administrador.

```bash
pnpm --filter @te-pinta/api db:migrate
pnpm --filter @te-pinta/api db:seed
```

## Migraciones Drizzle

Aplicar migraciones existentes:

```bash
pnpm --filter @te-pinta/api db:migrate
```

El comando de generación configurado es:

```bash
pnpm --filter @te-pinta/api db:generate
```

**No generes una migración nueva todavía.** El journal enumera `0000` a `0010`, pero sólo existen snapshots para `0000` y `0001`; además, ambos snapshots comparten identidad y no encadenan los cambios posteriores. Drizzle puede comparar el schema actual contra una fotografía incompleta y producir SQL duplicado, destructivo o inconsistente.

Pendiente antes de volver a usar `db:generate`:

1. respaldar una base representativa;
2. reconciliar snapshots y journal con las migraciones SQL existentes;
3. comprobar que una generación sin cambios produce diff vacío;
4. revisar manualmente todo SQL generado antes de aplicarlo.

No se generaron migraciones durante esta etapa.

## Build y runtime del API

```bash
pnpm --filter @te-pinta/api build
pnpm --filter @te-pinta/api start
```

TypeScript genera el entrypoint en `apps/api/dist/src/server.js`. Producción ejecuta ese JavaScript compilado mediante `tsx`, que resuelve los imports ESM emitidos sin extensión. El código TypeScript de `src/server.ts` queda reservado para `pnpm dev`.

## Deploy

### Web en Vercel

`vercel.json` instala el monorepo, compila `packages/shared` y `apps/web`, publica `apps/web/dist` y redirige rutas SPA a `index.html`.

Configurar:

```text
VITE_API_URL=https://API_PUBLICA/api/v1
```

### API en Render

`render.yaml` compila shared y API, y luego ejecuta el artifact compilado mediante el script `start`.

El servicio free no dispone de pre-deploy command. Por eso las migraciones deben ejecutarse manualmente contra la base destino **antes** de desplegar el commit que las necesita. No se agregó migración automática al arranque porque la metadata Drizzle debe reconciliarse primero.

En un servicio pago, después de reconciliar la metadata, la opción recomendada es:

```yaml
preDeployCommand: npx pnpm@10.10.0 --filter @te-pinta/api db:migrate
```

El seed permanece manual: no debe formar parte de cada arranque.

### Self-host con Docker Compose

El perfil `migrate` aplica migraciones y después ejecuta el seed:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env build
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env --profile tools run --rm migrate
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env up -d postgres api web
```

El script de notebook crea un backup antes de construir y migrar.

## CI

`.github/workflows/ci.yml` se ejecuta en pull requests y pushes a `main`. Usa Node.js 24 y pnpm 10.10.0 para correr:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

El workflow sólo verifica el monorepo: no requiere secretos y no ejecuta deploys.

## Backups y restore

Crear un backup manual:

```bash
./deploy/self-host/scripts/backup-db.sh
```

Los dumps se guardan en `deploy/self-host/backups/`, ruta ignorada por Git.

Restaurar es destructivo. Hacelo únicamente en una ventana de mantenimiento, con API detenida y un backup adicional del estado actual:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env stop api
./deploy/self-host/scripts/restore-db.sh deploy/self-host/backups/ARCHIVO.sql
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env start api
```

Riesgos:

- el dump usa `--clean --if-exists` y reemplaza objetos existentes;
- escrituras concurrentes durante restore pueden perderse;
- verificá espacio libre, permisos y compatibilidad de versión PostgreSQL;
- probá periódicamente el restore en una base aislada;
- no subas dumps a Git ni a almacenamiento sin cifrar.
