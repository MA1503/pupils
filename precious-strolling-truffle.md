# Pupils — Schüler-Verwaltungs-PWA (Implementations-Plan)

## 1. Context

Eine Musiklehrerin braucht ein digitales Notizbuch für Schülerfortschritte. Primäres Gerät: Android-Handy; zusätzlich: PC-Browser. Unterricht findet zu Hause **und** in der Schule statt → **Offline-Betrieb ist Pflicht**. Daten sollen in 10+ Jahren noch lesbar sein; kein Vendor-Lock-in; die App darf nicht durch Android-OS-Updates „sterben".

**Lösung**: SvelteKit-PWA mit **PouchDB** im Browser, die sich mit **CouchDB** auf einem Raspberry Pi 400 synchronisiert. Remote-Zugriff über **Tailscale** (Free-Tier). CouchDB + App laufen als **plain Docker-Container im Portainer-Stack** (NICHT als HA-Addon — zu hohe HAOS-Kopplung). Tägliches Backup nach **filen.io** (DSGVO-konform, E2E-verschlüsselt) via offizielle `filen-cli`.

**Kern-Design-Prinzipien**:
- Daten sind **JSON in CouchDB** → jederzeit in jedem Texteditor lesbar
- **Docker-Compose-Stack ist das Disaster-Recovery-Dokument** — läuft auf jedem Docker-Host
- **Null Abhängigkeit zu HAOS-Addon-APIs** → HAOS-Updates bedrohen die App nicht
- **Offline-First**: PouchDB speichert alles lokal in IndexedDB, Sync ist Bonus

## 2. Architektur

```
┌─────────────────────────────────────────────────────────┐
│  Client: Android Chrome / Desktop Browser               │
│  ┌───────────────────────────────────────────────────┐  │
│  │ SvelteKit PWA (installierbar)                     │  │
│  │  ├─ UI (Svelte 5, TypeScript)                     │  │
│  │  ├─ PouchDB ──── IndexedDB (offline-store)        │  │
│  │  └─ Service Worker (vite-pwa, Workbox)            │  │
│  └─────────────────┬─────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────┘
                     │ HTTPS via Tailscale MagicDNS
                     │ bidirektionale Live-Replikation
                     │ (CouchDB _changes feed)
┌────────────────────▼────────────────────────────────────┐
│  Raspberry Pi 400 — HAOS                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │ HA-Addon: Portainer (offiziell/community)         │  │
│  │   └─ verwaltet Docker-Stack:                      │  │
│  │       ┌─────────────┐  ┌─────────────┐            │  │
│  │       │ couchdb:3   │  │ pupils-app  │            │  │
│  │       │ Port 5984   │  │ nginx:8099  │            │  │
│  │       │ Vol: /data  │  │ static SPA  │            │  │
│  │       └─────────────┘  └─────────────┘            │  │
│  │       ┌──────────────────────┐                    │  │
│  │       │ backup (cron+filen)  │                    │  │
│  │       │ nightly → filen.io   │                    │  │
│  │       └──────────────────────┘                    │  │
│  └───────────────────────────────────────────────────┘  │
│  HA-Addon: Tailscale (offiziell) → TLS via serve        │
└─────────────────────────────────────────────────────────┘
```

**Technologie-Matrix** (alles pinned auf konkrete Versionen, siehe §6):
| Schicht | Technologie | Grund |
|---|---|---|
| Frontend | SvelteKit 2 + Svelte 5 + TypeScript | klein, gute PWA-Story |
| PWA-Build | `@sveltejs/adapter-static` + `@vite-pwa/sveltekit` | reine SPA, kein SSR nötig |
| Client-DB | PouchDB 9 | de-facto Standard für Offline-First mit Couch |
| Server-DB | CouchDB 3.3 (offizielles Image) | bidirektionaler Sync, Apache-Projekt, extrem stabil |
| UI-Komponenten | handgerollt + CSS, kein UI-Framework | 5 Screens, keine Lib nötig |
| Hosting | Docker-Compose via Portainer | entkoppelt von HAOS |
| Remote-Zugriff | Tailscale (HA-Addon) + `tailscale serve` | gratis HTTPS auf `*.ts.net` |
| Backup | `filen-cli` in Node-Container + `cron` | DSGVO-konform, E2E-verschlüsselt |

