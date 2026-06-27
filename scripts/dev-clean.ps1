# SIMP Platform — clean dev restart (Windows)
# Kills ghost dev servers, flushes hot caches, starts backend + frontend with memory caps.

$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"

Write-Host "==> Stopping dev servers on ports 3000 and 3001..." -ForegroundColor Cyan
foreach ($port in @(3000, 3001)) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "==> Flushing build caches..." -ForegroundColor Cyan
$paths = @(
  (Join-Path $Root "dist"),
  (Join-Path $Root "tsconfig.tsbuildinfo"),
  (Join-Path $Frontend ".next"),
  (Join-Path $Frontend "tsconfig.tsbuildinfo"),
  (Join-Path $Frontend "out")
)
foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item -Recurse -Force $p
    Write-Host "    removed $p"
  }
}

$env:NODE_OPTIONS = $null

Write-Host "==> Starting NestJS (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$Root'; npm run start:dev"
)

Start-Sleep -Seconds 2

Write-Host "==> Starting Next.js (port 3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$Frontend'; npm run dev"
)

Write-Host ""
Write-Host "Dev stack starting." -ForegroundColor Yellow
Write-Host "  API:      http://localhost:3000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3001" -ForegroundColor White
