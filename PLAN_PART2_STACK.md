# Pupils — Teil 2: Docker-Stack (Implementierungs-Prompt für Kimi)

**Voraussetzung**: Teil 1 (App) ist implementiert. `app/build/` existiert und enthält eine valide SPA.  
**Ziel dieses Dokuments**: Alle Dateien in `stack/`, `scripts/`, `docs/` und den Produktions-`docker-compose.yml`.

---

## Kontext (Kurzfassung)

Die App aus Teil 1 soll auf einem Raspberry Pi 400 laufen, der HAOS (Home Assistant OS) als Basis-OS hat.  
- **CouchDB** läuft als Docker-Container (via Portainer HA-Addon) auf Port `127.0.0.1:5984`  
- **pupils-app** läuft als nginx-Container auf Port `127.0.0.1:8099` — serviert die SPA aus Teil 1  
- **backup** läuft nightly und schiebt einen JSON-Dump nach filen.io  
- **Tailscale** (HA-Addon) macht die Dienste von außen erreichbar via HTTPS (`*.ts.net`)  
- Alle Daten liegen auf USB-Platte unter `/mnt/usb/pupils/` (nicht SD-Karte)  
- **Kein HA-Addon-API-Coupling** — der Stack läuft auf jedem Docker-Host

---

## 1. Verzeichnisstruktur — `stack/` + `scripts/` + `docs/`

```
pupils/
├── stack/
│   ├── docker-compose.yml            # Produktions-Stack für Portainer
│   ├── .env.example                  # Credentials-Template (echte .env niemals ins Repo)
│   ├── couchdb/
│   │   └── init/
│   │       └── 00-setup.sh           # CORS, _users DB, teacher-user, pupils-DB
│   ├── pupils-app/
│   │   ├── Dockerfile                # Multi-stage: node build → nginx
│   │   └── nginx.conf                # SPA-Fallback + Cache-Headers
│   └── backup/
│       ├── Dockerfile                # node:20-alpine + filen-cli + dcron + tini
│       ├── crontab                   # 0 2 * * * /backup.sh
│       └── backup.sh                 # CouchDB-Dump → filen.io Upload
├── scripts/
│   └── restore.sh                    # manuelles Restore aus Backup-JSON
└── docs/
    ├── DEPLOY.md                     # Schritt-für-Schritt Pi-Deploy
    ├── FIRST_RUN.md                  # Lehrerin: Handy einrichten in 5 min
    └── DISASTER_RECOVERY.md          # Pi kaputt — was nun?
```

---

## 2. `stack/docker-compose.yml`

> **Wichtiger Hinweis**: Das offizielle CouchDB-Docker-Image kennt **kein `/docker-entrypoint-initdb.d/`**
> (das ist eine PostgreSQL/MySQL-Konvention). CouchDB führt dort nie Scripts aus. Stattdessen wird
> ein separater `couchdb-setup`-Service verwendet, der nach dem Healthcheck einmalig läuft.

```yaml
# Pupils — Produktions-Stack für Portainer
# Deployment: In Portainer als Stack anlegen, Env-Vars direkt im Portainer-UI setzen
# Build-Kontext: Repo-Root (damit ./app/ beim pupils-app-Build verfügbar ist)

services:

  couchdb:
    image: couchdb:3.3.3
    restart: unless-stopped
    environment:
      COUCHDB_USER: ${COUCHDB_ADMIN_USER}
      COUCHDB_PASSWORD: ${COUCHDB_ADMIN_PASSWORD}
      TEACHER_PASSWORD: ${TEACHER_PASSWORD}    # wird von couchdb-setup gebraucht
    volumes:
      - /mnt/usb/pupils/couchdb-data:/opt/couchdb/data
      - /mnt/usb/pupils/couchdb-config:/opt/couchdb/etc/local.d
    ports:
      - "127.0.0.1:5984:5984"   # nur lokal — Tailscale macht Remote-Zugriff
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5984/_up"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  couchdb-setup:
    image: couchdb:3.3.3
    depends_on:
      couchdb:
        condition: service_healthy
    environment:
      COUCHDB_HOST: http://couchdb:5984
      COUCHDB_USER: ${COUCHDB_ADMIN_USER}
      COUCHDB_PASSWORD: ${COUCHDB_ADMIN_PASSWORD}
      TEACHER_PASSWORD: ${TEACHER_PASSWORD}
    volumes:
      - ./couchdb/init:/init:ro
    entrypoint: ["/bin/bash", "/init/00-setup.sh"]
    restart: "no"

  pupils-app:
    build:
      context: ..          # Repo-Root als Build-Kontext, damit app/ erreichbar ist
      dockerfile: stack/pupils-app/Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:8099:80"
    depends_on:
      couchdb:
        condition: service_healthy

  backup:
    build: ./backup
    restart: unless-stopped
    environment:
      COUCHDB_URL: http://couchdb:5984
      COUCHDB_USER: ${COUCHDB_ADMIN_USER}
      COUCHDB_PASSWORD: ${COUCHDB_ADMIN_PASSWORD}
      FILEN_EMAIL: ${FILEN_EMAIL}
      FILEN_PASSWORD: ${FILEN_PASSWORD}
      FILEN_REMOTE_DIR: /pupils-backups
      BACKUP_RETENTION_DAYS: "30"
    volumes:
      - /mnt/usb/pupils/backups:/backups
    depends_on:
      couchdb:
        condition: service_healthy
```

