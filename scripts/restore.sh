#!/bin/bash
# Restore eines Backup-JSON in eine CouchDB-Instanz
# Usage: ./scripts/restore.sh <backup-file.json> [couchdb-url] [user] [password]
#
# Beispiel:
#   ./scripts/restore.sh /backups/pupils-20260414T020000Z.json \
#     http://localhost:5984 admin geheim123
#
# ACHTUNG: Überschreibt bestehende Dokumente (update_seq-Konflikte werden ignoriert).
# Für eine frische Instanz vorher: curl -X DELETE .../pupils && curl -X PUT .../pupils

set -euo pipefail

# Temp-File bei Exit/Fehler automatisch löschen (Finding 10)
TMPFILE="$(mktemp /tmp/pupils-restore-bulk-XXXXXX.json)"
trap 'rm -f "${TMPFILE}"' EXIT INT TERM

BACKUP_FILE="${1:?Backup-Datei fehlt. Usage: $0 <file.json> [url] [user] [pass]}"
COUCH_URL="${2:-http://localhost:5984}"
COUCH_USER="${3:-admin}"
COUCH_PASS="${4:-}"

DB_URL="${COUCH_URL}/pupils"

echo "Restore: ${BACKUP_FILE} → ${DB_URL}"

# Dokumente aus dem allDocs-Format extrahieren und _rev entfernen
# (frische DB hat keine _rev → Import würde sonst mit 409 Conflict scheitern)
node -e "
  const fs = require('fs');
  const backup = JSON.parse(fs.readFileSync('${BACKUP_FILE}', 'utf8'));
  const docs = backup.rows
    .map(r => r.doc)
    .filter(d => d && !d._id.startsWith('_design/'))
    .map(d => { const { _rev, ...rest } = d; return rest; });
  const bulk = { docs };
  fs.writeFileSync('${TMPFILE}', JSON.stringify(bulk));
  console.log('Dokumente für Restore:', docs.length);
"

# Ziel-DB anlegen (falls nicht vorhanden)
curl -sf -u "${COUCH_USER}:${COUCH_PASS}" -X PUT "${DB_URL}" || true

# Bulk-Import
RESULT=$(curl -sf -u "${COUCH_USER}:${COUCH_PASS}" \
  -X POST "${DB_URL}/_bulk_docs" \
  -H "Content-Type: application/json" \
  -d @"${TMPFILE}")

echo "Ergebnis: ${RESULT}" | head -c 200
echo ""

# Aufräumen
rm -f "${TMPFILE}"

echo "=== Restore abgeschlossen ==="
