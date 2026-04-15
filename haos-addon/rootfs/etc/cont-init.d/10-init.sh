#!/command/with-contenv bash
set -euo pipefail

# Im lokalen Test: /data/options.json muss manuell bereitgestellt werden
# Im HAOS-Add-on: wird automatisch vom Supervisor geschrieben
OPTIONS=/data/options.json

TEACHER_PASSWORD=$(jq -r '.teacher_password // empty' "${OPTIONS}")
COUCHDB_PASSWORD=$(jq -r '.couchdb_password // empty' "${OPTIONS}")
FILEN_EMAIL=$(jq -r '.filen_email // ""' "${OPTIONS}")
FILEN_PASSWORD=$(jq -r '.filen_password // ""' "${OPTIONS}")

if [[ -z "${TEACHER_PASSWORD}" ]] || [[ -z "${COUCHDB_PASSWORD}" ]]; then
  echo "[init] FEHLER: teacher_password und couchdb_password müssen gesetzt sein!"
  exit 1
fi

# Persistente Verzeichnisse
mkdir -p /data/couchdb-data /data/backups

mkdir -p /opt/couchdb/etc/local.d
cat > /opt/couchdb/etc/local.d/local.ini << EOF
[couchdb]
database_dir = /data/couchdb-data
view_index_dir = /data/couchdb-data

[chttpd]
bind_address = 127.0.0.1
port = 5984

[cors]
enable = false
EOF

mkdir -p /data/couchdb-data /data/backups
chown -R couchdb:couchdb /data/couchdb-data
chmod 755 /data/couchdb-data
# /data/backups bleibt root-owned — supercronic läuft als root und schreibt dort JSON-Dumps
chmod 755 /data/backups

echo "[init] CouchDB admin wird per env COUCHDB_PASSWORD gesetzt (entrypoint handled das)."

# Backup-Env für backup.sh
cat > /app/backup.env << EOF
COUCHDB_URL=http://127.0.0.1:5984
COUCHDB_USER=admin
COUCHDB_PASSWORD=${COUCHDB_PASSWORD}
FILEN_EMAIL=${FILEN_EMAIL}
FILEN_PASSWORD=${FILEN_PASSWORD}
FILEN_REMOTE_DIR=/pupils-backups
BACKUP_RETENTION_DAYS=30
EOF

echo "[init] Konfiguration abgeschlossen."
