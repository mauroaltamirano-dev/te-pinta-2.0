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

Ese único comando entra por SSH a la notebook, intenta arrancar Docker Desktop si hace falta, levanta el stack Docker y muestra la URL pública actual.

## Si estoy en la notebook

Ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\m_e_a\te-pinta-public-url.ps1
```

## URLs

- LAN: `http://192.168.0.34:8080`
- Pública: el script imprime una URL `https://...trycloudflare.com`

## Importante

El Quick Tunnel gratis sin cuenta/dominio puede cambiar de URL después de reiniciar la notebook, Docker o el contenedor. Por eso hay que usar el script para ver la URL actual.
