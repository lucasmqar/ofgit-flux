#!/usr/bin/env bash
set -euo pipefail

DOMAIN=""
REPO_DIR=""
WEB_ROOT="/var/www/iflux-site"
NGINX_SITE_NAME="iflux"
SKIP_APT=0
SKIP_NODE=0
SKIP_CERTBOT=1

usage() {
  cat <<'EOF'
Usage:
  deploy_web_nginx.sh --domain <domain> --repo-dir <path> [--web-root <path>] [--nginx-site <name>]
                     [--with-certbot] [--skip-apt] [--skip-node]

What it does:
  - (Optional) installs nginx/git/curl/nodejs
  - pulls latest code in repo
  - npm ci && npm run build
  - publishes dist/ to web root
  - configures nginx for SPA (try_files -> /index.html)
  - (Optional) runs certbot --nginx

Requirements:
  - Run as root (or with sudo) on Ubuntu/Debian.
  - Ensure .env.production exists in repo dir (VITE_* vars).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="$2"; shift 2;;
    --repo-dir)
      REPO_DIR="$2"; shift 2;;
    --web-root)
      WEB_ROOT="$2"; shift 2;;
    --nginx-site)
      NGINX_SITE_NAME="$2"; shift 2;;
    --with-certbot)
      SKIP_CERTBOT=0; shift 1;;
    --skip-apt)
      SKIP_APT=1; shift 1;;
    --skip-node)
      SKIP_NODE=1; shift 1;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$DOMAIN" || -z "$REPO_DIR" ]]; then
  usage
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

if [[ ! -d "$REPO_DIR" ]]; then
  echo "Repo dir not found: $REPO_DIR" >&2
  exit 1
fi

if [[ $SKIP_APT -eq 0 ]]; then
  apt-get update
  apt-get install -y nginx git curl
fi

if [[ $SKIP_NODE -eq 0 ]]; then
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
fi

cd "$REPO_DIR"

echo "[1/6] Checking .env.production" 
if [[ ! -f .env.production ]]; then
  echo "Missing .env.production in $REPO_DIR" >&2
  echo "Create it with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (and any other VITE_* vars)." >&2
  exit 1
fi

echo "[2/6] Pulling latest code" 
if command -v git >/dev/null 2>&1 && [[ -d .git ]]; then
  git fetch --all
  git pull --ff-only
else
  echo "Warning: not a git repo; skipping git pull" >&2
fi

echo "[3/6] Installing deps + building" 
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build

if [[ ! -d dist ]]; then
  echo "Build failed: dist/ not found" >&2
  exit 1
fi

echo "[4/6] Publishing to web root: $WEB_ROOT" 
mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
cp -r dist/* "$WEB_ROOT"/

echo "[5/6] Configuring nginx: $NGINX_SITE_NAME ($DOMAIN)" 
cat > "/etc/nginx/sites-available/${NGINX_SITE_NAME}" <<EOF
server {
  listen 80;
  server_name ${DOMAIN};

  root ${WEB_ROOT};
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

ln -sf "/etc/nginx/sites-available/${NGINX_SITE_NAME}" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"

nginx -t
systemctl reload nginx

if [[ $SKIP_CERTBOT -eq 0 ]]; then
  echo "[6/6] Obtaining HTTPS certificate (certbot)" 
  if [[ $SKIP_APT -eq 0 ]]; then
    apt-get install -y certbot python3-certbot-nginx
  else
    if ! command -v certbot >/dev/null 2>&1; then
      echo "certbot not installed and --skip-apt used" >&2
      exit 1
    fi
  fi
  certbot --nginx -d "$DOMAIN"
else
  echo "[6/6] Skipping certbot (run with --with-certbot to enable)" 
fi

echo "Done. Try: curl -I http://localhost" 
