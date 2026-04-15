# Pupils App — HAOS Add-on (Session 5a + 5b)

## Kontext

SvelteKit PWA + CouchDB-Stack für eine Musiklehrerin.
MVP fertig und lokal getestet (Backup läuft, Tailscale verbunden).

**Deployment-Ziel:** Raspberry Pi 4B 4GB (aarch64) mit HAOS und Tailscale.
**Anforderung:** 3+ Jahre wartbar ohne Linux-Wissen — Updates per HAOS-UI.

Der bestehende Docker-Compose-Stack (`stack/`) bleibt unverändert als Dev-Umgebung.
Für HAOS wird ein Add-on im selben Repo als Unterordner `haos-addon/` gebaut.

**Repo bleibt privat während der Entwicklung — nach Session 5b public machen.**

---

## Versioning

### `version.json` (Root-Level)

```json
{
  "version": "1.0.0"
}
```

### `CHANGELOG.md` (Root-Level)

```markdown
# Changelog

## v1.0.0 — 2026-04-15

### MVP
- SvelteKit PWA mit PouchDB-Sync
- CouchDB-Backend in Docker
- Backup nach filen.io via supercronic (täglich 02:00)
- /heute-Seite mit Tagesansicht
- Archiv-Toggle für inaktive Schüler
- Setup-Seite für CouchDB-Verbindung
```

---

## Session 5a — HAOS Add-on: lokaler Build + Docker-Test

**Ziel:** Add-on als Docker-Image lokal bauen und testen.
Kein GitHub nötig, kein HAOS nötig — nur `docker build` + `docker run`.

### Repo-Struktur nach Session 5a

```
pupils/
├── haos-addon/
│   ├── Dockerfile
│   ├── config.yaml
│   └── rootfs/
│       ├── etc/
│       │   ├── cont-init.d/
│       │   │   └── 10-init.sh
│       │   ├── services.d/
│       │   │   ├── couchdb/
│       │   │   │   ├── run
│       │   │   │   └── finish
│       │   │   ├── nginx/
│       │   │   │   ├── run
│       │   │   │   └── finish
│       │   │   └── cron/
│       │   │       ├── run
│       │   │       └── finish
│       │   └── nginx/
│       │       └── conf.d/
│       │           └── default.conf
│       └── app/
│           ├── backup.sh
│           └── crontab
├── app/
├── stack/
├── scripts/
├── version.json
├── CHANGELOG.md
└── TASK.md
```

---

### `haos-addon/Dockerfile`

Build-Context ist das **Repo-Root** (nicht `haos-addon/`):

```dockerfile
# Build-Context: Repo-Root (damit app/ erreichbar ist)

# Stage 1: SvelteKit bauen
FROM node:20-alpine AS app-builder
WORKDIR /build
COPY app/package*.json ./
RUN npm ci
COPY app/ .
RUN npm run build

# Stage 2: Runtime
FROM couchdb:3.3.3

ARG S6_OVERLAY_VERSION=3.2.0.2

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx curl xz-utils ca-certificates nodejs npm jq \
    && rm -rf /var/lib/apt/lists/*

# s6-overlay (multi-arch: erkennt Arch automatisch)
RUN ARCH=$(uname -m) && \
    curl -fsSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz" \
      | tar -Jxp -C / && \
    curl -fsSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${ARCH}.tar.xz" \
      | tar -Jxp -C /

# supercronic (multi-arch: erkennt Arch automatisch)
RUN ARCH=$(uname -m) && \
    case "${ARCH}" in \
      x86_64) SUPERCRONIC_ARCH=amd64 ;; \
      aarch64) SUPERCRONIC_ARCH=arm64 ;; \
      *) echo "Unsupported arch: ${ARCH}" && exit 1 ;; \
    esac && \
    curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-${SUPERCRONIC_ARCH}" \
    && chmod +x /usr/local/bin/supercronic

# filen CLI
RUN npm install -g @filen/cli

# Statische App-Dateien aus Stage 1
COPY --from=app-builder /build/build /var/www/pupils/

# rootfs (Services + Scripts)
COPY haos-addon/rootfs/ /

RUN chmod +x /etc/cont-init.d/10-init.sh \
    && chmod +x /etc/services.d/couchdb/run /etc/services.d/couchdb/finish \
    && chmod +x /etc/services.d/nginx/run /etc/services.d/nginx/finish \
    && chmod +x /etc/services.d/cron/run /etc/services.d/cron/finish \
    && chmod +x /app/backup.sh

EXPOSE 8099

ENTRYPOINT ["/init"]
```

