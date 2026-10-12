#!/usr/bin/env bash
# One-shot server setup for Snackade on a fresh Ubuntu VM (Oracle Cloud Always Free Arm, or any Ubuntu 22.04/24.04).
#
#   git clone https://github.com/breadpitt911/snackade.git && cd snackade
#   sudo ./deploy/setup.sh --domain snackade.com --games-domain play.snackade.com --tunnel-token <TOKEN>
#
# What it does: installs Node 22 + cloudflared, copies the app to /opt/snackade, keeps data in
# /var/lib/snackade, runs it as a locked-down systemd service on 127.0.0.1:8080, connects the
# Cloudflare Tunnel, and sets up nightly backups. Safe to re-run.
set -euo pipefail

DOMAIN="" GAMES_DOMAIN="" TOKEN="" ADMINS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --games-domain) GAMES_DOMAIN="$2"; shift 2 ;;
    --tunnel-token) TOKEN="$2"; shift 2 ;;
    --admins) ADMINS="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done
[[ $EUID -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -n "$DOMAIN" && -n "$GAMES_DOMAIN" ]] || { echo "Need --domain and --games-domain (e.g. --domain snackade.com --games-domain play.snackade.com)"; exit 1; }
[[ "$DOMAIN" != "$GAMES_DOMAIN" ]] || { echo "The games domain has to be different from the site domain."; exit 1; }

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP=/opt/snackade DATA=/var/lib/snackade ENVF=/etc/snackade.env

echo "==> Packages"
apt-get update -qq
apt-get install -y -qq curl git sqlite3 ca-certificates gnupg rsync >/dev/null
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".").map(Number).reduce((a,b,i)=>a+b*[1e6,1e3,1][i],0)')" -lt 22013000 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "    node $(node -v)"

echo "==> App user and folders"
id snackade >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin snackade
mkdir -p "$APP" "$DATA" /var/backups/snackade
rsync -a --delete --exclude node_modules --exclude data --exclude .git "$SRC/" "$APP/"
(cd "$APP" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
chown -R root:root "$APP"
chown -R snackade:snackade "$DATA"
chmod 750 "$DATA"

echo "==> Config ($ENVF)"
if [[ ! -f "$ENVF" ]]; then
  cat > "$ENVF" <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=8080
GAMES_PORT=8080
SITE_ORIGIN=https://$DOMAIN
GAMES_ORIGIN=https://$GAMES_DOMAIN
DATA_DIR=$DATA
ADMIN_USERNAMES=$ADMINS
# GITHUB_TOKEN=   # optional: higher GitHub rate limits for repo imports
EOF
  chmod 640 "$ENVF"; chgrp snackade "$ENVF"
else
  echo "    keeping existing $ENVF"
fi

echo "==> systemd service"
install -m 644 "$APP/deploy/snackade.service" /etc/systemd/system/snackade.service
systemctl daemon-reload
systemctl enable --now snackade >/dev/null
systemctl restart snackade
sleep 2
curl -fsS -o /dev/null -H "Host: $DOMAIN" http://127.0.0.1:8080/ && echo "    site is answering locally" || { echo "    site didn't start. Check: journalctl -u snackade -n 50"; exit 1; }

echo "==> Cloudflare Tunnel"
if ! command -v cloudflared >/dev/null; then
  mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -qq && apt-get install -y -qq cloudflared >/dev/null
fi
if [[ -n "$TOKEN" ]]; then
  if systemctl list-unit-files | grep -q '^cloudflared.service'; then
    echo "    cloudflared service already installed (to change the token: cloudflared service uninstall, then re-run)"
  else
    cloudflared service install "$TOKEN" >/dev/null 2>&1
    echo "    tunnel connected"
  fi
else
  echo "    no --tunnel-token given; run 'sudo cloudflared service install <TOKEN>' when you have it"
fi

echo "==> Nightly backups (03:30, keeps 14)"
install -m 755 "$APP/deploy/backup.sh" /usr/local/bin/snackade-backup
echo "30 3 * * * root /usr/local/bin/snackade-backup >/dev/null 2>&1" > /etc/cron.d/snackade-backup

echo
echo "Done. Next: make sure both hostnames point at this tunnel in Cloudflare (see DEPLOY.md),"
echo "then open https://$DOMAIN and create your account first. The first account is the admin."
