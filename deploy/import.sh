#!/usr/bin/env bash
# Import a game from GitHub as an official game on the live server.
#   sudo ./deploy/import.sh https://github.com/you/game --title "My Game" --category shooter --featured
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ $# -ge 1 ]] || { echo "Usage: sudo ./deploy/import.sh <github url> [--title ...] [--category ...] [--featured]"; exit 1; }
cd /opt/snackade
sudo -u snackade bash -c 'set -a; source /etc/snackade.env; set +a; exec node --disable-warning=ExperimentalWarning scripts/import-github.js "$@"' _ "$@"