## 3. Repo-Struktur

```
pupils/
├── app/                              # SvelteKit PWA
│   ├── src/
│   │   ├── app.html
│   │   ├── app.d.ts
│   │   ├── routes/
│   │   │   ├── +layout.svelte        # App-Shell, Nav, First-Run-Guard
│   │   │   ├── +layout.ts            # export const ssr=false, prerender=true
│   │   │   ├── +page.svelte          # Schülerliste (Suche/Sort)
│   │   │   ├── setup/+page.svelte    # First-Run: CouchDB-URL + Creds
│   │   │   └── s/[id]/+page.svelte   # Schülerakte + Song-Tabs + Einträge
│   │   └── lib/
│   │       ├── db.ts                 # PouchDB-Instanz + Sync-Mgmt
│   │       ├── repo.ts               # CRUD-Helpers für Student/Song/Entry
│   │       ├── types.ts              # Document-Typen
│   │       ├── ids.ts                # ID-Generierung (ulid-basiert)
│   │       ├── stores.ts             # Svelte-Stores (students, syncStatus)
│   │       └── components/
│   │           ├── SearchBar.svelte
│   │           ├── StudentRow.svelte
│   │           ├── SongTabs.svelte
│   │           ├── EntryList.svelte
│   │           ├── EntryEditor.svelte
│   │           └── SyncIndicator.svelte
│   ├── static/
│   │   ├── favicon.svg
│   │   └── icon-{192,512,maskable}.png
│   ├── svelte.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── stack/                            # Docker-Compose-Stack für Portainer
│   ├── docker-compose.yml            # Master-Compose (CouchDB + app + backup)
│   ├── .env.example                  # Template für Credentials
│   ├── couchdb/
│   │   └── init/
│   │       └── 00-setup.sh           # Creates teacher-user, pupils-db, CORS
│   ├── pupils-app/
│   │   ├── Dockerfile                # Multi-stage: node build → nginx
│   │   └── nginx.conf                # SPA-Fallback
│   └── backup/
│       ├── Dockerfile                # node:20-alpine + filen-cli + dcron
│       ├── crontab                   # "0 2 * * * /backup.sh"
│       └── backup.sh                 # dump CouchDB → filen upload
├── docker-compose.dev.yml            # Nur CouchDB für lokale Entwicklung
├── scripts/
│   ├── setup-cors.sh                 # idempotent, wird von couchdb/init aufgerufen
│   └── restore.sh                    # manuelles Restore aus Backup-JSON
├── docs/
│   ├── DEPLOY.md                     # Schritt-für-Schritt Pi-Deploy
│   ├── FIRST_RUN.md                  # Lehrerin: "Handy einrichten in 5 min"
│   └── DISASTER_RECOVERY.md          # "Pi kaputt — was nun?"
└── README.md
```

## 4. Datenmodell

Flache Dokumente in CouchDB/PouchDB. **Keine Map/Reduce-Views** — alle Queries gehen über `allDocs` mit Prefix-Range. Das ist schneller zu entwickeln, funktioniert in PouchDB offline identisch, und CouchDB-Views haben teures Initial-Indexing.

### 4.1 Dokument-Typen

