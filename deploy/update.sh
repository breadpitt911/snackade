#!/usr/bin/env bash
# Pull the latest code from GitHub and restart. Run from your clone:  sudo ./deploy/update.sh
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo."; exit 1; }
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sudo -u "${SUDO_USER:-root}" git -C "$SRC" pull --ff-only
/usr/local/bin/snackade-backup || true
rsync -a --delete --exclude node_modules --exclude data --exclude .git "$SRC/" /opt/snackade/
(cd /opt/snackade && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
systemctl restart snackade
sleep 2
systemctl is-active --quiet snackade && echo "Updated and running." || { echo "It didn't come back up. Check: journalctl -u snackade -n 50"; exit 1; }
