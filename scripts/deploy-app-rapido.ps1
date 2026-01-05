# Deploy Rápido - App Principal (app.iflux.space)
#
# Uso: .\scripts\deploy-app-rapido.ps1 -SshHost usuario@servidor.com
#
# Pré-requisitos:
# 1. .env.production configurado na raiz
# 2. SSH configurado com acesso sudo
# 3. Servidor com nginx instalado

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SshHost,

  # Optional: SSH identity file (private key). Example: C:\Users\lucas\.ssh\id_ed25519
  [string]$IdentityFile,

  # Optional: SSH port. If not set, uses SSH default.
  [int]$SshPort,
  
  [string]$Domain = 'app.iflux.space',
  [string]$WebRoot = '/var/www/iflux-app',
  [string]$NginxSite = 'iflux-app',
  
  [switch]$SkipBuild,
  [switch]$SkipNginxConfig
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$distDir = Join-Path $repoRoot "dist"

function Normalize-SshHost([string]$value) {
  $raw = $value
  if ($null -eq $raw) { $raw = '' }
  $v = ($raw).Trim()
  if ($v.StartsWith('ssh ', [System.StringComparison]::OrdinalIgnoreCase)) {
    $v = $v.Substring(4).Trim()
  }
  return $v
}

function Get-SshBaseArgs() {
  $args = @(
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3'
  )
  if ($IdentityFile) {
    $args += @('-o', 'IdentitiesOnly=yes')
    $args += @('-i', $IdentityFile)
  }
  if ($SshPort -gt 0) {
    $args += @('-p', "$SshPort")
  }
  return ,$args
}

function Get-ScpBaseArgs() {
  $args = @(
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3'
  )
  if ($IdentityFile) {
    $args += @('-o', 'IdentitiesOnly=yes')
    $args += @('-i', $IdentityFile)
  }
  if ($SshPort -gt 0) {
    $args += @('-P', "$SshPort")
  }
  return ,$args
}

function Write-Step([string]$msg) {
  Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Invoke-Remote([string]$cmd) {
  $cmd = $cmd -replace "`r`n", "`n" -replace "`r", ""
  $escaped = $cmd -replace "'", "'\\''"
  $hostValue = Normalize-SshHost $SshHost
  $sshArgs = Get-SshBaseArgs
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & ssh @sshArgs $hostValue "sudo bash -lc '$escaped'" 2>&1
  } finally {
    $ErrorActionPreference = $prevEap
  }
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed" }
}

# ====================
# 1. BUILD
# ====================
if (-not $SkipBuild) {
  Write-Step "Building app principal..."
  Push-Location $repoRoot
  try {
    if (-not (Test-Path "node_modules")) {
      Write-Host "Instalando dependências..." -ForegroundColor Yellow
      npm install
    }
    Write-Host "Executando build de produção..." -ForegroundColor Yellow
    npm run build
    if (-not (Test-Path $distDir)) {
      throw "Build falhou: $distDir não encontrado"
    }
  } finally {
    Pop-Location
  }
} else {
  if (-not (Test-Path $distDir)) {
    throw "Dist não encontrado e -SkipBuild ativado: $distDir"
  }
  Write-Host "Usando build existente: $distDir" -ForegroundColor Yellow
}

# ====================
# 2. CRIAR ZIP
# ====================
Write-Step "Criando pacote de deploy..."
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "iflux-app-$timestamp.zip"
$zipPath = Join-Path $repoRoot $zipName

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Push-Location $distDir
try {
  Compress-Archive -Path "*" -DestinationPath $zipPath -CompressionLevel Optimal
  Write-Host "✅ Criado: $zipName" -ForegroundColor Green
} finally {
  Pop-Location
}

# ====================
# 3. UPLOAD VIA SCP
# ====================
Write-Step "Enviando para servidor..."
$remoteZip = "/tmp/$zipName"
$hostValue = Normalize-SshHost $SshHost
$scpArgs = Get-ScpBaseArgs
& scp @scpArgs $zipPath "${hostValue}:$remoteZip"
if ($LASTEXITCODE -ne 0) { throw "Upload falhou" }
Write-Host "✅ Upload concluído" -ForegroundColor Green

# ====================
# 4. DESCOMPACTAR NO SERVIDOR
# ====================
Write-Step "Descompactando no servidor..."
Invoke-Remote @"
apt-get update -qq
apt-get install -y unzip nginx >/dev/null 2>&1
systemctl enable --now nginx >/dev/null 2>&1 || true
mkdir -p $WebRoot/releases

release="$WebRoot/releases/$zipName"
rm -rf "`$release"
mkdir -p "`$release"
unzip -q "$remoteZip" -d "`$release"
rm "$remoteZip"

ln -sfn "`$release" "$WebRoot/current"
chown -R www-data:www-data "$WebRoot"
chmod -R 755 "$WebRoot"

# Keep only the 5 most recent releases
ls -1dt "$WebRoot"/releases/* 2>/dev/null | tail -n +6 | xargs -r rm -rf
"@
Write-Host "✅ Arquivos publicados em $WebRoot/current" -ForegroundColor Green

# ====================
# 5. CONFIGURAR NGINX
# ====================
if (-not $SkipNginxConfig) {
  Write-Step "Configurando Nginx..."
  
  $nginxConfig = @"
  server {
    listen 80;
    listen [::]:80;
    server_name $Domain;

    return 301 https://\`$host\`$request_uri;
  }

  server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $Domain;

    root $WebRoot/current;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/$Domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$Domain/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss text/javascript;
    gzip_vary on;

    # SPA routing - React Router
    location / {
      try_files \`$uri \`$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }

    # Disable cache for HTML
    location ~* \.html$ {
      add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Service Worker (para PWA, se houver)
    location ~* service-worker\.js$ {
      add_header Cache-Control "no-cache, no-store, must-revalidate";
      expires 0;
    }
  }
"@

  $nginxConfigB64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($nginxConfig))
  
  Invoke-Remote @"
printf '%s' '$nginxConfigB64' | base64 -d > /etc/nginx/sites-available/$NginxSite
ln -sf /etc/nginx/sites-available/$NginxSite /etc/nginx/sites-enabled/$NginxSite
nginx -t
systemctl reload nginx
"@
  Write-Host "✅ Nginx configurado e recarregado" -ForegroundColor Green
}

# ====================
# 6. VERIFICAÇÃO
# ====================
Write-Step "Verificando deploy..."
Start-Sleep -Seconds 2

try {
  $response = Invoke-WebRequest -Uri "https://$Domain" -Method GET -TimeoutSec 15 -UseBasicParsing
  if ($response.StatusCode -eq 200) {
    Write-Host "✅ App respondendo (HTTPS): $Domain" -ForegroundColor Green
  }
} catch {
  Write-Host "⚠️ Verificação falhou, mas deploy pode ter sido bem sucedido" -ForegroundColor Yellow
  Write-Host "Verifique manualmente: https://$Domain" -ForegroundColor Yellow
}

# ====================
# 7. LIMPEZA LOCAL
# ====================
Write-Host "`nLimpando arquivos locais..." -ForegroundColor Gray
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

Write-Host "`n✨ DEPLOY CONCLUÍDO! ✨" -ForegroundColor Green
Write-Host "Acesse: https://$Domain" -ForegroundColor Cyan
Write-Host "`nNOTA: Configure SSL/HTTPS com certbot:" -ForegroundColor Yellow
Write-Host "  sudo certbot --nginx -d $Domain" -ForegroundColor Gray