---

### `haos-addon/rootfs/etc/cont-init.d/10-init.sh`

```bash
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

# CouchDB konfigurieren
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

# COUCHDB_PASSWORD wird per env COUCHDB_PASSWORD gesetzt (entrypoint handled das)

# Persistente Verzeichnisse anlegen und Rechte setzen
mkdir -p /data/couchdb-data /data/backups
chown -R couchdb:couchdb /data/couchdb-data /data/backups
chmod 755 /data/couchdb-data /data/backups

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
```

---

### `haos-addon/rootfs/etc/services.d/couchdb/run`

```bash
#!/command/with-contenv bash
exec /docker-entrypoint.sh /opt/couchdb/bin/couchdb
```

### `haos-addon/rootfs/etc/services.d/couchdb/finish`

```bash
#!/usr/bin/execlineb -S1
s6-svc -t .
```

---

### `haos-addon/rootfs/etc/services.d/nginx/run`

```bash
#!/command/with-contenv bash

# Warte bis CouchDB bereit ist
until curl -sf http://127.0.0.1:5984/ > /dev/null 2>&1; do
  echo "[nginx] Warte auf CouchDB..."
  sleep 2
done

# pupils-DB und _users-DB anlegen (idempotent)
COUCHDB_PASSWORD=$(jq -r '.couchdb_password' /data/options.json)
TEACHER_PASSWORD=$(jq -r '.teacher_password' /data/options.json)

curl -sf -u "admin:${COUCHDB_PASSWORD}" -X PUT http://127.0.0.1:5984/pupils || true
curl -sf -u "admin:${COUCHDB_PASSWORD}" -X PUT http://127.0.0.1:5984/_users || true

# teacher-User (CouchDB-User, nicht Admin) — für App-Login
curl -sf -u "admin:${COUCHDB_PASSWORD}" \
  -X PUT http://127.0.0.1:5984/_users/org.couchdb.user:teacher \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"teacher\",\"password\":\"${TEACHER_PASSWORD}\",\"roles\":[],\"type\":\"user\"}" || true

# teacher Lese-/Schreibzugriff auf pupils-DB
curl -sf -u "admin:${COUCHDB_PASSWORD}" \
  -X PUT http://127.0.0.1:5984/pupils/_security \
  -H "Content-Type: application/json" \
  -d '{"admins":{"names":[],"roles":[]},"members":{"names":["teacher"],"roles":[]}}' || true

exec nginx -g "daemon off;"
```

### `haos-addon/rootfs/etc/services.d/nginx/finish`

```bash
#!/usr/bin/execlineb -S1
s6-svc -t .
```

---

### `haos-addon/rootfs/etc/services.d/cron/run`

```bash
#!/command/with-contenv bash
set -a
source /app/backup.env
set +a
exec supercronic /app/crontab
```

### `haos-addon/rootfs/etc/services.d/cron/finish`

```bash
#!/usr/bin/execlineb -S1
s6-svc -t .
```

---

### `haos-addon/rootfs/etc/nginx/conf.d/default.conf`

```nginx
server {
    listen 8099;
    server_name _;

    root /var/www/pupils;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /couchdb/ {
        proxy_pass         http://127.0.0.1:5984/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

---

### `haos-addon/rootfs/app/crontab`

```
0 2 * * * /app/backup.sh
```

---

### `haos-addon/rootfs/app/backup.sh`

```bash
#!/bin/bash
set -euo pipefail

set -a
source /app/backup.env
set +a

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

FILEN_OUT=$(filen \
  --email "${FILEN_EMAIL}" \
  --password "${FILEN_PASSWORD}" \
  sync "/data/backups:localToCloud:${FILEN_REMOTE_DIR}" 2>&1)
echo "${FILEN_OUT}"
if echo "${FILEN_OUT}" | grep -qi "no such cloud"; then
  echo "FEHLER: filen-Ordner '${FILEN_REMOTE_DIR}' existiert nicht!"
  exit 1
fi

echo "Upload: OK → ${FILEN_REMOTE_DIR}"

