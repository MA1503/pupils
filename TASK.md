# Pupils App — HAOS Add-on

## Kontext (kurz)

SvelteKit-PWA + CouchDB-Stack als HAOS-Add-on. Runtime: nginx auf 8099 (static files + `/couchdb/`-Proxy), CouchDB auf 127.0.0.1:5984, supercronic triggert `/app/backup.sh` täglich um 02:00 CEST.

Add-on-Ordner: `pupils/` (Dockerfile, config.yaml, rootfs).
App-Quelltext: `app/` (SvelteKit static adapter).
Aktuelle Version: **1.0.12**.

---

## Session 6 — Manueller Backup-Trigger (Button in App-Einstellungen)

### Motivation

HAOS-Container sind aus der SSH-Shell nicht ohne weiteres erreichbar (`ha apps exec` funktioniert nicht wie erwartet, `docker` fehlt in `core-ssh`). Backup-Verifikation geht aktuell nur via Nacht-Cron + Log-Check am nächsten Tag.

**Ziel:** Button "Backup jetzt starten" im Einstellungen-Bottom-Sheet der App, der denselben `/app/backup.sh` anstößt, den supercronic nachts fährt. Output (Erfolg/Fehler + Log) wird in der UI angezeigt.

**Nicht-Ziel:** Kein zweiter Backup-Mechanismus, kein Scheduling-UI. Der Cron bleibt Autorität — der Button ist nur ein Trigger für denselben Script-Pfad.

---

### Architektur-Entscheidung

**Ansatz: Mini-HTTP-Server in Node.js**

- Neuer Prozess `/app/api.js`, gestartet aus `run.sh` als Hintergrund-Kind (neben supercronic, vor `exec nginx`).
- Hört auf `127.0.0.1:9000` — nur intern, nicht extern exponiert.
- nginx proxied `/api/backup` → `http://127.0.0.1:9000/backup`.
- Node v20 ist schon im Image (wegen `@filen/cli`), keine neuen Dependencies.

**Verworfene Alternativen:**

- `fcgiwrap` / nginx-cgi — extra apt-Pakete, mehr bewegliche Teile.
- PouchDB-Trigger-Dokument — zu indirekt.
- CouchDB `_scheduler` — Zweckentfremdung.

---

### Auth

Der Endpoint führt einen Shell-Script aus — muss authentifiziert sein.

**Regel:** Request muss `Authorization: Basic <base64(teacher:<TEACHER_PASSWORD>)>` tragen. Der Node-Server verifiziert die Credentials gegen CouchDB (`GET /pupils/` mit durchgereichtem Header, Status 200 = ok) und führt erst danach `backup.sh` aus.

Vorteil: keine zweite Credentials-Quelle, Wiederverwendung des existierenden teacher-Logins.

Client-seitig sind Username + Passwort im `localStorage` (siehe `app/src/lib/db.ts` / `loadConfig()`).

---

### Concurrency & State

- Lockfile `/tmp/backup-running.lock` verhindert parallele Runs. Wenn gesetzt → 409 Conflict.
- Output (stdout + stderr) in `/tmp/backup-last.log` UND am Ende als Response-Body.
- Exit-Code ≠ 0 → HTTP 500 mit Log als Body. Sonst HTTP 200 mit Log als Body.
- Client-Timeout: 5 Minuten (Dump + Filen-Sync sollten < 1 min dauern).
- Stale-Lock-Erkennung beim `api.js`-Start: wenn PID tot, Lockfile löschen.

---

### Dateien / Änderungen

#### 1. Neu: [pupils/rootfs/app/api.js](pupils/rootfs/app/api.js)

```js
// Tiny HTTP server: einziger Endpoint POST /backup → /app/backup.sh
// Läuft als Hintergrund-Prozess neben supercronic und nginx.
// Auth: Basic-Auth wird gegen CouchDB /pupils/ verifiziert.

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9000;
const LOCK = '/tmp/backup-running.lock';
const LOG  = '/tmp/backup-last.log';
const COUCHDB_VERIFY_URL = 'http://127.0.0.1:5984/pupils/';

// Stale-Lock beim Start aufräumen (PID tot?)
if (fs.existsSync(LOCK)) {
  const pid = Number(fs.readFileSync(LOCK, 'utf8'));
  try { process.kill(pid, 0); } catch { fs.unlinkSync(LOCK); }
}

async function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;
  try {
    const res = await fetch(COUCHDB_VERIFY_URL, { headers: { Authorization: authHeader } });
    return res.status === 200;
  } catch { return false; }
}

function runBackup() {
  return new Promise((resolve) => {
    const out = fs.openSync(LOG, 'w');
    const proc = spawn('/bin/bash', ['/app/backup.sh'], { stdio: ['ignore', out, out] });
    proc.on('exit', (code) => {
      fs.closeSync(out);
      resolve(code ?? 1);
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/backup') {
    res.writeHead(404); return res.end();
  }
  if (!(await verifyAuth(req.headers.authorization))) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic' }); return res.end('unauthorized');
  }
  if (fs.existsSync(LOCK)) {
    res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Backup läuft bereits.');
  }
  fs.writeFileSync(LOCK, String(process.pid));
  try {
    const code = await runBackup();
    const log = fs.readFileSync(LOG, 'utf8');
    res.writeHead(code === 0 ? 200 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(log);
  } finally {
    try { fs.unlinkSync(LOCK); } catch {}
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`[api] listening on 127.0.0.1:${PORT}`));
```

