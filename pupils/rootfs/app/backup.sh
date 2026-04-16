#!/bin/bash
set -euo pipefail

TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/data/backups/pupils-${TS}.json"

echo "=== Backup Start: ${TS} ==="

curl -sf \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  "${COUCHDB_URL}/pupils/_all_docs?include_docs=true" \
  > "${OUT}"

echo "Dump: ${OUT}"

node -e "
  const fs = require('fs');
  const j = JSON.parse(fs.readFileSync('${OUT}', 'utf8'));
  if (!j.rows || j.rows.length === 0) {
    console.error('Backup leer oder ungültig!');
    process.exit(1);
  }
  console.log('Docs gesichert:', j.total_rows);
"

if [[ -z "${FILEN_EMAIL:-}" ]] || [[ -z "${FILEN_PASSWORD:-}" ]] || [[ -z "${FILEN_API_KEY:-}" ]]; then
  echo "Upload: übersprungen (FILEN_EMAIL, FILEN_PASSWORD und FILEN_API_KEY müssen alle gesetzt sein)"
else
  RCLONE_CONF=$(mktemp)
  chmod 600 "${RCLONE_CONF}"
  FILEN_PASS_OBF=$(rclone obscure "${FILEN_PASSWORD}")
  FILEN_KEY_OBF=$(rclone obscure "${FILEN_API_KEY}")
  cat > "${RCLONE_CONF}" << RCLONE_EOF
[filen]
type = filen
email = ${FILEN_EMAIL}
password = ${FILEN_PASS_OBF}
api_key = ${FILEN_KEY_OBF}
RCLONE_EOF

  RCLONE_OUT=0
  rclone copy /data/backups/ "filen:${FILEN_REMOTE_DIR}" \
    --config "${RCLONE_CONF}" \
    --transfers=1 \
    --verbose 2>&1 || RCLONE_OUT=$?

  rm -f "${RCLONE_CONF}"

  if [[ "${RCLONE_OUT}" -ne 0 ]]; then
    echo "FEHLER: rclone Upload fehlgeschlagen (exit ${RCLONE_OUT})"
    exit 1
  fi
  echo "Upload: OK → ${FILEN_REMOTE_DIR}"
fi

find /data/backups -name 'pupils-*.json' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
echo "Retention: Dateien älter als ${BACKUP_RETENTION_DAYS} Tage gelöscht"

echo "=== Backup Ende: OK ==="
