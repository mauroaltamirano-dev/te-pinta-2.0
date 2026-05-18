# Hostear Te Pinta en la notebook

Esta guía levanta **PostgreSQL + API + Web** en la notebook con Docker Compose. La web queda en un solo origen y Nginx reenvía `/api/v1` a la API, así el frontend no depende de Vercel ni Render.

## Arquitectura

- `postgres`: base de datos local persistente en un volumen Docker.
- `api`: Express/Drizzle conectado a `postgres` por red interna Docker.
- `web`: build estático Vite servido por Nginx, con proxy a `/api/v1`.
- `cloudflared` opcional: túnel saliente para publicar la app sin abrir puertos del router.

## Requisitos de la notebook

1. Docker + Docker Compose v2.
2. Notebook conectada a corriente y configurada para no suspenderse.
3. Backups periódicos de `deploy/self-host/backups/`.
4. Para publicar a internet de forma segura: dominio en Cloudflare y un Tunnel token.

## Primer arranque local/LAN

Desde la raíz del repo:

```bash
cp deploy/self-host/.env.example deploy/self-host/.env
```

Editá `deploy/self-host/.env` y cambiá:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ALLOWED_ORIGIN`

Generar secretos:

```bash
openssl rand -hex 32
```

Para probar por LAN sin HTTPS podés usar:

```env
ALLOWED_ORIGIN=http://localhost:8080
NODE_ENV=development
```

Luego:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env build
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env --profile tools run --rm migrate
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env up -d postgres api web
```

Abrir:

```text
http://localhost:8080
```

o desde otro dispositivo en la misma red:

```text
http://IP_DE_LA_NOTEBOOK:8080
```

## Publicar con Cloudflare Tunnel

Recomendado para evitar abrir puertos del router. Cloudflare Tunnel usa conexiones salientes desde la notebook hacia Cloudflare.

1. Crear un tunnel en Cloudflare Zero Trust.
2. Configurar el hostname público, por ejemplo `te-pinta.tu-dominio.com`.
3. Apuntar el servicio/origin del tunnel a:

```text
http://web:80
```

4. Pegar el token en `deploy/self-host/.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=...
ALLOWED_ORIGIN=https://te-pinta.tu-dominio.com
NODE_ENV=production
```

5. Levantar con el perfil de túnel:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env --profile tunnel up -d postgres api web cloudflared
```

## Comandos útiles

Ver estado:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env ps
```

Ver logs:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env logs -f api web postgres
```

Aplicar migraciones y seed después de actualizar código:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env --profile tools run --rm migrate
```

Actualizar después de un `git pull`:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env build
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env --profile tools run --rm migrate
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env up -d postgres api web
```

Si usás túnel, sumar `--profile tunnel` y `cloudflared` al `up`.

## Backups

Crear backup SQL:

```bash
deploy/self-host/scripts/backup-db.sh
```

Restaurar backup:

```bash
deploy/self-host/scripts/restore-db.sh deploy/self-host/backups/te-pinta-YYYYMMDD-HHMMSS.sql
```

## Migrar datos desde Render/DB actual

1. Sacar un `pg_dump` de la base actual.
2. Copiar el `.sql` a `deploy/self-host/backups/`.
3. Levantar `postgres` en la notebook.
4. Restaurar con el script de restore.
5. Ejecutar migraciones/seed.
6. Recién después apuntar el dominio/tunnel a la notebook.

## Notas de seguridad

- No commitear `deploy/self-host/.env`.
- No exponer el puerto `5432` de Postgres a internet.
- Preferir Cloudflare Tunnel o VPN antes que abrir puertos del router.
- Con `NODE_ENV=production`, las cookies de refresh usan `Secure`; usá HTTPS para producción.
