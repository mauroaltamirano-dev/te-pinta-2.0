# Deploy de prueba — Te Pinta 2.0

Objetivo: subir una prueba gratuita/semi-gratuita con frontend estático, API Node y PostgreSQL externa.

## Arquitectura recomendada

- **Web**: Vercel, desde este repo, usando `vercel.json` en la raíz.
- **API**: Render Web Service Free, usando `render.yaml`.
- **DB**: Neon Postgres Free.

Notas actuales:
- Vercel soporta monorepos y permite configurar build/output desde la raíz.
- Render Free web services pueden dormir tras inactividad; es normal que el primer request tarde.
- Render Free no conviene para DB porque sus Postgres free expiran; Neon Free no tiene ese límite de 30 días en el plan free actual.

## 1. Crear DB en Neon

1. Crear proyecto en Neon.
2. Copiar la connection string PostgreSQL.
3. Usar esa URL como `DATABASE_URL` en Render y localmente para migrar/seedear.

## 2. Deploy API en Render

Crear un **Blueprint** desde el repo o un **Web Service** manual.

Config si se hace manual:

- Root: repo root.
- Runtime: Node.
- Plan: Free.
- Build command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @te-pinta/shared build && pnpm --filter @te-pinta/api build
```

- Start command:

```bash
pnpm --filter @te-pinta/api start
```

- El script `start` ejecuta `apps/api/dist/src/server.js`, no TypeScript fuente.
- Health check path: `/health`

Variables de entorno en Render:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=<neon-postgres-url>
JWT_SECRET=<32+ chars random>
JWT_REFRESH_SECRET=<32+ chars random diferente>
ALLOWED_ORIGIN=https://<tu-app-vercel>.vercel.app
ADMIN_EMAIL=<email admin>
ADMIN_PASSWORD=<password fuerte>
ADMIN_NAME=Admin Te Pinta
```

## 3. Migrar y seedear DB

Render Free no ofrece pre-deploy command para web services free, así que correr desde una terminal confiable apuntando a Neon **antes** del deploy:

```bash
cd apps/api
DATABASE_URL='<neon-postgres-url>' pnpm db:migrate
DATABASE_URL='<neon-postgres-url>' JWT_SECRET='dummy-secret-32-chars-minimum-xxxx' JWT_REFRESH_SECRET='dummy-refresh-secret-32-chars-minimum' ALLOWED_ORIGIN='http://localhost:5173' ADMIN_EMAIL='<email admin>' ADMIN_PASSWORD='<password fuerte>' ADMIN_NAME='Admin Te Pinta' NODE_ENV=production pnpm db:seed
```

> `db:seed` crea o actualiza el usuario admin. En settings sólo inserta claves faltantes y no pisa valores comerciales existentes. No lo ejecutes si no querés actualizar las credenciales configuradas.

La metadata Drizzle debe reconciliarse antes de generar migraciones nuevas. Consultá [Operaciones técnicas](operations.md).

## 4. Deploy web en Vercel

Importar el repo en Vercel y dejar que use `vercel.json`.

Variable de entorno:

```bash
VITE_API_URL=https://<tu-api-render>.onrender.com/api/v1
```

Después del primer deploy web, volver a Render y actualizar:

```bash
ALLOWED_ORIGIN=https://<tu-app-vercel>.vercel.app
```

Luego redeploy de API.

## 5. Smoke test

1. Abrir `https://<api>.onrender.com/health` debe devolver `{ "status": "ok", "service": "te-pinta-api" }`.
2. Abrir web de Vercel.
3. Login con admin seed.
4. Probar:
   - Dashboard carga.
   - Settings muestra delivery/promos/adicionales.
   - Crear pedido con envío.
   - Crear pedido de 3 docenas y verificar 10%.
   - Crear docena combinada surtida y verificar $15.000.

## Limitaciones de prueba

- Render Free duerme el API tras inactividad; el primer request puede tardar cerca de 1 minuto.
- Sin backups automáticos en este setup free; para uso real migrar a plan pago o configurar backups.
- Las salsas están configuradas, pero todavía no son line-items persistidos en pedidos.
