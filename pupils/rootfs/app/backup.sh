#!/bin/bash
set -euo pipefail

TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/data/backups/pupils-${TS}.json"

# Filen-Credentials direkt aus options.json lesen (robust gegen HAOS-Template-Substitution)
FILEN_EMAIL=$(jq -r '.filen_email // empty' /data/options.json)
FILEN_PASSWORD=$(jq -r '.filen_password // empty' /data/options.json)

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

if [[ -z "${FILEN_EMAIL:-}" ]] || [[ -z "${FILEN_PASSWORD:-}" ]]; then
  echo "Upload: übersprungen (keine Filen-Zugangsdaten gesetzt)"
else
  FILEN_OUT=0
  filen \
    --email "${FILEN_EMAIL}" \
    --password "${FILEN_PASSWORD}" \
    --config-dir /data/filen-cli \
    --skip-update \
    rclone copy /data/backups/ "filen:${FILEN_REMOTE_DIR}" 2>&1 || FILEN_OUT=$?
  if [[ "${FILEN_OUT}" -ne 0 ]]; then
    echo "FEHLER: filen Upload fehlgeschlagen (exit ${FILEN_OUT})"
    exit 1
  fi
  echo "Upload: OK → ${FILEN_REMOTE_DIR}"
fi

find /data/backups -name 'pupils-*.json' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
echo "Retention: Dateien älter als ${BACKUP_RETENTION_DAYS} Tage gelöscht"

echo "=== Backup Ende: OK ==="
