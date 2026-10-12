#!/usr/bin/env bash
# Snapshot the database (safely, while running) plus uploaded games and covers. Keeps the last 14.
set -euo pipefail
DATA=${DATA_DIR:-/var/lib/snackade}
OUT=/var/backups/snackade
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
sqlite3 "$DATA/snackade.db" ".backup '$TMP/snackade.db'"
tar -C "$DATA" -czf "$TMP/files.tgz" games covers 2>/dev/null || true
tar -C "$TMP" -czf "$OUT/snackade-$STAMP.tgz" snackade.db files.tgz
ls -1t "$OUT"/snackade-*.tgz | tail -n +15 | xargs -r rm -f
echo "Backup written: $OUT/snackade-$STAMP.tgz"