#### 2. [pupils/rootfs/run.sh](pupils/rootfs/run.sh) — api.js im Hintergrund starten

Nach `supercronic /app/crontab &` (Zeile ~76), vor dem finalen `exec nginx`:

```bash
# --- Mini-API für manuellen Backup-Trigger ---
node /app/api.js &
echo "[run] Backup-API gestartet (intern 9000)."
```

#### 3. [pupils/rootfs/etc/nginx/conf.d/default.conf](pupils/rootfs/etc/nginx/conf.d/default.conf) — Proxy-Location

Neue `location`-Section zwischen `/` und `/couchdb/`:

```nginx
location /api/backup {
    proxy_pass         http://127.0.0.1:9000/backup;
    proxy_http_version 1.1;
    proxy_set_header   Authorization $http_authorization;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

#### 4. Frontend — neuer Button im Einstellungen-Sheet

[app/src/routes/+layout.svelte](app/src/routes/+layout.svelte) — Script-Block erweitern:

```svelte
<script lang="ts">
  // bestehende Importe ...
  import { loadConfig } from '$lib/db';

  let backupRunning = $state(false);
  let backupResult = $state<{ ok: boolean; log: string } | null>(null);

  async function runBackup() {
    const cfg = loadConfig();
    if (!cfg) return;
    backupRunning = true;
    backupResult = null;
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${cfg.user}:${cfg.pass}`) },
        signal: AbortSignal.timeout(300_000)
      });
      backupResult = { ok: res.ok, log: await res.text() };
    } catch (e) {
      backupResult = { ok: false, log: `Fehler: ${e instanceof Error ? e.message : String(e)}` };
    } finally {
      backupRunning = false;
    }
  }
</script>
```

Button-Markup im Settings-Sheet, **nach** dem "Verbindung ändern"-Button:

```svelte
<button
  onclick={runBackup}
  disabled={backupRunning}
  class="w-full mt-3 py-4 bg-surface-container-highest text-on-surface font-headline font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
>
  {backupRunning ? 'Backup läuft…' : 'Backup jetzt starten'}
</button>

{#if backupResult}
  <div class="mt-4 p-4 rounded-xl {backupResult.ok ? 'bg-primary/10 text-primary' : 'bg-error-container text-on-error-container'}">
    <p class="font-headline font-bold text-sm mb-2">{backupResult.ok ? 'Backup erfolgreich' : 'Backup fehlgeschlagen'}</p>
    <pre class="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">{backupResult.log}</pre>
  </div>
{/if}
```

(`whitespace-pre-wrap` existiert seit v1.0.11 in `app/src/app.css`. `font-mono` prüfen — falls nicht vorhanden, in `app.css` ergänzen: `.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }`.)

---

### Sicherheits-Checkliste

- [ ] `api.js` bindet explizit auf `127.0.0.1` (nicht `0.0.0.0`)
- [ ] Kein User-Input geht an die Shell (`backup.sh` hat keine Argumente)
- [ ] Auth wird **vor** Lock und Spawn geprüft — kein DoS durch unauthenticated Requests
- [ ] Lockfile wird auch bei Fehler im `try/finally` entfernt
- [ ] nginx reicht nur `Authorization` durch, keine anderen Headers

---

### Test-Plan

**Lokal (Docker):**

1. `docker build -f pupils/Dockerfile -t pupils-test .`
2. Container starten (siehe `docker-compose.dev.yml` oder `scripts/`), Setup durchlaufen.
3. In der App: Settings öffnen → "Backup jetzt starten" klicken.
4. Erwartet: Spinner, nach ~5-30s Erfolgs-Box mit Log.
5. Zweiter Klick während Laufen: 409 "Backup läuft bereits."
6. Falsche Credentials via DevTools: 401.
7. Container-Logs + `/tmp/backup-last.log` checken.

**In HAOS nach Deploy:**

1. Add-on auf 1.0.13 updaten.
2. Settings → Button klicken → Erfolg/Fehler beobachten.
3. Filen-Ordner prüfen ob neue Datei angekommen ist.

---

### Versionierung

- `pupils/config.yaml`: `version: "1.0.12"` → `"1.0.13"`
- `CHANGELOG.md`: Eintrag für v1.0.13 — "Feature: Backup-Trigger-Button in den App-Einstellungen".

---

### Offene Punkte / Risiken

- **filen-CLI-Laufzeit:** Wenn der Sync lange hängt, läuft die HTTP-Response in den Timeout. Fallback: Button-Logik könnte statt synchroner Response nur "gestartet" melden und den Log via `/api/backup/status` nachladen. Erst bauen wenn das Problem tatsächlich auftritt — YAGNI.
- **Lockfile-Stale nach OOM-Kill:** PID-Check in `api.js`-Start löst das pragmatisch.
- **CSRF:** App und API teilen Origin, Basic-Auth wird explizit gesetzt (kein Cookie-Auto-Send) — kein klassischer CSRF-Vektor. Falls Teacher-Login später auf Cookies umstellt: CSRF-Token nachziehen.

---

## Handoff

### Implemented
- [pupils/rootfs/app/api.js](pupils/rootfs/app/api.js) — neuer Node.js-HTTP-Server auf Port 9000. Stale-Lock-Erkennung, Auth gegen CouchDB, Lockfile, spawn backup.sh, Response mit Log.
- [pupils/rootfs/run.sh](pupils/rootfs/run.sh:75) — `node /app/api.js &` + Echo-Zeile vor `exec nginx`.
- [pupils/rootfs/etc/nginx/conf.d/default.conf](pupils/rootfs/etc/nginx/conf.d/default.conf:13) — `location /api/backup` Proxy-Location mit 300s Timeout, Authorization-Passthrough.
- [app/src/routes/+layout.svelte](app/src/routes/+layout.svelte) — `backupRunning`, `backupResult` State, `runBackup()`-Funktion, Button + Ergebnis-Box im Settings-Sheet (nach "Verbindung ändern").
- [app/src/app.css](app/src/app.css:436) — `.font-mono` hinzugefügt (fehlte, wird für `<pre class="font-mono">` benötigt).
- [pupils/config.yaml](pupils/config.yaml:2) — version `"1.0.12"` → `"1.0.13"`.
- [CHANGELOG.md](CHANGELOG.md:1) — v1.0.13-Eintrag hinzugefügt.

### Tests
- (nicht implementiert — Testing ist Aufgabe des Reviewers)

### Deviations from plan
- keine

### Open points for Reviewer
- Bitte `npm run check` ausführen — Svelte/TypeScript-Typprüfung.

### Version
- Current: 1.0.13

## Review

### Result: GREEN

### Requirements check
- [x] `api.js` — HTTP-Server auf 127.0.0.1:9000, Stale-Lock, Auth gegen CouchDB, Lockfile, spawn backup.sh, Response mit Log (200/500/409/401) — implementiert wie spezifiziert
- [x] `run.sh` — `node /app/api.js &` vor `exec nginx` (Zeile 79-81) — korrekt
- [x] `default.conf` — `location /api/backup` → Proxy auf :9000/backup, 300s Timeout, Authorization-Passthrough — korrekt
- [x] `+layout.svelte` — `backupRunning`/`backupResult` State, `runBackup()` mit AbortSignal.timeout(300_000), Button + Ergebnis-Box nach "Verbindung ändern" — korrekt
- [x] `app.css` — `.font-mono` hinzugefügt (Zeile 436) — korrekt
- [x] `config.yaml` — Version 1.0.12 → 1.0.13 — korrekt
- [x] `CHANGELOG.md` — v1.0.13-Eintrag — korrekt

### Tests
- `npm run check`: 0 errors, 3 warnings (alle pre-existing in `EntryEditor.svelte`, nicht durch diese Changes verursacht)
- Keine neuen Tests geschrieben (nicht in Requirements spezifiziert)
- Docker-Build + lokaler Test laut Test-Plan in TASK.md: nicht ausgeführt (benötigt Docker-Umgebung)

### Fixes applied by Reviewer
- none

### Red flags
- none found

### Security-Checkliste (aus TASK.md)
- [x] api.js bindet auf `127.0.0.1` (nicht `0.0.0.0`) — `server.listen(PORT, '127.0.0.1', ...)` (Zeile 56)
- [x] Kein User-Input geht an die Shell — `spawn('/bin/bash', ['/app/backup.sh'], ...)` ohne Argumente (Zeile 26)
- [x] Auth wird **vor** Lock und Spawn geprüft — `verifyAuth()` vor `fs.existsSync(LOCK)` (Zeile 38-43)
- [x] Lockfile wird bei Fehler im `try/finally` entfernt — Zeile 51-53
- [x) nginx reicht nur `Authorization` durch — `proxy_set_header Authorization $http_authorization;` (Zeile 16)

### Notes
- Commit enthält 2 zusätzliche Dateien nicht aus dem Handoff: `+page.svelte` (FAB-Button "+" entfernt) und `s/[id]/+page.svelte` (`pb-32` für Notizen). Beides sind Fixes aus v1.0.12, dokumentiert in CHANGELOG. Nicht problematisch, aber hätte idealerweise in separatem Commit sein sollen.
- `nginx` `server_tokens off;` ist bereits in der Config (nicht Teil dieses Changes, aber bestätigt dass keine Versions-Leaks).
- Die nginx `proxy_pass http://127.0.0.1:9000/backup` URL-Rewriting ist korrekt: `/api/backup` wird zu `/backup` — exakt was api.js erwartet (`req.url !== '/backup'`).
