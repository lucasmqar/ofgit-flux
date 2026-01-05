[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [Alias('Host')]
  [string]$SshHost,

  [string]$ZipPath,

  [string]$Domain = 'iflux.space',
  [string]$WwwDomain = 'www.iflux.space',

  [string]$WebRoot = '/var/www/iflux-institucional',
  [string]$RemoteZipPath = '/tmp/iflux-institucional.zip',

  [switch]$SkipNginx,
  [switch]$SkipUpload,

  [int]$HealthRetries = 8,
  [int]$HealthDelaySeconds = 2
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Require-Command([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command not found: $name"
  }
}

function Write-Section([string]$title) {
  Write-Host "";
  Write-Host ("== {0} ==" -f $title) -ForegroundColor Cyan
}

function Escape-ForBashSingleQuoted([string]$s) {
  return ($s -replace "'", "'\\''")
}

function Invoke-RemoteBash([string]$bashScript) {
  # Bash on Linux will choke on CRLF; normalize to LF before sending.
  $bashScript = $bashScript -replace "`r`n", "`n"
  $bashScript = $bashScript -replace "`r", ""
  $escaped = Escape-ForBashSingleQuoted $bashScript
  & ssh $SshHost "sudo bash -lc '$escaped'"
  if ($LASTEXITCODE -ne 0) {
    throw "Remote command failed (exit $LASTEXITCODE)."
  }
}

Require-Command 'ssh'
Require-Command 'scp'
Require-Command 'curl.exe'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir ".."))
$deployScript = Join-Path $scriptDir "deploy_institutional_zip_nginx.ps1"

if ([string]::IsNullOrWhiteSpace($ZipPath)) {
  $ZipPath = Join-Path $repoRoot "_deploy_stage_iflux_institucional\iflux-institucional.zip"
}

if (-not (Test-Path -LiteralPath $deployScript)) {
  throw "Deploy script not found: $deployScript"
}

if (-not (Test-Path -LiteralPath $ZipPath)) {
  throw "Zip file not found: $ZipPath"
}

Write-Section "Deploy"
Write-Host "Host: $SshHost" -ForegroundColor Yellow
Write-Host "Zip:  $ZipPath" -ForegroundColor Yellow

$args = @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-File', $deployScript,
  '-ZipPath', $ZipPath,
  '-SshHost', $SshHost,
  '-Domain', $Domain,
  '-WwwDomain', $WwwDomain,
  '-RemoteZipPath', $RemoteZipPath,
  '-WebRoot', $WebRoot
)
if ($SkipNginx) { $args += '-SkipNginx' }
if ($SkipUpload) { $args += '-SkipUpload' }

& powershell @args
if ($LASTEXITCODE -ne 0) {
  throw "Deploy script failed (exit $LASTEXITCODE)"
}

Write-Section "Server Check"
$serverCheckScript = @"
set -euo pipefail

echo "HOSTNAME=$(hostname)"
echo "== dist/public index =="
if [ -f "$WebRoot/flux-institucional/dist/public/index.html" ]; then
  ls -la "$WebRoot/flux-institucional/dist/public/index.html"
  stat -c "%y %n" "$WebRoot/flux-institucional/dist/public/index.html"
  sha256sum "$WebRoot/flux-institucional/dist/public/index.html" | head -n 1
else
  echo "MISSING: $WebRoot/flux-institucional/dist/public/index.html"
  exit 2
fi
"@

$needsBuild = $false
try {
  Invoke-RemoteBash $serverCheckScript
} catch {
  $needsBuild = $true
}

if ($needsBuild) {
  Write-Host "dist/public missing; attempting remote build..." -ForegroundColor DarkYellow
  $buildScript = @"
set -euo pipefail

cd "$WebRoot/flux-institucional"

if ! command -v node >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

corepack enable
corepack prepare pnpm@9.15.5 --activate

corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm build

test -f dist/public/index.html
chown -R www-data:www-data dist/public
"@

  Invoke-RemoteBash $buildScript
  Invoke-RemoteBash $serverCheckScript
}

Write-Section "HTTP Health"
for ($i = 1; $i -le $HealthRetries; $i++) {
  $resp = (curl.exe -sS -I "https://$Domain" 2>&1) | Out-String
  $statusLine = ($resp -split "`n" | Select-Object -First 1).Trim()
  Write-Host ("[{0}/{1}] {2}" -f $i, $HealthRetries, $statusLine) -ForegroundColor Yellow

  if ($statusLine -match "\s200\s" -or $statusLine -match "\s304\s") {
    $lm = ($resp -split "`n" | Where-Object { $_ -match "^Last-Modified:" } | Select-Object -First 1).Trim()
    if ($lm) { Write-Host $lm -ForegroundColor DarkGray }
    break
  }

  if ($i -eq $HealthRetries) {
    Write-Host "Domain is not healthy after retries. Collecting nginx diagnostics..." -ForegroundColor Red
    $diagScript = @"
set -euo pipefail

echo "== nginx -t =="
nginx -t || true

echo "== nginx error.log (tail) =="
tail -n 120 /var/log/nginx/error.log || true

echo "== nginx access.log (tail) =="
tail -n 80 /var/log/nginx/access.log || true

echo "== sites-enabled =="
ls -la /etc/nginx/sites-enabled | head -n 200

echo "== webroot =="
ls -la "$WebRoot" | head -n 120 || true

echo "== serve root candidates =="
ls -la "$WebRoot/index.html" 2>/dev/null || true
ls -la "$WebRoot/flux-institucional/dist/public/index.html" 2>/dev/null || true
"@
    Invoke-RemoteBash $diagScript
    throw "HTTP healthcheck failed for https://$Domain"
  }

  Start-Sleep -Seconds $HealthDelaySeconds
}

Write-Host "OK: deploy + verification completed." -ForegroundColor Green
