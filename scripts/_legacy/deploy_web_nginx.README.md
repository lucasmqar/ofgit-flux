# Deploy (SSH) - Web (Vite) + Nginx

This repo is a Vite/React SPA. This script builds `dist/` and publishes it behind Nginx.

## On the server

1) Clone the repo (once):

```bash
mkdir -p /var/www/iflux
cd /var/www/iflux
git clone <YOUR_REPO_URL> .
```

2) Create `.env.production` inside the repo folder:

```bash
nano /var/www/iflux/.env.production
```

Add at least:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3) Run deploy:

```bash
cd /var/www/iflux
chmod +x scripts/deploy_web_nginx.sh
sudo ./scripts/deploy_web_nginx.sh --domain app.iflux.space --repo-dir /var/www/iflux --web-root /var/www/iflux-site
```

To also provision HTTPS:

```bash
sudo ./scripts/deploy_web_nginx.sh --domain app.iflux.space --repo-dir /var/www/iflux --web-root /var/www/iflux-site --with-certbot
```
