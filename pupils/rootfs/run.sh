#!/bin/bash
set -euo pipefail

# ============================================================
# Pupils HAOS Add-on — Main entry script
# Runs as PID 1 in the HAOS container.
# Replaces s6-overlay: HAOS manages its own init, s6-overlay
# cannot be PID 1 when HAOS passes entrypoint args.
# ============================================================

OPTIONS=/data/options.json

# --- Read & validate config from HAOS supervisor ---
TEACHER_PASSWORD=$(jq -r '.teacher_password // empty' "${OPTIONS}")
COUCHDB_PASSWORD=$(jq -r '.couchdb_password // empty' "${OPTIONS}")
FILEN_EMAIL=$(jq -r '.filen_email // ""' "${OPTIONS}")
FILEN_PASSWORD=$(jq -r '.filen_password // ""' "${OPTIONS}")

if [[ -z "${TEACHER_PASSWORD}" ]] || [[ -z "${COUCHDB_PASSWORD}" ]]; then
  echo "[init] FEHLER: teacher_password und couchdb_password müssen gesetzt sein!"
  exit 1
fi

# --- CouchDB Konfiguration ---
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

chown -R couchdb:couchdb /data/couchdb-data
chmod 755 /data/couchdb-data
chmod 755 /data/backups

# --- Backup-Umgebungsvariaten ---
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

# --- CouchDB starten (Hintergrund) ---
echo "[run] CouchDB startet..."
COUCHDB_USER=admin COUCHDB_PASSWORD="${COUCHDB_PASSWORD}" \
  /docker-entrypoint.sh /opt/couchdb/bin/couchdb &
COUCHDB_PID=$!

# --- Warten bis CouchDB bereit ist ---
until curl -sf http://127.0.0.1:5984/ > /dev/null 2>&1; do
  echo "[run] Warte auf CouchDB..."
  sleep 2
done
echo "[run] CouchDB bereit."

# --- DBs und Teacher-User anlegen (idempotent) ---
curl -sf -u "admin:${COUCHDB_PASSWORD}" -X PUT http://127.0.0.1:5984/pupils || true
curl -sf -u "admin:${COUCHDB_PASSWORD}" -X PUT http://127.0.0.1:5984/_users || true

curl -sf -u "admin:${COUCHDB_PASSWORD}" \
  -X PUT http://127.0.0.1:5984/_users/org.couchdb.user:teacher \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"teacher\",\"password\":\"${TEACHER_PASSWORD}\",\"roles\":[],\"type\":\"user\"}" || true

curl -sf -u "admin:${COUCHDB_PASSWORD}" \
  -X PUT http://127.0.0.1:5984/pupils/_security \
  -H "Content-Type: application/json" \
  -d '{"admins":{"names":[],"roles":[]},"members":{"names":["teacher"],"roles":[]}}' || true

echo "[run] DB und Users konfiguriert."

# --- Backup-Cron starten (Hintergrund) ---
supercronic /app/crontab &
echo "[run] Backup-Cron gestartet."

# --- nginx im Vordergrund starten ---
# nginx wird zum Hauptprozess — wenn er stirbt, stirbt der Container.
# CouchDB und supercronic laufen als Kinder und sterben mit.
echo "[run] nginx startet..."
exec nginx -g "daemon off;"
