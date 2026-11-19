# Levanta el Outline aislado, instala dependencias, corre las pruebas y,
# si lo confirmas, envia los resultados a QAtlas.
# Uso (PowerShell, dentro de esta carpeta):
#   powershell -ExecutionPolicy Bypass -File .\ejecutar-todo.ps1

Set-Location $PSScriptRoot

Write-Host "1/4 Levantando Outline aislado (Docker)..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host "Docker no pudo iniciar los servicios. Revisa que Docker Desktop este abierto."; exit 1 }

Write-Host "2/4 Esperando a que Outline responda en http://localhost:3010 (puede tardar unos minutos la primera vez)..."
$listo = $false
for ($i = 0; $i -lt 100; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing "http://localhost:3010/_health" -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $listo = $true; break }
  } catch { }
  Start-Sleep -Seconds 3
}
if (-not $listo) {
  Write-Host "Outline no respondio a tiempo. Revisa con: docker compose logs outline"
  exit 1
}

Write-Host "3/4 Instalando dependencias..."
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
if (-not (Test-Path "node_modules")) { npm install }

Write-Host "4/4 Ejecutando las pruebas (corrida local)..."
npm test

$resp = Read-Host "Enviar los resultados a QAtlas? (s/n)"
if ($resp -eq "s") {
  $seguro = Read-Host "Pega tu token de QAtlas (no se muestra en pantalla)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
  $env:QATLAS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
  $env:QATLAS_URL = "https://geotorotur.tail052473.ts.net/qatlas/api"
  $env:QATLAS_PROJECT = "OL"
  npm run qatlas:todo
  Remove-Item Env:QATLAS_TOKEN
}
