# Changelog — 2026-04-14

## Security Fixes

### 1. CouchDB CORS: Wildcard-Origin entfernt
**Datei**: `stack/couchdb/init/00-setup.sh`, `stack/docker-compose.yml`, `stack/.env.example`

**Problem**: CouchDB war mit `CORS origins: *` konfiguriert — erlaubte Anfragen von jeder Tailscale-Adresse.

**Lösung**: CORS-Origin ist jetzt eine konfigurierbare Environment-Variable `COUCHDB_CORS_ORIGIN`. Wenn leer, ist CORS deaktiviert. Setzen in Portainer:
```
COUCHDB_CORS_ORIGIN=https://<tailnet>.ts.net
```
(oder die lokale App-URL, z.B. `http://192.168.1.100:8099`)

### 2. Docker: Backup-Container läuft als non-root
**Datei**: `stack/backup/Dockerfile`, `stack/docker-compose.yml`

**Problem**: Backup-Container lief als root.

**Lösung**: Non-root User `app` (UID 1000) im Dockerfile erstellt und in `docker-compose.yml` via `user: "1000:1000"` aktiviert.

### 3. Docker: Log-Rotation aktiviert
**Datei**: `stack/docker-compose.yml`, `docker-compose.dev.yml`

**Problem**: Docker-Logs wachsen unbegrenzt → SD-Karte vollschreiben.

**Lösung**: Alle Services haben jetzt `logging` mit `max-size: 10m` / `max-file: 3`.

### 4. Docker: `no-new-privileges` und `cap_drop: ALL`
**Datei**: `stack/docker-compose.yml`

**Problem**: Container konnten zusätzliche Privilegien erhalten.

**Lösung**: `security_opt: no-new-privileges:true` bei allen Services. `cap_drop: ALL` beim backup-Service.

## Behobene Bugs

### 5. 409 Conflict bei Notizen/Songs/Schüler-Bearbeitung
**Ursache**: PouchDB Sync aktualisiert `_rev` im Hintergrund. Wenn der User einen Eintrag bearbeitet, nutzte die App den **veralteten** `_rev` aus dem Svelte-State → 409 Conflict.

**Lösung** (`repo.ts`): Neue `putLatest()` Helper-Funktion, die vor jedem `put()` die aktuelle `_rev` aus der Datenbank holt:
```typescript
async function putLatest<T extends { _id: string; _rev?: string }>(
  db: PouchDB.Database,
  doc: T
): Promise<PouchDB.Core.Response> {
  const latest = await db.get(doc._id);
  return db.put({ ...doc, _rev: latest._rev });
}
```
Betroffen: `updateStudent`, `updateSong`, `updateEntry`, `archiveStudent`, `archiveSong`, `deleteEntry`

### 6. "Laden…" blieb nach Klick auf "+ Schüler" stehen
**Ursache**: Bei fehlgeschlagener Navigation (`goto`) wurde `loading = false` nie gesetzt. Zudem konnte ein Seitenreload einen neuen Schüler erstellen, ohne dass die Navigation erfolgreich war.

**Lösung** (`s/[id]/+page.svelte`): `try/catch/finally` um alle DB-Operationen in `onMount`. `loading = false` jetzt auch im Fehlerfall.

### 7. Blank page nach Schüler-Erstellung
**Ursache**: `goto()` mit `replaceState: true` leitete nicht korrekt auf die neue Schüler-Seite weiter.

**Lösung**: `window.location.href` statt `goto()` für zuverlässige Navigation nach Erstellung.

### 8. Fehlendes `prerender = true` in `+layout.ts`
**Ursache**: Ohne `prerender = true` konnte der Adapter-static beim Build Routing-Probleme haben.

**Lösung** (`+layout.ts`):
```typescript
export const ssr = false;
export const prerender = true;
```

### 9. UI Redesign nach Stitch-Design (The Rhythmic Atelier)
Komplettes Redesign basierend auf Stitch-Generierung:

**Design-System:**
- Dark Theme (#0e0e0e Hintergrund, #ff8ba1 Pink als Primärfarbe)
- Fonts: Plus Jakarta Sans (Headlines) + Be Vietnam Pro (Body)
- Material Symbols Icons
- Glassmorphism Header und Bottom-Navigation

**Neue Komponenten:**
- Bottom-Navigation mit 4 Tabs (Schüler, Heute, Bibliothek, Profil)
- Floating Action Button (FAB) für "+ Schüler" und "+ HEUTE"
- Studentenliste mit Avatar-Platzhaltern und Activity-Badges
- Timeline-Ansicht für Stundenprotokolle mit klickbaren Einträgen
- Setup-Screen mit Hero-Bild und Willkommenstext

**Geänderte Dateien:**
- `app/src/app.css` — Eigenes Design-System (CSS-Variablen statt Tailwind)
- `app/src/routes/+layout.svelte` — Glassmorphism Header, Bottom-Nav
- `app/src/routes/+page.svelte` — Moderne Studentenliste mit Suchfeld und Sortierung
- `app/src/routes/s/[id]/+page.svelte` — Timeline-Ansicht mit Bearbeiten-Funktion
- `app/src/routes/setup/+page.svelte` — Stylisches Setup-Formular
- `app/src/app.html` — Google Fonts und Material Symbols eingebunden

## Geänderte Dateien
- `stack/couchdb/init/00-setup.sh` — CORS-Origin aus Env-Var, nicht mehr wildcard
- `stack/docker-compose.yml` — security_opt, logging, cap_drop, user, couchdb_cors_origin
- `stack/backup/Dockerfile` — Non-root User app (UID 1000)
- `stack/.env.example` — COUCHDB_CORS_ORIGIN Variable ergänzt
- `docker-compose.dev.yml` — logging ergänzt
- `docs/DEPLOY.md` — COUCHDB_CORS_ORIGIN in Env-Var-Tabelle
- `docs/FIRST_RUN.md` — CORS-Fehler-Lösung aktualisiert
- `app/src/lib/repo.ts` — `putLatest()` Helper + alle Mutation-Funktionen aktualisiert
- `app/src/routes/s/[id]/+page.svelte` — Error-Handling in `onMount`, Timeline mit Bearbeiten-Funktion
- `app/src/routes/s/[id]/+page.ts` — `prerender = false` (überschreibt Layout-Default)
- `app/src/routes/+layout.ts` — `prerender = true` ergänzt
- `app/src/routes/+layout.svelte` — Glassmorphism Header, Bottom-Navigation
- `app/src/routes/+page.svelte` — Moderne Studentenliste mit Suchfeld/Sortierung/FAB
- `app/src/routes/setup/+page.svelte` — Stylisches Setup-Formular
- `app/src/app.css` — Eigenes Design-System (CSS-Variablen)
- `app/src/app.html` — Google Fonts und Material Symbols

## Getestet
- [x] `npm run check` erfolgreich
- [x] `npm run build` erfolgreich
- [x] Docker-Stack neu gebaut (`docker compose -f stack/docker-compose.yml up --build`)
- [x] "+ Schüler" → navigiert direkt zur Schülerseite
- [x] Song anlegen → Notiz schreiben → kein 409 Conflict
- [x] Timeline-Einträge sind klickbar und bearbeitbar