---

## 3. `stack/.env.example`

```bash
# Template — diese Datei ins Repo committen.
# Die echte .env NIEMALS committen (in .gitignore: stack/.env).
# In Portainer: Stack → Environment Variables → direkt hier eintragen.

COUCHDB_ADMIN_USER=admin
COUCHDB_ADMIN_PASSWORD=          # min. 24 Zeichen, z.B.: pwgen -s 24 1
TEACHER_PASSWORD=                # min. 16 Zeichen — das ist das App-Login-Passwort
FILEN_EMAIL=                     # filen.io Account-E-Mail
FILEN_PASSWORD=                  # filen.io Passwort (wird NUR im Backup-Container verwendet)
```

---

## 4. `stack/couchdb/init/00-setup.sh`

> Wird vom `couchdb-setup`-Service ausgeführt, nachdem CouchDB healthy ist.  
> Idempotent: alle PUT-Requests ignorieren Fehler mit `|| true`.  
> `COUCHDB_HOST` wird vom Init-Container als `http://couchdb:5984` übergeben (Docker-Netzwerk-Hostname).

```bash
#!/bin/bash
set -euo pipefail

HOST=http://localhost:5984
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
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/httpd/enable_cors" \
  -d '"true"' -H "Content-Type: application/json"
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/origins" \
  -d '"*"' -H "Content-Type: application/json"
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/credentials" \
  -d '"true"' -H "Content-Type: application/json"
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/methods" \
  -d '"GET, PUT, POST, HEAD, DELETE"' -H "Content-Type: application/json"
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/headers" \
  -d '"accept, authorization, content-type, origin, referer"' \
  -H "Content-Type: application/json"
echo "CORS: OK"

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
```

---

## 5. `stack/pupils-app/Dockerfile`