```typescript
// app/src/lib/types.ts

type Student = {
  _id: string;            // "student:01HX..."  (ulid)
  _rev?: string;
  type: 'student';
  name: string;           // "Anna Müller"
  lessonSlot: string;     // Freitext: "Mo 17:00, zweiwöchentlich"
  contractStart: string;  // ISO-Date: "2024-09-01"
  tariff: string;         // "30min/Woche · 90€/Monat"
  archived?: boolean;     // soft-delete
  createdAt: string;      // ISO-DateTime
  updatedAt: string;
};

type Song = {
  _id: string;            // "song:<studentId-ulid>:<song-ulid>"
  _rev?: string;
  type: 'song';
  studentId: string;      // "student:01HX..."
  title: string;          // "Für Elise"
  archived?: boolean;
  createdAt: string;
};

type Entry = {
  _id: string;            // "entry:<songId-ulid-parts>:<invTs>:<ulid>"
  _rev?: string;
  type: 'entry';
  songId: string;
  studentId: string;
  entryDate: string;      // ISO-Date, default = heute
  text: string;           // Freitext
  createdAt: string;
  updatedAt: string;
};
```

### 4.2 ID-Schema

IDs sind sortierbar → Queries kommen ohne Indexe aus.

- `student:<ulid>` — ULID ist zeit-sortiert, damit neue Schüler unten auftauchen
- `song:<studentUlid>:<songUlid>` — Prefix-Range `song:<studentUlid>:` holt alle Songs eines Schülers
- `entry:<songUlid>:<invTimestamp>:<entryUlid>` — `invTimestamp = (9999999999999 - Date.now()).toString().padStart(13,'0')` → ASC-Sort = neueste zuerst, **ohne** clientseitiges Sortieren

**Wichtig**: Die `<studentUlid>` im Song-ID und die `<songUlid>` im Entry-ID sind *nur die ULID-Teile*, nicht die vollen Prefixed-IDs. Die vollen IDs stehen zusätzlich in den Feldern `studentId`/`songId`. Beispiel: wenn `_id = "student:01HX123ABC"`, dann `song._id = "song:01HX123ABC:01HX456DEF"` und `song.studentId = "student:01HX123ABC"`.

### 4.3 Queries

```typescript
// app/src/lib/repo.ts (Signaturen)

listStudents():       allDocs({startkey:'student:',   endkey:'student:\ufff0', include_docs:true})
listSongs(sid):       allDocs({startkey:`song:${ulidOf(sid)}:`, endkey:`song:${ulidOf(sid)}:\ufff0`, include_docs:true})
listEntries(songId):  allDocs({startkey:`entry:${ulidOf(songId)}:`, endkey:`entry:${ulidOf(songId)}:\ufff0`, include_docs:true}) // bereits neueste zuerst
searchStudents(q):    listStudents() → client-side filter (für <500 Schüler trivial schnell)
```

Mango-Index ist **nicht** nötig (die Prefix-Queries sind bereits `O(log n)`-Skip über das primäre Btree).

### 4.4 Beispiel-Dokumente

```json
{
  "_id": "student:01HX4PJQZMAN4T0V6X5ZZZZZZZ",
  "type": "student",
  "name": "Anna Müller",
  "lessonSlot": "Mo 17:00, zweiwöchentlich",
  "contractStart": "2024-09-01",
  "tariff": "30min/Woche · 90€/Monat",
  "createdAt": "2026-04-14T09:12:00Z",
  "updatedAt": "2026-04-14T09:12:00Z"
}

{
  "_id": "song:01HX4PJQZMAN4T0V6X5ZZZZZZZ:01HY7R2ABCDEFGHJKLMNPQRSTV",
  "type": "song",
  "studentId": "student:01HX4PJQZMAN4T0V6X5ZZZZZZZ",
  "title": "Für Elise",
  "createdAt": "2026-04-14T09:15:00Z"
}

{
  "_id": "entry:01HY7R2ABCDEFGHJKLMNPQRSTV:0008234567890:01HZ9X...",
  "type": "entry",
  "songId": "song:01HX4PJQZMAN4T0V6X5ZZZZZZZ:01HY7R2ABCDEFGHJKLMNPQRSTV",
  "studentId": "student:01HX4PJQZMAN4T0V6X5ZZZZZZZ",
  "entryDate": "2026-04-14",
  "text": "A-Teil heute sehr sauber, Übergang zum B-Teil noch wacklig. Nächste Woche B-Teil isoliert üben.",
  "createdAt": "2026-04-14T17:45:00Z",
  "updatedAt": "2026-04-14T17:50:00Z"
}
```