find /data/backups -name 'pupils-*.json' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
echo "Retention: Dateien älter als ${BACKUP_RETENTION_DAYS} Tage gelöscht"

echo "=== Backup Ende: OK ==="
```

---

### `haos-addon/config.yaml`

```yaml
name: "Yasmins Vocal Lab"
version: "1.0.0"
slug: "pupils"
description: "Schüler-Verwaltung für Gesangslehrerin"
url: "https://github.com/GITHUB_USER/pupils"
arch:
  - aarch64
  - amd64
image: "ghcr.io/GITHUB_USER/pupils-haos-addon-{arch}"
ports:
  8099/tcp: 8099
map:
  - data:rw
environment:
  COUCHDB_USER: admin
  COUCHDB_PASSWORD: "{{couchdb_password}}"
options:
  teacher_password: "changeme"
  couchdb_password: "changeme"
  filen_email: ""
  filen_password: ""
schema:
  teacher_password: "password"
  couchdb_password: "password"
  filen_email: "str"
  filen_password: "password"
panel_icon: "mdi:microphone"
panel_title: "Vocal Lab"
```

---

### App-Änderung: `app/src/routes/setup/+page.svelte`

Setup-URL im HAOS-Add-on vorausfüllen (nginx-Proxy, gleiche Origin):

```typescript
// Im HAOS-Add-on: CouchDB läuft hinter nginx-Proxy auf /couchdb/
// Im Dev-Modus: bleibt leer (manuelle Eingabe)
const isHaosAddon = typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname);
let url = $state(isHaosAddon ? `${window.location.origin}/couchdb/pupils` : '');
```

Fehlermeldung in `connect()`: `00-setup.sh` → `10-init.sh` korrigiert.

---

### Tests (Session 5a)

**Voraussetzung:** `docker` verfügbar, kein HAOS nötig.

```bash
cd /home/ma/Antigravity/pupils

# 1. Image bauen (Build-Context = Repo-Root!)
docker build -f haos-addon/Dockerfile -t pupils-haos-test .

# 2. options.json für Test erstellen
mkdir -p /tmp/pupils-test-data
cat > /tmp/pupils-test-data/options.json << 'EOF'
{
  "teacher_password": "test1234",
  "couchdb_password": "admin1234",
  "filen_email": "",
  "filen_password": ""
}
EOF

# 3. Container starten
docker run -d --name pupils-test \
  -p 8098:8099 \
  -v /tmp/pupils-test-data:/data:rw \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=admin1234 \
  pupils-haos-test

# 4. Logs beobachten
docker logs -f pupils-test
# Erwartet: "[init] Konfiguration abgeschlossen." + "[nginx] Warte auf CouchDB..." + CouchDB startet

# 5. App erreichbar?
curl -sf http://localhost:8098/ | head -5
# → HTML der SvelteKit-App

# 6. CouchDB via Proxy erreichbar?
curl -sf http://localhost:8098/couchdb/
# → {"couchdb":"Welcome",...}

# 7. pupils DB erreichbar?
curl -sf -u admin:admin1234 http://localhost:8098/couchdb/pupils
# → {"db_name":"pupils",...}

# 8. Teacher-Auth funktioniert?
curl -sf -u teacher:test1234 http://localhost:8098/couchdb/pupils/_find \
  -X POST -H 'Content-Type: application/json' \
  -d '{"selector":{"_id":{"$gt":null}}}'
# → {"docs":[...]} (kein unauthorized)

# 9. Setup-URL vorausfüllt? (im Browser: http://localhost:8098/setup)
# → URL-Feld leer (localhost detected)