```dockerfile
# Multi-stage: Node-Build → nginx-Serve
# Build-Kontext muss das Repo-Root sein (docker-compose.yml setzt context: ..)

FROM node:20-alpine AS build
WORKDIR /src

# Nur package.json zuerst (besseres Layer-Caching)
COPY app/package*.json ./
RUN npm ci

# App-Quellcode
COPY app/ ./
RUN npm run build
# → /src/build/ enthält die fertige SPA

FROM nginx:1.27-alpine
COPY --from=build /src/build /usr/share/nginx/html
COPY stack/pupils-app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

---

## 6. `stack/pupils-app/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA-Fallback: alle Routen liefern index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Langzeit-Cache für gehashte Assets (Vite benennt sie mit Content-Hash)
    location ~* \.(js|css|png|svg|woff2|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # index.html NIEMALS cachen (Service-Worker muss immer aktuelle Version sehen)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }

    # Service Worker niemals cachen
    location = /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

## 7. `stack/backup/Dockerfile`

```dockerfile
FROM node:20-alpine

# dcron: leichtgewichtiger Cron-Daemon (kein crond von busybox)
# tini: PID-1-Wrapper für sauberes Signal-Handling
RUN apk add --no-cache curl dcron tini

# filen-cli installieren
# HINWEIS: Paketname vor Deployment verifizieren:
#   docker run --rm node:20-alpine npm info @filen/cli version
# Falls Paket anders heißt, hier anpassen.
RUN npm install -g @filen/cli

COPY backup.sh /backup.sh
COPY crontab /etc/crontabs/root
RUN chmod +x /backup.sh

# tini als PID 1 → crond als foreground-Prozess
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["crond", "-f", "-l", "2"]
```

---

## 8. `stack/backup/crontab`

```
# Nightly Backup um 2:00 Uhr UTC
0 2 * * * /backup.sh >> /var/log/backup.log 2>&1
```

---

## 9. `stack/backup/backup.sh`

```bash
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

# 3. Upload zu filen.io
# HINWEIS: CLI-Syntax vor Deployment gegen 'filen --help' verifizieren.
# Fallback-Syntax: filen sync /backups remote:/pupils-backups
filen \
  --email "${FILEN_EMAIL}" \
  --password "${FILEN_PASSWORD}" \
  upload "${OUT}" "${FILEN_REMOTE_DIR}/"

echo "Upload: OK → ${FILEN_REMOTE_DIR}/pupils-${TS}.json"

# 4. Lokale Retention: alte Backups löschen
find /backups -name 'pupils-*.json' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
echo "Retention: Dateien älter als ${BACKUP_RETENTION_DAYS} Tage gelöscht"

echo "=== Backup Ende: OK ==="
```

---

## 10. `scripts/restore.sh`

```bash
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
  fs.writeFileSync('/tmp/pupils-restore-bulk.json', JSON.stringify(bulk));
  console.log('Dokumente für Restore:', docs.length);
"

# Ziel-DB anlegen (falls nicht vorhanden)
curl -sf -u "${COUCH_USER}:${COUCH_PASS}" -X PUT "${DB_URL}" || true

# Bulk-Import
RESULT=$(curl -sf -u "${COUCH_USER}:${COUCH_PASS}" \
  -X POST "${DB_URL}/_bulk_docs" \
  -H "Content-Type: application/json" \
  -d @/tmp/pupils-restore-bulk.json)

echo "Ergebnis: ${RESULT}" | head -c 200
echo ""

# Aufräumen
rm -f /tmp/pupils-restore-bulk.json

echo "=== Restore abgeschlossen ==="
```

---

## 11. `docs/DEPLOY.md`

````markdown
# Deployment auf Raspberry Pi 400 (HAOS)

## Voraussetzungen

- HAOS läuft auf dem Pi
- USB-Platte eingesteckt und als Storage eingebunden (z.B. `/mnt/usb/`)
- **Portainer** HA-Addon installiert und gestartet
- **Tailscale** HA-Addon installiert, `tailscale up` durchgeführt, Gerät im Tailscale-Dashboard sichtbar
- Dieses Repo zugänglich (GitHub-URL oder manueller Upload)

## Schritt 1: Verzeichnisse anlegen

Auf dem Pi via SSH (HA Terminal-Addon oder Advanced SSH Addon):

```bash
mkdir -p /mnt/usb/pupils/couchdb-data
mkdir -p /mnt/usb/pupils/couchdb-config
mkdir -p /mnt/usb/pupils/backups
```

## Schritt 2: Stack in Portainer anlegen

1. Portainer öffnen (HA → Portainer Addon → „Open Web UI")
2. **Stacks** → **Add stack**
3. Option A — Git-Repo (empfohlen):
   - Repository URL: deine GitHub-URL
   - Compose path: `stack/docker-compose.yml`
   - Bei privatem Repo: Deploy-Key hinterlegen
4. Option B — Manuell:
   - Inhalt von `stack/docker-compose.yml` ins Web-Editor-Feld einfügen

## Schritt 3: Environment Variables setzen

In Portainer unter dem Stack → **Environment variables**:

| Variable | Wert |
|---|---|
| `COUCHDB_ADMIN_USER` | `admin` |
| `COUCHDB_ADMIN_PASSWORD` | mind. 24 Zeichen, z.B. `pwgen -s 24 1` |
| `TEACHER_PASSWORD` | mind. 16 Zeichen — das ist das App-Passwort |
| `FILEN_EMAIL` | filen.io E-Mail |
| `FILEN_PASSWORD` | filen.io Passwort |

## Schritt 4: Stack deployen

„Deploy the stack" — Portainer baut die Images und startet Container.  
In den Logs verfolgen:
- `couchdb`: Sollte `CouchDB Setup abgeschlossen` zeigen, dann `healthy`
- `pupils-app`: nginx startet
- `backup`: crond startet (keine weiteren Logs bis 2:00 Uhr)

## Schritt 5: Tailscale Serve konfigurieren

Auf dem Pi via SSH:

```bash
# App über Tailscale erreichbar machen
tailscale serve --bg --https=443 --set-path=/ http://localhost:8099

# CouchDB über Tailscale erreichbar machen (für App-Setup)
tailscale serve --bg --https=443 --set-path=/couchdb http://localhost:5984

# Status prüfen
tailscale serve status
```

Die App ist jetzt unter `https://<pi-hostname>.ts.net/` erreichbar.  
CouchDB unter `https://<pi-hostname>.ts.net/couchdb`.

## Schritt 6: Backup manuell testen

```bash
docker exec -it $(docker ps -qf name=backup) /backup.sh
```

Erfolgreich wenn: kein Fehler + Datei in filen.io Webinterface unter `/pupils-backups/` sichtbar.
````

---

## 12. `docs/FIRST_RUN.md`

````markdown
# Ersteinrichtung auf dem Handy (Android Chrome)

**Voraussetzung**: Tailscale ist auf dem Handy installiert und du bist mit demselben Tailscale-Account angemeldet.

## Schritt 1: App öffnen

In Chrome auf deinem Handy öffnen:  
`https://<pi-hostname>.ts.net/`

Du siehst den Einrichtungsbildschirm.

## Schritt 2: Verbindung einrichten

Fülle die Felder aus:

| Feld | Wert |
|---|---|
| **Server-URL** | `https://<pi-hostname>.ts.net/couchdb/pupils` |
| **Benutzer** | `teacher` |
| **Passwort** | Das `TEACHER_PASSWORD` aus dem Stack |

Tipp auf **Verbinden**.  
Bei Erfolg siehst du sofort die Schülerliste.

## Schritt 3: App installieren

Chrome-Menü (⋮) → **„Zum Startbildschirm hinzufügen"**  
→ App erscheint auf dem Homescreen und startet fortan wie eine normale App.

## Schritt 4: Offline-Test

Flugmodus aktivieren → App öffnen → Eintrag schreiben → Flugmodus aus → 
Sync-Symbol oben rechts wird kurz grün → Eintrag erscheint in Fauxton auf dem Pi.

## Fehler-Lösungen

| Fehler | Ursache | Lösung |
|---|---|---|
| „Server nicht erreichbar" | Tailscale nicht verbunden | Tailscale auf Handy öffnen, verbinden |
| „401: Falsches Passwort" | Falsches TEACHER_PASSWORD | Passwort in Portainer Stack-Env prüfen |
| CORS-Fehler | 00-setup.sh nicht gelaufen | CouchDB-Container neu starten |
````

---

## 13. `docs/DISASTER_RECOVERY.md`

````markdown
# Disaster Recovery

## Szenario A: Pi oder SD-Karte defekt — USB-Platte überlebt

**Datenverlust: keiner** (alles auf USB)  
**Downtime: ~30 Minuten**

1. Neuen Pi oder neue SD-Karte besorgen
2. HAOS flashen: https://www.home-assistant.io/installation/raspberrypi
3. USB-Platte einstecken, in HA unter Storage einbinden
4. Portainer- und Tailscale-Addons installieren
5. Stack wie in DEPLOY.md deployen — CouchDB findet seine Daten sofort wieder
6. `tailscale serve` Befehle wiederholen

## Szenario B: Pi UND USB-Platte defekt — Backup von filen.io

**Datenverlust: max. 24 Stunden** (Cron-Intervall)

1. Letztes Backup von filen.io laden:
   - Webinterface: filen.io → `/pupils-backups/` → neuestes `pupils-*.json` herunterladen
   - Oder: `filen --email … --password … download /pupils-backups/pupils-YYYY….json ./`
2. Frischen Docker-Host starten (oder neuen Pi aufsetzen wie in Szenario A)
3. Restore:
   ```bash
   ./scripts/restore.sh pupils-YYYY….json http://localhost:5984 admin <adminpassword>
   ```
4. Fertig — alle Daten wiederhergestellt

## Szenario C: filen.io nicht verfügbar oder Account verloren

**Datenverlust: keiner** — das Handy hat die vollständige DB in IndexedDB

1. Chrome auf Handy → DevTools (via USB oder `chrome://inspect`)
2. Console:
   ```javascript
   const db = new PouchDB('pupils');
   const result = await db.allDocs({ include_docs: true });
   copy(JSON.stringify(result));
   ```
3. Inhalt der Zwischenablage als `pupils-manual-export.json` speichern
4. Weiter wie in Szenario B ab Schritt 2

## Szenario D: CouchDB-Format in 10+ Jahren obsolet

Das Backup-Format ist **CouchDB-neutrales JSON**:
```json
{ "total_rows": 47, "rows": [{ "id": "student:...", "doc": { ... } }, ...] }
```

Dieses Format lässt sich in <1 Stunde in jeden anderen Store importieren:
- **SQLite**: `node scripts/to-sqlite.js backup.json`  
- **Postgres**: Standard-JSON-Import  
- **Markdown-Dateien**: pro Student eine `.md`-Datei — lesbar in jedem Texteditor

Die Datenlongevität ist vollständig unabhängig von CouchDB, PouchDB oder dieser App.
````

---

## 14. Verifikations-Checkliste (Pass 2)

### Lokal (vor Pi-Deploy)
- [ ] `docker compose -f stack/docker-compose.yml up --build` ohne Build-Fehler
- [ ] `docker ps` zeigt alle 3 Container als `healthy` / `running`
- [ ] Browser `http://localhost:8099` → App lädt, Setup-Screen erscheint
- [ ] Setup: `http://localhost:5984/pupils`, `teacher`, Passwort aus `.env` → Verbindung OK
- [ ] Schüler anlegen → erscheint in Fauxton (`http://localhost:5984/_utils/`)
- [ ] `docker compose exec backup /backup.sh` → kein Fehler, JSON in `/mnt/.../backups/`
- [ ] Backup-JSON manuell öffnen → valides JSON mit `rows`-Array

### Auf dem Pi
- [ ] Portainer: Stack `healthy`
- [ ] `https://<pi>.ts.net/` erreichbar, HTTPS-Zertifikat gültig
- [ ] `https://<pi>.ts.net/couchdb/_up` liefert `{"status":"ok"}`
- [ ] Handy: PWA installiert, Setup durchgeführt, Daten sichtbar
- [ ] Flugmodus-Test bestanden
- [ ] Cron-Backup in filen.io sichtbar

### Disaster Recovery
- [ ] `scripts/restore.sh` gegen frische lokale CouchDB — alle Dokumente korrekt wiederhergestellt

---

## 15. Sicherheits-Checkliste

- [x] `COUCHDB_ADMIN_PASSWORD` ≥ 24 Zeichen, nur in Portainer Env-Vars (nie im Repo)
- [x] `TEACHER_PASSWORD` ≥ 16 Zeichen
- [x] Kein „Admin Party" — CouchDB hat explizites `_users`-Setup
- [x] `pupils`-DB: nur `teacher` als Member (keine öffentliche Leserechte)
- [x] CouchDB-Port nur auf `127.0.0.1:5984` (kein `0.0.0.0`)
- [x] Externer Zugriff ausschließlich via Tailscale (kein Port-Forwarding im Router)
- [x] HTTPS zwingend durch `tailscale serve --https=443` (Let's Encrypt via `.ts.net`)
- [x] Service-Worker erfordert HTTPS — erfüllt durch Tailscale-Serve
- [x] filen.io-Credentials nur im Backup-Container via Env, nicht im Image
- [x] `.env`, `node_modules/`, `build/` in `.gitignore`
- [ ] Optional: Tailscale ACL einschränken auf Lehrerin-Geräte (login.tailscale.com → Access Controls)

---

## 16. Offene Punkte

1. **`filen-cli` Paketname und Syntax**: Vor dem Backup-Container-Build verifizieren:
   ```bash
   docker run --rm node:20-alpine sh -c "npm install -g @filen/cli && filen --help"
   ```
   Falls Paket anders heißt oder Syntax abweicht, `backup/Dockerfile` und `backup.sh` anpassen.
   Alternativer Fallback-Befehl: `filen sync /backups remote:/pupils-backups`

2. **Portainer Git-Integration**: Falls Repo privat, Deploy-Key in Portainer hinterlegen:
   Portainer → Settings → SSH Keys → Key hinzufügen → beim Stack unter „Authentication" auswählen.

3. **Tailscale-Hostname**: `<pi-hostname>` in `docs/` durch den echten Tailscale-Hostname ersetzen
   (sichtbar unter `tailscale status` oder im Tailscale-Dashboard).

4. **USB-Mount-Pfad**: Wenn HAOS die USB-Platte anders einbindet (nicht `/mnt/usb/`), Volumes in
   `docker-compose.yml` entsprechend anpassen.
