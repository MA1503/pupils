#!/bin/sh
set -euo pipefail

TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/backups/pupils-${TS}.json"

echo "=== Backup Start: ${TS} ==="

# 1. Vollständiger Dump der pupils-DB (alle Dokumente inkl. _rev)
curl -sf \
  -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
  "${COUCHDB_URL}/pupils/_all_docs?include_docs=true" \
  > "${OUT}"

echo "Dump: ${OUT}"

# 2. Sanity-Check: JSON valide und mindestens 1 Dokument vorhanden
node -e "
  const fs = require('fs');
  const j = JSON.parse(fs.readFileSync('${OUT}', 'utf8'));
  if (!j.rows || j.rows.length === 0) {
    console.error('Backup leer oder ungültig!');
    process.exit(1);
  }
  console.log('Docs gesichert:', j.total_rows);
"

# 3. Upload zu filen.io (localToCloud = nur lokale Änderungen hochladen, nichts löschen)
FILEN_OUT=$(filen \
  --email "${FILEN_EMAIL}" \
  --password "${FILEN_PASSWORD}" \
  sync "/backups:localToCloud:${FILEN_REMOTE_DIR}" 2>&1)
echo "${FILEN_OUT}"
if echo "${FILEN_OUT}" | grep -qi "no such cloud"; then
  echo "FEHLER: filen-Zielordner '${FILEN_REMOTE_DIR}' existiert nicht — bitte in filen.io anlegen!"
  exit 1
fi

echo "Upload: OK → ${FILEN_REMOTE_DIR}"

# 4. Lokale Retention: alte Backups löschen
find /backups -name 'pupils-*.json' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
echo "Retention: Dateien älter als ${BACKUP_RETENTION_DAYS} Tage gelöscht"

echo "=== Backup Ende: OK ==="