# 10. Aufräumen
docker rm -f pupils-test
```

---

## Session 5b — GitHub CI + HAOS-Deployment

Session 5b erst starten wenn Session 5a grün ist.

### Was in 5b passiert

1. `repository.yaml` im Repo-Root anlegen (HAOS-Repo-Marker)
2. GitHub Actions Workflow für Multi-Arch-Build (aarch64 + amd64) → GHCR
3. `haos-addon/config.yaml` fertigstellen (Image-URL auf GHCR setzen, GITHUB_USER ersetzen)
4. Repo public machen auf GitHub
5. In HAOS (i3 hier, dann Pi der Lehrerin): Repo-URL eintragen → Add-on installieren → testen
6. Datenmigration vom Dev-Stack in Add-on-CouchDB

---

## Review-Fixes (angewendet vor Commit)

Folgende Issues aus dem Code-Review wurden gefixt:

| Issue | Datei | Fix |
|---|---|---|
| supercronic arch hardcoded amd64 | `Dockerfile` | Auto-detect mit case: x86_64→amd64, aarch64→arm64 |
| finish scripts killten gesamten Container | `*finish` (3x) | `s6-svscanctl -t` → `s6-svc -t .` (nur eigener Service) |
| Keine Validierung options.json | `10-init.sh` | `jq -r '... // empty'` + explizite PW-Prüfung mit exit |
| nginx ohne X-Forwarded-Proto | `default.conf` | Header hinzugefügt |
| Falscher Dateiname in Fehlermeldung | `setup/+page.svelte` | `00-setup.sh` → `10-init.sh` |
| couchdb-DB owner mismatch | `10-init.sh` | `chown -R couchdb:couchdb` + `chmod 755` |
| CouchDB admin nicht gesetzt | `config.yaml` + `10-init.sh` | COUCHDB_PASSWORD per env, `[admins]` aus local.ini entfernt |
| `_users` DB fehlte für teacher-Auth | `nginx/run` | `_users` DB anlegen vor teacher-User |
| nginx `user`-directive falsch platziert | `default.conf` | Directive entfernt (main nginx.conf setzt www-data) |
| `with-contenv` nicht in PATH | `10-init.sh`, alle `*run` | Shebang auf `#!/command/with-contenv` |

---

## Handoff

### Status: **GREEN** — Alle Tests bestanden

### Implemented
Alle Session-5a-Dateien wurden erstellt/aktualisiert:

- `version.json` — existiert bereits mit korrektem Inhalt
- `CHANGELOG.md` — existiert bereits mit korrektem Inhalt
- `haos-addon/Dockerfile` — supercronic auto-arch, kein harter amd64-Fallback
- `haos-addon/config.yaml` — `environment` für COUCHDB_PASSWORD, Schema vollständig
- `haos-addon/rootfs/etc/cont-init.d/10-init.sh` — jq-Validation, chown couchdb, `/command/with-contenv`
- `haos-addon/rootfs/etc/services.d/couchdb/run` — `/command/with-contenv`
- `haos-addon/rootfs/etc/services.d/couchdb/finish` — `s6-svc -t .`
- `haos-addon/rootfs/etc/services.d/nginx/run` — `/command/with-contenv`, `_users` DB
- `haos-addon/rootfs/etc/services.d/nginx/finish` — `s6-svc -t .`
- `haos-addon/rootfs/etc/services.d/cron/run` — `/command/with-contenv`
- `haos-addon/rootfs/etc/services.d/cron/finish` — `s6-svc -t .`
- `haos-addon/rootfs/etc/nginx/conf.d/default.conf` — X-Forwarded-Proto
- `haos-addon/rootfs/app/backup.sh` — unverändert
- `haos-addon/rootfs/app/crontab` — unverändert
- `app/src/routes/setup/+page.svelte` — HAOS-Erkennung, Fehlertext-Korrektur

### Test results
- [x] Docker build erfolgreich (amd64)
- [x] CouchDB startet mit admin user aus env
- [x] nginx startet ohne emerg errors
- [x] App erreichbar über Port 8098
- [x] CouchDB Proxy `/couchdb/` funktioniert
- [x] pupils-DB existiert
- [x] _users-DB existiert
- [x] teacher-User kann sich authentifizieren

### Deviations from plan
- `version.json` und `CHANGELOG.md` existierten bereits
- couchdb ini-Dateiname: `haos.ini` → `local.ini` (CouchDB liest nur `local.ini`)
- CouchDB admin: aus env statt aus ini (entrypoint-resistent)
- `_users` DB: wird in nginx/run erstellt (nicht in init, da _users DB erst nach CouchDB-Start existiert)
- Alle Review-Fixes wurden angewendet

### Open points
- config.yaml: `GITHUB_USER` muss in Session 5b ersetzt werden
- GitHub Actions multi-arch build für aarch64 testen
- Backup mit echten filen.io Credentials testen

### Version
- Current: 1.0.0 (aus version.json)
