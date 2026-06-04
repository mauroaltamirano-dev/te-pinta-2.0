param(
  [string] $Repo = 'C:\Users\m_e_a\te-pinta-2.0'
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::UTF8

$tunnelName = 'te-pinta-quick-tunnel'
$network = 'self-host_default'
$composeFile = 'deploy/self-host/compose.yml'
$envFile = 'deploy/self-host/.env'

function Test-LastExit {
  param([string] $Step)

  if ($LASTEXITCODE -ne 0) {
    Write-Error "$Step falló con código $LASTEXITCODE."
    exit $LASTEXITCODE
  }
}

function Wait-Docker {
  Write-Host 'Verificando Docker Desktop...'
  $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'

  for ($i = 1; $i -le 60; $i++) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      return $true
    }

    if ($i -eq 1 -and (Test-Path $dockerDesktop)) {
      Write-Host 'Docker no responde todavía; intentando abrir Docker Desktop...'
      Start-Process $dockerDesktop | Out-Null
    }

    Start-Sleep -Seconds 3
  }

  return $false
}

function Get-TunnelUrl {
  param([int] $Tail = 200)

  $logs = docker logs $tunnelName --tail $Tail 2>&1
  return ($logs |
    Select-String -Pattern 'https://[-a-z0-9]+\.trycloudflare\.com' -AllMatches |
    ForEach-Object { $_.Matches.Value } |
    Select-Object -Last 1)
}

function Test-TunnelIsExpired {
  $logs = docker logs $tunnelName --tail 80 2>&1
  return [bool]($logs | Select-String -Pattern 'Unauthorized: Tunnel not found')
}

function Wait-Postgres {
  Write-Host 'Esperando PostgreSQL healthy...'

  for ($i = 1; $i -le 30; $i++) {
    docker compose -f $composeFile --env-file $envFile exec -T postgres pg_isready -U te_pinta -d te_pinta *> $null
    if ($LASTEXITCODE -eq 0) {
      return $true
    }

    Start-Sleep -Seconds 2
  }

  return $false
}

function Start-QuickTunnel {
  $exists = docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch $tunnelName
  $running = docker ps --format '{{.Names}}' | Select-String -SimpleMatch $tunnelName
  $shouldRecreate = $false

  if ($exists -and (Test-TunnelIsExpired)) {
    Write-Host 'El Quick Tunnel existente expiró; recreándolo...'
    $shouldRecreate = $true
  }

  if ($shouldRecreate) {
    docker rm -f $tunnelName | Out-Null
    $exists = $null
    $running = $null
  }

  if (-not $exists) {
    Write-Host 'Creando Cloudflare Quick Tunnel gratis...'
    docker pull cloudflare/cloudflared:latest | Out-Null
    Test-LastExit 'Descarga de cloudflared'
    docker run -d --name $tunnelName --restart unless-stopped --network $network cloudflare/cloudflared:latest tunnel --no-autoupdate --protocol http2 --url http://web:80 | Out-Null
    Test-LastExit 'Creación del Quick Tunnel'
  } elseif (-not $running) {
    Write-Host 'Iniciando Cloudflare Quick Tunnel existente...'
    docker start $tunnelName | Out-Null
    Test-LastExit 'Inicio del Quick Tunnel'
  } else {
    Write-Host 'Cloudflare Quick Tunnel ya estaba corriendo.'
  }
}

if (-not (Wait-Docker)) {
  Write-Error 'Docker Desktop no arrancó o no responde. Abrilo en la notebook y volvé a ejecutar el comando.'
  exit 1
}

if (-not (Test-Path $Repo)) {
  Write-Error "No existe el repo: $Repo"
  exit 1
}

Set-Location $Repo

$env:DOCKER_CONFIG = Join-Path $env:TEMP 'docker-codex'
New-Item -ItemType Directory -Force $env:DOCKER_CONFIG | Out-Null
Set-Content -Path (Join-Path $env:DOCKER_CONFIG 'config.json') -Value '{}'

Write-Host 'Actualizando repo...'
git pull --ff-only
Test-LastExit 'Actualización del repo'

Write-Host 'Levantando PostgreSQL para backup...'
docker compose -f $composeFile --env-file $envFile up -d postgres
Test-LastExit 'Inicio de PostgreSQL'
if (-not (Wait-Postgres)) {
  Write-Error 'PostgreSQL no llegó a estar healthy para hacer backup.'
  exit 1
}

$backupName = "pre-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
New-Item -ItemType Directory -Force (Join-Path $Repo 'deploy/self-host/backups') | Out-Null
Write-Host "Creando backup antes de migrar: deploy/self-host/backups/$backupName"
docker compose -f $composeFile --env-file $envFile exec -T postgres pg_dump -U te_pinta -d te_pinta --file "/backups/$backupName"
Test-LastExit 'Backup de PostgreSQL'

Write-Host 'Construyendo imágenes con los últimos cambios...'
docker compose -f $composeFile --env-file $envFile build api web migrate
Test-LastExit 'Build de imágenes'

Write-Host 'Aplicando migraciones y seed idempotente...'
docker compose -f $composeFile --env-file $envFile --profile tools run --rm migrate
Test-LastExit 'Migraciones y seed'

Write-Host 'Levantando Te Pinta local en la notebook...'
docker compose -f $composeFile --env-file $envFile up -d postgres api web
Test-LastExit 'Inicio de Te Pinta'

Start-QuickTunnel

$url = $null
for ($i = 1; $i -le 30; $i++) {
  Start-Sleep -Seconds 2
  $url = Get-TunnelUrl
  if ($url) {
    break
  }
}

Write-Host ''
Write-Host '========================================'
if ($url) {
  Write-Host "Te Pinta pública: $url"
  Write-Host "Health: $url/health"

  try {
    $health = Invoke-WebRequest -UseBasicParsing "$url/health" -TimeoutSec 15
    Write-Host "Health pública verificada: HTTP $($health.StatusCode)"
  } catch {
    Write-Host "No pude verificar la health pública todavía: $($_.Exception.Message)"
  }
} else {
  Write-Host 'Te Pinta local quedó levantada, pero no pude leer la URL pública todavía.'
  Write-Host "Para verla: docker logs $tunnelName --tail 200"
}
Write-Host 'LAN local: http://192.168.0.34:8080'
Write-Host '========================================'
Write-Host ''
Write-Host 'Estado de contenedores:'
docker ps --filter name=self-host --filter name=$tunnelName --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