## 5. UI-Spezifikation

### 5.1 Route `/` — Schülerliste
- Header: App-Name + Sync-Indikator (grün/gelb/rot, siehe §7.4) + Link „+ Schüler"
- Suchfeld (debounced 200ms, filtert `name` client-side, case-insensitive)
- Sort-Toggle: Name ↕ / Vertragsbeginn ↕ (speichert Auswahl in localStorage)
- Liste: pro Schüler eine Row mit `name` (groß) + `lessonSlot` (klein), klick → `/s/<id>`
- Leer-State: „Noch keine Schüler. Tipp auf +, um anzufangen."

### 5.2 Route `/s/[id]` — Schülerakte
- Header (sticky): Name (h1), Tarif, Unterrichtstermin, Vertragsbeginn. Edit-Icon öffnet Inline-Form.
- Song-Tab-Leiste: horizontal scrollbar, letztes Tab = `+` (neuer Song)
- Aktuelle Tab zeigt Einträge in Reihenfolge: **neueste zuerst**.
- **FAB unten rechts: „+ Heute"** — legt sofort Entry mit `entryDate=today, text=""` an, scrollt nach oben, öffnet Editor. Autofokus auf Textarea.
- Jeder Entry: Datum (Header), Text, Tap-to-edit. Speichern beim Blur + expliziter „Fertig"-Button. Optimistic UI.

### 5.3 Route `/setup` — First-Run
- Sichtbar nur wenn `localStorage.pupilsConfig` fehlt
- 3 Felder: „Server-URL" (z.B. `https://pi.tailnet.ts.net/couchdb/pupils`), „Benutzer" (`teacher`), „Passwort"
- Button „Verbinden" → Test-Request auf `/_session`, bei Erfolg speichern + redirect `/`
- Fehler-Messages konkret (401, CORS, Timeout) mit Fix-Hinweis

### 5.4 Service-Worker (via `@vite-pwa/sveltekit`)
- Precache: App-Shell (JS, CSS, Icons, `/`, `/setup`)
- Runtime-Cache: keine — alle Daten kommen aus PouchDB/IndexedDB, nicht aus Fetch
- Manifest: `display: standalone`, `theme_color`, Icons, `name`, `short_name`

## 6. Konkrete Konfigurationen

### 6.1 `stack/docker-compose.yml` (via Portainer deploybar)

