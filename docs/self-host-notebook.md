# Te Pinta desde la notebook

La app corre completa en la notebook `192.168.0.34` con usuario Windows/SSH `m_e_a`:

- Web: Docker `self-host-web-1`
- API: Docker `self-host-api-1`
- DB: Docker `self-host-postgres-1`
- URL pública gratis: Docker `te-pinta-quick-tunnel` con Cloudflare Quick Tunnel

## Arrancar todo desde el desktop CachyOS

Desde este repo en el desktop:

```bash
./scripts/te-pinta-notebook-up.sh
```

Ese único comando entra por SSH a la notebook, actualiza `main`, crea un backup de PostgreSQL,
reconstruye web/API, aplica migraciones, levanta el stack Docker y muestra la URL pública actual.
Si el Quick Tunnel gratuito expiró, lo recrea.

El paso de herramientas ejecuta primero `db:migrate` y luego `db:seed`. El seed no reemplaza settings comerciales existentes, pero sí actualiza las credenciales del administrador configurado.

## Si estoy en la notebook

Ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\m_e_a\te-pinta-2.0\scripts\te-pinta-public-url.ps1
```

## URLs

- LAN: `http://192.168.0.34:8080`
- Pública: el script imprime una URL `https://...trycloudflare.com`

## Importante

El Quick Tunnel gratis sin cuenta/dominio puede cambiar de URL después de reiniciar la notebook, Docker o el contenedor. Por eso hay que usar el script para ver la URL actual.

## Backup manual

Desde Bash, WSL o Git Bash:

```bash
./deploy/self-host/scripts/backup-db.sh
```

El archivo queda en `deploy/self-host/backups/` y no debe commitearse.

## Restore

El restore reemplaza objetos de la base. Detené el API, generá un backup adicional y usá:

```bash
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env stop api
./deploy/self-host/scripts/restore-db.sh deploy/self-host/backups/ARCHIVO.sql
docker compose -f deploy/self-host/compose.yml --env-file deploy/self-host/.env start api
```

Probalo primero en una base aislada. No ejecutes restores sobre producción con pedidos activos.
