# 🚀 Deploy Rápido - IFLUX

Scripts otimizados para deploy via SSH dos domínios do projeto IFLUX.

## 📋 Pré-requisitos

1. **SSH configurado** com acesso ao servidor
2. **Sudo sem senha** ou senha salva no SSH
3. **Nginx instalado** no servidor
4. **Node.js** instalado localmente
5. **OpenSSH client** no Windows (comandos `ssh` e `scp` disponíveis no terminal)

> Nota: SSH usa a porta **22** por padrão. Só informe `-SshPort` se seu servidor estiver em outra porta.

## 🌐 Domínios

### 1. Site Institucional - **iflux.space**

**Deploy:**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-institucional-rapido.ps1 -SshHost usuario@servidor.com
```

**Com chave SSH (recomendado):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-institucional-rapido.ps1 -SshHost deploy@SEU_IP -IdentityFile C:\Users\lucas\.ssh\id_ed25519
```

**Com porta SSH customizada (apenas se necessário):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-institucional-rapido.ps1 -SshHost deploy@SEU_IP -IdentityFile C:\Users\lucas\.ssh\id_ed25519 -SshPort 2222
```

**O que faz:**
- ✅ Build do Vite (se necessário)
- ✅ Cria ZIP otimizado
- ✅ Upload via SCP
- ✅ Publica no servidor em `/var/www/iflux-institucional/current` (deploy atômico)
- ✅ Configura Nginx automaticamente
- ✅ Testa se o site está respondendo

**Opções:**
- `-SkipBuild` - Usa build existente (mais rápido)
- `-SkipNginxConfig` - Não reconfigura Nginx
- `-Domain "outro.dominio.com"` - Usar domínio customizado

### 2. App Principal - **app.iflux.space**

**Deploy:**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-app-rapido.ps1 -SshHost usuario@servidor.com
```

**Com chave SSH (recomendado):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-app-rapido.ps1 -SshHost deploy@SEU_IP -IdentityFile C:\Users\lucas\.ssh\id_ed25519
```

**O que faz:**
- ✅ Build do Vite com .env.production
- ✅ Cria ZIP otimizado
- ✅ Upload via SCP
- ✅ Publica no servidor em `/var/www/iflux-app/current` (deploy atômico)
- ✅ Configura Nginx com SPA routing + HTTPS (80 → 443)
- ✅ Testa se o app está respondendo

**Opções:**
- `-SkipBuild` - Usa build existente
- `-SkipNginxConfig` - Não reconfigura Nginx
- `-Domain "outro.dominio.com"` - Usar domínio customizado

**Nota (SSL):**
- O script assume que existe certificado em `/etc/letsencrypt/live/<domínio>/`.
- Se ainda não existir, rode no servidor: `sudo certbot --nginx -d app.iflux.space`.

## ⚡ Fluxo Rápido Completo

```powershell
# 1. Deploy institucional
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-institucional-rapido.ps1 -SshHost root@seuservidor.com

# 2. Deploy app
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-app-rapido.ps1 -SshHost root@seuservidor.com

# 3. Configurar SSL (no servidor)
sudo certbot --nginx -d iflux.space -d www.iflux.space
sudo certbot --nginx -d app.iflux.space
```

## 🔧 Configuração do Servidor

### Primeiro Deploy (configuração inicial)

1. **Instalar dependências:**
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx unzip
```

2. **Criar usuário deploy (opcional mas recomendado):**
```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo visudo  # Adicionar: deploy ALL=(ALL) NOPASSWD: ALL
```

3. **Configurar SSH Key:**
```powershell
# No Windows
ssh-copy-id deploy@seuservidor.com
```

### Estrutura de Diretórios no Servidor

```
/var/www/
├── iflux-institucional/     # Site institucional (iflux.space)
│   ├── current -> releases/<zip>/
│   └── releases/
├── iflux-app/               # App principal (app.iflux.space)
│   ├── current -> releases/<zip>/
│   └── releases/
```

### Configuração Nginx

Os scripts criam automaticamente:
- `/etc/nginx/sites-available/iflux-institucional`
- `/etc/nginx/sites-available/iflux-app`

## 📊 Checklist de Deploy

### Antes do Deploy

- [ ] Testar build localmente: `npm run build` ou `pnpm build`
- [ ] Verificar .env.production configurado
- [ ] Confirmar SSH funcionando: `ssh usuario@servidor`
- [ ] Backup dos arquivos atuais no servidor (se necessário)

### Após Deploy

- [ ] Testar http://iflux.space
- [ ] Testar http://app.iflux.space
- [ ] Configurar SSL com certbot
- [ ] Testar https://iflux.space
- [ ] Testar https://app.iflux.space
- [ ] Verificar Supabase redirect URLs no Dashboard
- [ ] Testar login com Google OAuth
- [ ] Testar checkout Stripe

## 🔒 SSL/HTTPS

Após primeiro deploy com sucesso, configure SSL:

```bash
# No servidor
sudo certbot --nginx -d iflux.space -d www.iflux.space
sudo certbot --nginx -d app.iflux.space

# Testar renovação automática
sudo certbot renew --dry-run
```

## 🐛 Troubleshooting

### Porta do SSH
- Se você não informar porta nenhuma, o `ssh/scp` usa **22** automaticamente.
- Se seu VPS estiver em outra porta, use `-SshPort 2222` (exemplo).

### "Connection refused"
- Verificar se SSH está rodando: `sudo systemctl status sshd`
- Verificar firewall: `sudo ufw status`

### "Permission denied"
- Verificar se usuário tem sudo: `sudo -l`
- Configurar NOPASSWD no visudo

### "Nginx test failed"
- Ver erros: `sudo nginx -t`
- Ver logs: `sudo tail -f /var/log/nginx/error.log`

### Diagnóstico rápido (recomendado)
Rode o script de diagnóstico para coletar `nginx -t`, status e logs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\server-diagnose.ps1 -SshHost deploy@SEU_IP -IdentityFile C:\Users\lucas\.ssh\id_ed25519
```

## 🧹 Organização de scripts

Scripts antigos de deploy foram movidos para:
- `scripts/_legacy/`

### "Site não carrega"
- Verificar se Nginx está rodando: `sudo systemctl status nginx`
- Verificar portas: `sudo netstat -tlnp | grep nginx`
- Verificar DNS: `nslookup iflux.space`

## 📝 Logs

### No servidor:
```bash
# Nginx access
sudo tail -f /var/log/nginx/access.log

# Nginx errors
sudo tail -f /var/log/nginx/error.log

# Verificar configuração
sudo nginx -T
```

## 🎯 Próximos Passos

1. **Configurar Supabase Auth URLs:**
   - Adicionar `https://iflux.space` em Redirect URLs
   - Adicionar `https://app.iflux.space` em Redirect URLs

2. **Testar fluxos críticos:**
   - Login institucional → Checkout → Redirect
   - Login app → Dashboard
   - OAuth Google

3. **Monitoramento:**
   - Configurar uptime monitoring
   - Configurar logs centralizados (opcional)

## 📚 Comandos Úteis

```powershell
# Build local sem deploy
cd institucional\flux-institucional
pnpm build

# Build do app
npm run build

# Ver tamanho do build
Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum

# Limpar builds antigos
Remove-Item dist -Recurse -Force
```
