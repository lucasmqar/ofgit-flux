# Diagnóstico rápido do servidor (Nginx + webroots)
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\scripts\server-diagnose.ps1 -SshHost deploy@IP
#   powershell -ExecutionPolicy Bypass -File .\scripts\server-diagnose.ps1 -SshHost deploy@IP -IdentityFile C:\Users\lucas\.ssh\id_ed25519
#   powershell -ExecutionPolicy Bypass -File .\scripts\server-diagnose.ps1 -SshHost deploy@IP -SshPort 2222

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SshHost,

  [string]$IdentityFile,
  [int]$SshPort
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Invoke-Remote([string]$cmd) {
  $cmd = $cmd -replace "`r`n", "`n" -replace "`r", ""
  $escaped = $cmd -replace "'", "'\\''"
  $hostValue = Normalize-SshHost $SshHost
  $sshArgs = Get-SshBaseArgs
  & ssh @sshArgs $hostValue "sudo bash -lc '$escaped'" 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed" }
}

Write-Host "\n==> Diagnóstico Nginx/Server" -ForegroundColor Cyan

Invoke-Remote @'
set -e

echo "--- Host / time ---"
hostname || true
date || true

echo "\n--- SSHD ---"
systemctl status ssh --no-pager || systemctl status sshd --no-pager || true

echo "\n--- Nginx status ---"
systemctl status nginx --no-pager || true

echo "\n--- Nginx config test ---"
nginx -t || true

echo "\n--- Enabled sites ---"
ls -la /etc/nginx/sites-enabled || true

echo "\n--- Recent Nginx errors (last 200 lines) ---"
tail -n 200 /var/log/nginx/error.log || true

echo "\n--- Webroots (current symlinks) ---"
for d in /var/www/iflux-institucional /var/www/iflux-app; do
  if [ -e "$d" ]; then
    echo "\n[$d]"
    ls -la "$d" || true
    if [ -L "$d/current" ]; then
      echo "current -> $(readlink -f "$d/current" || true)"
      ls -la "$d/current" | head -n 50 || true
    fi
  fi
done
'@

Write-Host "\n✅ Diagnóstico concluído." -ForegroundColor Green