```yaml
services:
  couchdb:
    image: couchdb:3.3.3
    restart: unless-stopped
    environment:
      COUCHDB_USER: ${COUCHDB_ADMIN_USER}
      COUCHDB_PASSWORD: ${COUCHDB_ADMIN_PASSWORD}
    volumes:
      - /mnt/usb/pupils/couchdb-data:/opt/couchdb/data
      - /mnt/usb/pupils/couchdb-config:/opt/couchdb/etc/local.d
      - ./couchdb/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "127.0.0.1:5984:5984"   # nur lokal, Tailscale macht Remote
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5984/_up"]
      interval: 30s
      retries: 3

  pupils-app:
    build: ./pupils-app
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

### 6.2 `stack/.env.example`
```bash
COUCHDB_ADMIN_USER=admin
COUCHDB_ADMIN_PASSWORD=          # min. 24 Zeichen, pwgen -s 24 1
TEACHER_PASSWORD=                # min. 16 Zeichen, das ist die App-Auth
FILEN_EMAIL=
FILEN_PASSWORD=
```
Die echte `.env` niemals ins Repo (`.gitignore: .env`), nur im Portainer als Stack-Env-Vars hinterlegt.

### 6.3 `stack/couchdb/init/00-setup.sh` (idempotent)

Läuft beim allerersten CouchDB-Start (offizielles Image führt `/docker-entrypoint-initdb.d/*.sh` aus). Setzt CORS, legt `_users`-DB an, legt `teacher`-User, legt DB `pupils` an, gibt `teacher` Member-Rolle.

```bash
#!/bin/bash
set -euo pipefail
HOST=http://localhost:5984
AUTH="$COUCHDB_USER:$COUCHDB_PASSWORD"
until curl -sf -u "$AUTH" "$HOST/_up"; do sleep 1; done

# System-DBs
for db in _users _replicator; do
  curl -sf -u "$AUTH" -X PUT "$HOST/$db" || true
done

# CORS (couch_httpd_cors section)
curl -sf -u "$AUTH" -X PUT "$HOST/_node/_local/_config/httpd/enable_cors" -d '"true"'
curl -sf -u "$AUTH" -X PUT "$HOST/_node/_local/_config/cors/origins"     -d '"*"'
curl -sf -u "$AUTH" -X PUT "$HOST/_node/_local/_config/cors/credentials" -d '"true"'
curl -sf -u "$AUTH" -X PUT "$HOST/_node/_local/_config/cors/methods"     -d '"GET, PUT, POST, HEAD, DELETE"'
curl -sf -u "$AUTH" -X PUT "$HOST/_node/_local/_config/cors/headers"     -d '"accept, authorization, content-type, origin, referer"'

# teacher user (id = org.couchdb.user:teacher)
curl -sf -u "$AUTH" -X PUT "$HOST/_users/org.couchdb.user:teacher" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"teacher\",\"password\":\"${TEACHER_PASSWORD}\",\"roles\":[],\"type\":\"user\"}" || true

# pupils DB
curl -sf -u "$AUTH" -X PUT "$HOST/pupils" || true
curl -sf -u "$AUTH" -X PUT "$HOST/pupils/_security" \
  -H "Content-Type: application/json" \
  -d '{"admins":{"names":[],"roles":[]},"members":{"names":["teacher"],"roles":[]}}'
```

**Kritisch**: `TEACHER_PASSWORD` muss als Env in den CouchDB-Container gereicht werden (in `docker-compose.yml` ergänzen, ist oben im Entwurf nicht enthalten — beim Implementieren nachziehen).

### 6.4 `stack/pupils-app/Dockerfile`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /src
COPY app/package*.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /src/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Der Build-Kontext ist das Repo-Root (damit `app/` mitkopiert wird) — entsprechend `build: context: .., dockerfile: pupils-app/Dockerfile` in compose anpassen, oder `app/` als Sibling im Build-Kontext nachziehen.

### 6.5 `stack/pupils-app/nginx.conf`

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache-Busting: gehashte Assets lange cachen, index.html nie
  location ~* \.(js|css|png|svg|woff2)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
}
```

### 6.6 `stack/backup/Dockerfile`

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache curl dcron tini && \
    npm install -g @filen/cli
COPY backup.sh /backup.sh
COPY crontab /etc/crontabs/root
RUN chmod +x /backup.sh
ENTRYPOINT ["/sbin/tini","--"]
CMD ["crond","-f","-l","2"]
```

*Hinweis bei Implementierung*: Paketname der filen-CLI auf NPM prüfen — zum Planzeitpunkt ist `@filen/cli` der wahrscheinliche Name, aber die aktuelle Doku unter https://github.com/FilenCloudDienste/filen-cli ist maßgeblich. Falls anders, Dockerfile entsprechend anpassen.

### 6.7 `stack/backup/crontab`

```
0 2 * * * /backup.sh >> /var/log/backup.log 2>&1
```

### 6.8 `stack/backup/backup.sh`

```bash
#!/bin/sh
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="/backups/pupils-$TS.json"

# 1. Dump komplette pupils-DB
curl -sf -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  "$COUCHDB_URL/pupils/_all_docs?include_docs=true" > "$OUT"

# 2. Sanity-Check: JSON valide, >= 1 Doc
node -e "const j=require('$OUT'); if(!j.rows) process.exit(1); console.log('docs:', j.total_rows);"

# 3. Upload zu filen.io (Login wird im ersten Aufruf interaktiv/env gecacht — im Container
#    empfiehlt sich --email/--password als CLI-Flags oder config-File im Home)
filen --email "$FILEN_EMAIL" --password "$FILEN_PASSWORD" \
  upload "$OUT" "$FILEN_REMOTE_DIR/"

# 4. Lokale Retention
find /backups -name 'pupils-*.json' -mtime +$BACKUP_RETENTION_DAYS -delete

echo "OK: $OUT"
```

*Hinweis*: Das exakte `filen-cli`-Syntax kann abweichen — beim Build gegen aktuelle `filen --help` verifizieren. Alternativer Fallback: `filen sync /backups remote:/pupils-backups`.

### 6.9 `app/vite.config.ts`

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default {
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Schüler-Notizen',
        short_name: 'Pupils',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] }
    })
  ]
};
```

### 6.10 `app/svelte.config.js`
- `adapter: adapter-static({ fallback: 'index.html' })` — SPA-Modus

### 6.11 `app/src/lib/db.ts` (Kern-Logik, Skelett)

```ts
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';
PouchDB.plugin(PouchFind);

let local: PouchDB.Database | null = null;
let sync: PouchDB.Replication.Sync<{}> | null = null;

export function getLocal() {
  if (!local) local = new PouchDB('pupils');
  return local;
}

type SyncStatus = 'idle' | 'active' | 'paused' | 'error' | 'denied';
const listeners = new Set<(s: SyncStatus, detail?: any) => void>();
export function onSyncStatus(cb: (s: SyncStatus, detail?: any) => void) {
  listeners.add(cb); return () => listeners.delete(cb);
}
const emit = (s: SyncStatus, d?: any) => listeners.forEach(l => l(s, d));

export function startSync(remoteUrl: string, user: string, pass: string) {
  stopSync();
  const remote = new PouchDB(remoteUrl, {
    fetch: (u, o) => {
      o = o || {};
      o.headers = new Headers(o.headers || {});
      o.headers.set('Authorization', 'Basic ' + btoa(`${user}:${pass}`));
      return fetch(u, o);
    }
  });
  sync = getLocal().sync(remote, { live: true, retry: true })
    .on('active',  () => emit('active'))
    .on('paused',  e => emit(e ? 'error' : 'paused', e))
    .on('denied',  e => emit('denied', e))
    .on('error',   e => emit('error', e));
}

export function stopSync() { sync?.cancel(); sync = null; }
```

Config-Persistenz: `localStorage.pupilsConfig = JSON.stringify({ url, user, pass })`. *Pragmatik*: In einem Single-User-Tailscale-only-Szenario ist das akzeptabel. Härtung optional: Passwort mit Gerät-Fingerprint + Web-Crypto AES-GCM verschlüsseln, Key in `IndexedDB` mit `extractable:false`.

## 7. Implementierungs-Phasen

### Phase 1 — App-Entwicklung lokal (keine Pi-Beteiligung)
1. `mkdir pupils && cd pupils && git init`
2. `docker compose -f docker-compose.dev.yml up -d` (nur CouchDB)
3. `npm create svelte@latest app` → Skeleton, TypeScript, ESLint
4. In `app/`: `npm i pouchdb-browser pouchdb-find ulid` + dev `@vite-pwa/sveltekit @sveltejs/adapter-static`
5. `app/src/lib/{db,repo,types,ids,stores}.ts` implementieren
6. Routen implementieren (`/`, `/s/[id]`, `/setup`)
7. `npm run dev` → in Browser gegen `http://admin:dev@localhost:5984/pupils` testen
8. DevTools → Network → Offline: Einträge erstellen, wieder online → Sync verifizieren (Fauxton UI unter `localhost:5984/_utils`)

### Phase 2 — Stack bauen & lokal testen
1. `stack/` komplett anlegen (§6)
2. `cp stack/.env.example stack/.env`, Passwörter befüllen
3. `docker compose -f stack/docker-compose.yml up --build` auf Entwickler-Maschine
4. Browser: `http://localhost:8099` → Setup-Screen → URL `http://localhost:5984/pupils` + `teacher` + PW
5. Funktions-Test kompletter Workflow
6. Backup-Test: `docker compose exec backup /backup.sh` manuell triggern, Ergebnis in `/mnt/.../backups/` und auf filen.io prüfen

### Phase 3 — Pi-Deploy
1. Auf Pi: Portainer-Addon in HA installieren (falls nicht bereits)
2. USB-Platte einstecken, in HA unter „Storage" hinzufügen, z.B. als `/mnt/usb/pupils/` (HA-Config → Storage)
3. Tailscale-Addon installieren/aktivieren; `tailscale up` bestätigen
4. In Portainer: „Stacks" → „Add stack" → „Upload" oder „Web editor", `docker-compose.yml` einfügen
5. Environment-Vars aus `.env` im Portainer-UI eintragen (nicht in die Compose-Datei!)
6. Build-Kontext: Portainer kann entweder per Git-Repo ziehen (empfohlen: Git-URL des eigenen Repos) oder manuell hochgeladen werden. **Empfehlung**: Repo öffentlich auf GitHub oder privat mit Deploy-Key, Portainer auf „Git" konfigurieren → `docker-compose.yml` Pfad `stack/docker-compose.yml`.
7. Stack starten, Logs in Portainer verfolgen: `couchdb` healthy, `pupils-app` startet, `backup` idle (wartet auf Cron)
8. Tailscale-Serve: auf Pi via SSH (Terminal-Addon) oder HA Advanced SSH:
   ```
   tailscale serve --bg --https=443 --set-path=/couchdb http://localhost:5984
   tailscale serve --bg --https=443 --set-path=/       http://localhost:8099
   ```
   → App erreichbar unter `https://pi.tailnet.ts.net/`, CouchDB unter `https://pi.tailnet.ts.net/couchdb`

### Phase 4 — Handy einrichten
1. Auf Android Chrome öffnen: `https://pi.tailnet.ts.net/`
2. Setup-Screen: URL `https://pi.tailnet.ts.net/couchdb/pupils`, `teacher`, PW
3. Chrome-Menü → „Zum Startbildschirm hinzufügen"
4. Airplane-Mode-Test: App offline starten, Eintrag erstellen, online gehen, Sync verifizieren

### Phase 5 — Backup-Validierung
1. Nach erstem echten Cron-Run (2:00 Uhr nachts, oder manuell getriggert) im filen.io-Webinterface `/pupils-backups/pupils-*.json` sichtbar
2. **Restore-Probe** (kritisch, sonst ist es kein Backup): `scripts/restore.sh` von Hand gegen zweite lokale CouchDB-Instanz ausführen, Daten wiederhergestellt

## 8. Verifikations-Plan

Checkliste für „fertig":
- [ ] Lokal (Dev): Full-Workflow mit Schüler/Song/Entry klappt
- [ ] Lokal (Dev): Offline→Online Sync klappt bidirektional (2 Browser)
- [ ] Stack lokal: alle 3 Container healthy, manuelles Backup erzeugt valides JSON auf filen.io
- [ ] Pi: Stack läuft, Portainer zeigt `healthy`
- [ ] Pi: Tailscale-URL erreichbar, HTTPS-Cert gültig (Let's-Encrypt via ts.net)
- [ ] Handy: PWA installiert, Setup durchlaufen, Daten syncen
- [ ] Handy: Airplane-Mode-Test bestanden
- [ ] Backup: Cron-getriggerter Backup landet in filen.io
- [ ] Restore: `scripts/restore.sh` stellt DB in frischer Instanz wieder her

## 9. Sicherheits-Checkliste

- [x] CouchDB-Admin-PW ≥ 24 Zeichen, nur in `.env` (nicht im Repo)
- [x] Kein „admin party" — explizites `_users`-Setup
- [x] `pupils`-DB: nur `teacher` als Member
- [x] CouchDB-Ports binden nur auf `127.0.0.1` (Portainer), Zugriff von außen nur via Tailscale+nginx
- [x] Tailscale-ACL beschränkt auf Lehrerin-Geräte (via Admin-UI in `login.tailscale.com`)
- [x] HTTPS zwingend (Service-Worker-Requirement) — via `tailscale serve --https=443`
- [x] Backup-Credentials (filen.io) nur als Stack-Env in Portainer, nicht im Image
- [x] `.env`, `*.sqlite`, `build/`, `node_modules/` in `.gitignore`

## 10. Disaster Recovery Runbook (`docs/DISASTER_RECOVERY.md`)

**Szenario A: Pi/SD-Karte tot** — USB-Platte überlebt (deshalb liegen die Volumes dort). Neuer Pi: HAOS flashen, Portainer-Addon, Tailscale-Addon, USB-Platte einstecken, Stack deployen → läuft wieder. **Geschätzte Downtime: 30 min**.

**Szenario B: Pi **und** USB tot** — letztes Backup von filen.io ziehen (Webinterface oder `filen download`). Frischer Docker-Host, `docker compose up`, `scripts/restore.sh pupils-YYYY….json` → läuft. **Datenverlust: max. 24h** (Cron-Intervall).

**Szenario C: filen.io down / Account weg** — das Handy **hat die komplette DB in IndexedDB**. Eine einzige Zeile in DevTools (`JSON.stringify(await db.allDocs({include_docs:true}))`) exportiert alles. Danach wie Szenario B.

**Szenario D: CouchDB-Format in 10 Jahren obsolet** — `backup.sh` produziert **CouchDB-neutrales JSON** (flache Docs). In jedem neuen Store (SQLite, Postgres, Markdown) in <1h konvertierbar.

## 11. Kritische Dateien (für Implementierung)

- [app/src/lib/db.ts](app/src/lib/db.ts) — PouchDB + Sync
- [app/src/lib/repo.ts](app/src/lib/repo.ts) — CRUD
- [app/src/lib/types.ts](app/src/lib/types.ts) — Document-Types
- [app/src/routes/+layout.svelte](app/src/routes/+layout.svelte) — App-Shell + First-Run-Guard
- [app/src/routes/s/[id]/+page.svelte](app/src/routes/s/%5Bid%5D/+page.svelte) — Schülerakte
- [app/vite.config.ts](app/vite.config.ts) — PWA-Plugin
- [app/svelte.config.js](app/svelte.config.js) — adapter-static
- [stack/docker-compose.yml](stack/docker-compose.yml) — Master-Stack
- [stack/couchdb/init/00-setup.sh](stack/couchdb/init/00-setup.sh) — CORS + Users + DB
- [stack/pupils-app/Dockerfile](stack/pupils-app/Dockerfile), [stack/pupils-app/nginx.conf](stack/pupils-app/nginx.conf)
- [stack/backup/Dockerfile](stack/backup/Dockerfile), [stack/backup/backup.sh](stack/backup/backup.sh), [stack/backup/crontab](stack/backup/crontab)
- [scripts/restore.sh](scripts/restore.sh) — Restore-Script (CouchDB `_bulk_docs` POST aus Backup-JSON)

## 12. Offene Punkte / an den Implementierer

1. **`filen-cli`-Paketname und CLI-Syntax**: Plan-Stand ist `@filen/cli` mit `filen upload`/`filen --email …`. Beim Build zuerst `npm install -g @filen/cli && filen --help` verifizieren und `backup.sh` ggf. anpassen.
2. **Portainer-Git-Integration**: Falls das Repo privat bleibt, Deploy-Key in Portainer hinterlegen.
3. **Icons**: `static/icon-192.png` etc. bereitstellen (einfaches Noten-Symbol o.ä.).
4. **First-Run-UX**: Sobald real getestet mit Lehrerin, evtl. QR-Code mit vorkonfigurierter URL statt Eintipp-Dialog.
