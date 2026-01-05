[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath,

  [Parameter(Mandatory = $true)]
  [Alias('Host')]
  [string]$SshHost,

  [string]$Domain = 'iflux.space',
  [string]$WwwDomain = 'www.iflux.space',

  [string]$RemoteZipPath = '/tmp/iflux-institucional.zip',
  [string]$WebRoot = '/var/www/iflux-institucional',
  [string]$NginxSiteName = 'iflux-institucional',

  [switch]$WithCertbot,
  [string]$CertbotEmail,

  [switch]$SkipUpload,
  [switch]$SkipNginx
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Escape-ForBashSingleQuoted([string]$s) {
  return ($s -replace "'", "'\\''")
}

function Escape-ForBashDoubleQuotedLiteral([string]$s) {
  return $s.Replace('\\', '\\\\').Replace('"', '\\"').Replace('`', '\\`').Replace('$', '\\$')
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

function Require-Command([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command not found: $name. Install OpenSSH client (ssh/scp) and try again."
  }
}

Require-Command 'ssh'
Require-Command 'scp'

if (-not (Test-Path -LiteralPath $ZipPath)) {
  throw "Zip file not found: $ZipPath"
}

Write-Host "== Deploy institucional (.zip) ==" -ForegroundColor Cyan
Write-Host "Host: $SshHost" -ForegroundColor Cyan
Write-Host "Domain: $Domain, $WwwDomain" -ForegroundColor Cyan
Write-Host "WebRoot: $WebRoot" -ForegroundColor Cyan

if (-not $SkipUpload) {
  Write-Host "[1/3] Enviando ZIP via SCP..." -ForegroundColor Yellow
  & scp $ZipPath "$SshHost`:$RemoteZipPath"
  if ($LASTEXITCODE -ne 0) {
    throw "SCP upload failed (exit $LASTEXITCODE)."
  }
}

Write-Host "[2/3] Descompactando e preparando arquivos no servidor..." -ForegroundColor Yellow
$unzipTemplate = @'
set -eu
set -o pipefail

WEB_ROOT="__WEB_ROOT__"
REMOTE_ZIP="__REMOTE_ZIP__"

# Defensive: strip any stray CR that could sneak in via transport
WEB_ROOT="${WEB_ROOT//$'\r'/}"
REMOTE_ZIP="${REMOTE_ZIP//$'\r'/}"

apt-get update
apt-get install -y unzip

mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*

set +e
unzip -o "$REMOTE_ZIP" -d "$WEB_ROOT" >/dev/null
unzip_code=$?
set -e

# unzip can exit with code 1 for non-fatal warnings (e.g., Windows ZIP path separators).
if [ "$unzip_code" -eq 1 ]; then
  echo "WARN: unzip returned exit 1. Continuing..." >&2
elif [ "$unzip_code" -ne 0 ]; then
  echo "ERROR: unzip failed with exit code $unzip_code" >&2
  exit "$unzip_code"
fi

# Debug structure
echo "DEBUG: Listing web root structure:" >&2
find "$WEB_ROOT" -maxdepth 3 -not -path '*/.*' | head -n 20 >&2

# Locate package.json dynamically
PROJECT_DIR=""
if [ -f "$WEB_ROOT/package.json" ]; then
  PROJECT_DIR="$WEB_ROOT"
elif [ -f "$WEB_ROOT/flux-institucional/package.json" ]; then
  PROJECT_DIR="$WEB_ROOT/flux-institucional"
else
  # Try to find it
  FOUND_PKG="$(find "$WEB_ROOT" -maxdepth 3 -name package.json | head -n 1)"
  if [ -n "$FOUND_PKG" ]; then
    PROJECT_DIR="$(dirname "$FOUND_PKG")"
  fi
fi

if [ -n "$PROJECT_DIR" ]; then
  echo "INFO: Detected buildable project at $PROJECT_DIR. Installing Node/pnpm and building..." >&2

  if ! command -v node >/dev/null 2>&1; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  corepack enable
  corepack prepare pnpm@9.15.5 --activate

  cd "$PROJECT_DIR"
  corepack pnpm install --frozen-lockfile
  corepack pnpm build

  # Check where dist went
  if [ -d "$PROJECT_DIR/dist/public" ]; then
     DIST_DIR="$PROJECT_DIR/dist/public"
  elif [ -d "$PROJECT_DIR/dist" ]; then
     DIST_DIR="$PROJECT_DIR/dist"
  else
     echo "ERROR: Build completed but dist folder was not found in $PROJECT_DIR" >&2
     exit 2
  fi

  if [ ! -f "$DIST_DIR/index.html" ]; then
    echo "ERROR: index.html not found in $DIST_DIR" >&2
    exit 2
  fi

  # Keep the project structure (expected by verification + nginx auto-detection):
  #   $WEB_ROOT/flux-institucional/dist/public/index.html
  # Do NOT flatten/move dist into $WEB_ROOT, as that breaks the expected paths.
  chown -R www-data:www-data "$PROJECT_DIR/dist"
  chown -R www-data:www-data "$WEB_ROOT"
  exit 0
fi

# Normalize: if index.html is inside a single top-level folder, move it up
idx_count="$(find "$WEB_ROOT" -maxdepth 3 -type f -iname index.html -print | wc -l | tr -d ' ')"
if [ "$idx_count" -eq 0 ]; then
  echo "ERROR: index.html not found under $WEB_ROOT" >&2
  find "$WEB_ROOT" -maxdepth 3 -type f | head -n 120 >&2
  exit 2
fi

if [ "$idx_count" -gt 1 ]; then
  echo "ERROR: multiple index.html found under $WEB_ROOT:" >&2
  find "$WEB_ROOT" -maxdepth 3 -type f -iname index.html -print >&2
  exit 2
fi

idx="$(find "$WEB_ROOT" -maxdepth 3 -type f -iname index.html -print)"
if [ "$idx" != "$WEB_ROOT/index.html" ]; then
  idxdir="$(dirname "$idx")"
  echo "INFO: index.html found in $idxdir. Moving contents to $WEB_ROOT" >&2
  shopt -s dotglob
  mv "$idxdir"/* "$WEB_ROOT"/
  shopt -u dotglob
fi

# Fix ownership
chown -R www-data:www-data "$WEB_ROOT"
'@

$unzipScript = $unzipTemplate.
  Replace('__WEB_ROOT__', (Escape-ForBashDoubleQuotedLiteral $WebRoot)).
  Replace('__REMOTE_ZIP__', (Escape-ForBashDoubleQuotedLiteral $RemoteZipPath))

Invoke-RemoteBash $unzipScript

if (-not $SkipNginx) {
  Write-Host "[3/3] Configurando Nginx para o institucional..." -ForegroundColor Yellow

  # If WithCertbot is enabled, we will (a) configure HTTP-only first, (b) obtain cert via webroot,
  # then (c) switch to HTTPS+redirect.
  $nginxTemplate = @'
set -eu
set -o pipefail

SITE_AVAILABLE="/etc/nginx/sites-available/__NGINX_SITE_NAME__"
SITE_ENABLED="/etc/nginx/sites-enabled/__NGINX_SITE_NAME__"

WEB_ROOT="__WEB_ROOT__"
DOMAIN="__DOMAIN__"
WWW_DOMAIN="__WWW_DOMAIN__"

# Defensive: strip any stray CR
WEB_ROOT="${WEB_ROOT//$'\r'/}"
DOMAIN="${DOMAIN//$'\r'/}"
WWW_DOMAIN="${WWW_DOMAIN//$'\r'/}"

# Choose what to serve: raw static files or a build output folder
SERVE_ROOT="$WEB_ROOT"
if [ -f "$WEB_ROOT/flux-institucional/dist/public/index.html" ]; then
  SERVE_ROOT="$WEB_ROOT/flux-institucional/dist/public"
fi

write_http_site() {
  cat > "$SITE_AVAILABLE" <<EOF
server {
  listen 80;
  listen [::]:80;

  server_name $DOMAIN $WWW_DOMAIN;

  root $SERVE_ROOT;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF
  ln -sf "$SITE_AVAILABLE" "$SITE_ENABLED"
}

write_https_site() {
  cat > "$SITE_AVAILABLE" <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN $WWW_DOMAIN;
  return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;

  server_name $DOMAIN $WWW_DOMAIN;

  root $SERVE_ROOT;
  index index.html;

  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
  gzip_min_length 1000;

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
    expires -1;
  }

  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
EOF
  ln -sf "$SITE_AVAILABLE" "$SITE_ENABLED"
}

write_http_site

# Check if certificates already exist
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "INFO: SSL certificates found. Configuring HTTPS..."
  write_https_site
else
  echo "INFO: No SSL certificates found. Configuring HTTP only."
fi

nginx -t
systemctl reload nginx
'@

  $remoteNginxScript = $nginxTemplate.
    Replace('__NGINX_SITE_NAME__', (Escape-ForBashDoubleQuotedLiteral $NginxSiteName)).
    Replace('__WEB_ROOT__', (Escape-ForBashDoubleQuotedLiteral $WebRoot)).
    Replace('__DOMAIN__', (Escape-ForBashDoubleQuotedLiteral $Domain)).
    Replace('__WWW_DOMAIN__', (Escape-ForBashDoubleQuotedLiteral $WwwDomain))

  if ($WithCertbot) {
    $emailArgs = if ([string]::IsNullOrWhiteSpace($CertbotEmail)) {
      "--register-unsafely-without-email"
    } else {
      "--email $CertbotEmail"
    }

    $certbotTemplate = @'
  set -eu
  set -o pipefail

WEB_ROOT="__WEB_ROOT__"
DOMAIN="__DOMAIN__"
WWW_DOMAIN="__WWW_DOMAIN__"
EMAIL_ARGS="__EMAIL_ARGS__"

  # Defensive: strip any stray CR
  WEB_ROOT="${WEB_ROOT//$'\r'/}"
  DOMAIN="${DOMAIN//$'\r'/}"
  WWW_DOMAIN="${WWW_DOMAIN//$'\r'/}"

# best-effort: detect if domain resolves to this machine (v4 or v6)
SELF4="$(hostname -I | tr ' ' '\n' | grep -E '^[0-9]+\.' | head -n 1 2>/dev/null || true)"
SELF6="$(ip -6 addr | awk '/inet6 [0-9a-f:]+\// {print $2}' | cut -d/ -f1 | grep -v '^fe80:' | head -n 1 2>/dev/null || true)"
RES="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n 1 2>/dev/null || true)"

if [ -z "$RES" ]; then
  echo "WARN: $DOMAIN does not resolve on server; skipping certbot" >&2
  exit 0
fi

if [ "$RES" != "$SELF4" ] && [ -n "$SELF6" ] && [ "$RES" != "$SELF6" ]; then
  echo "WARN: $DOMAIN resolves to $RES, but this server is $SELF4 / $SELF6. Certbot likely will fail." >&2
fi

apt-get update
apt-get install -y certbot

# Obtain cert via webroot to avoid certbot mutating nginx config
certbot certonly --webroot -w "$WEB_ROOT" -d "$DOMAIN" -d "$WWW_DOMAIN" --agree-tos --non-interactive $EMAIL_ARGS
'@

    $remoteCertbotScript = $certbotTemplate.
      Replace('__WEB_ROOT__', (Escape-ForBashDoubleQuotedLiteral $WebRoot)).
      Replace('__DOMAIN__', (Escape-ForBashDoubleQuotedLiteral $Domain)).
      Replace('__WWW_DOMAIN__', (Escape-ForBashDoubleQuotedLiteral $WwwDomain)).
      Replace('__EMAIL_ARGS__', (Escape-ForBashDoubleQuotedLiteral $emailArgs))

    # Run nginx http config first, then certbot, then switch to https config
    Invoke-RemoteBash ($remoteNginxScript + "\n" + $remoteCertbotScript + "\n" + "write_https_site\nnginx -t\nsystemctl reload nginx\n")
  } else {
    Invoke-RemoteBash $remoteNginxScript
    Write-Host "INFO: Nginx configurado apenas em HTTP. Rode novamente com -WithCertbot após ajustar DNS para habilitar HTTPS." -ForegroundColor DarkYellow
  }
}

Write-Host "OK. Conteúdo publicado em $WebRoot." -ForegroundColor Green
if ($WithCertbot) {
  Write-Host "OK. HTTPS configurado para $Domain e $WwwDomain." -ForegroundColor Green
} else {
  Write-Host "Próximo passo: ajustar DNS e rodar com -WithCertbot para SSL." -ForegroundColor Cyan
}
