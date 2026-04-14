#!/bin/bash
set -euo pipefail

# Im Init-Container: COUCHDB_HOST=http://couchdb:5984 (Docker-Netzwerk)
# Standalone/Dev:    COUCHDB_HOST=http://localhost:5984 (Fallback)
HOST="${COUCHDB_HOST:-http://localhost:5984}"
AUTH="${COUCHDB_USER}:${COUCHDB_PASSWORD}"

# Warten bis CouchDB bereit ist
until curl -sf -u "${AUTH}" "${HOST}/_up" > /dev/null; do
  echo "Warte auf CouchDB…"
  sleep 2
done
echo "CouchDB bereit."

# System-Datenbanken anlegen
for db in _users _replicator _global_changes; do
  curl -sf -u "${AUTH}" -X PUT "${HOST}/${db}" || true
  echo "DB ${db}: OK"
done

# CORS aktivieren (für PouchDB aus dem Browser)
# COUCHDB_CORS_ORIGIN muss die URL sein, unter der die App erreichbar ist.
# Beispiel: http://192.168.1.100:8099 oder https://pupils.tail.ts.net
# Für lokale Entwicklung: http://localhost:8099
# Leer = CORS deaktiviert (nur Same-Origin).
CORS_ORIGIN="${COUCHDB_CORS_ORIGIN:-}"
if [[ -n "${CORS_ORIGIN}" ]]; then
  curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/httpd/enable_cors" \
    -d '"true"' -H "Content-Type: application/json"
  curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/origins" \
    -d "\"${CORS_ORIGIN}\"" -H "Content-Type: application/json"
  curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/credentials" \
    -d '"true"' -H "Content-Type: application/json"
  echo "CORS aktiviert für: ${CORS_ORIGIN}"
  curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/methods" \
    -d '"GET, PUT, POST, HEAD, DELETE"' -H "Content-Type: application/json"
  curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/headers" \
    -d '"accept, authorization, content-type, origin, referer"' \
    -H "Content-Type: application/json"
else
  echo "CORS deaktiviert (COUCHDB_CORS_ORIGIN nicht gesetzt)"
fi

# teacher-User anlegen (App-Login)
curl -sf -u "${AUTH}" -X PUT "${HOST}/_users/org.couchdb.user:teacher" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"teacher\",
    \"password\": \"${TEACHER_PASSWORD}\",
    \"roles\": [],
    \"type\": \"user\"
  }" || true
echo "User teacher: OK"

# pupils-Datenbank anlegen
curl -sf -u "${AUTH}" -X PUT "${HOST}/pupils" || true

# Security: Nur teacher als Member, keine öffentliche Leseberechtigung
curl -sf -u "${AUTH}" -X PUT "${HOST}/pupils/_security" \
  -H "Content-Type: application/json" \
  -d '{
    "admins": {"names": [], "roles": []},
    "members": {"names": ["teacher"], "roles": []}
  }'
echo "DB pupils + Security: OK"

echo "=== CouchDB Setup abgeschlossen ==="
