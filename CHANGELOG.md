# Changelog

## v1.0.0 — 2026-04-15

### MVP
- SvelteKit PWA mit PouchDB-Sync gegen CouchDB
- /heute-Seite mit Tagesansicht nach Wochentag
- Archiv-Toggle für inaktive Schüler
- Backup nach filen.io via supercronic (täglich 02:00 Europe/Berlin)
- Setup-Seite für CouchDB-Verbindungsconfig
- Docker-Stack (nginx + CouchDB + Backup) mit Security-Hardening
- Restore-Script für Notfälle

### HAOS Add-on
- HAOS Add-on für Raspberry Pi: CouchDB + nginx + Backup in einem Container
- Multi-Arch-Build (amd64 + arm64) via GitHub Actions → GHCR
- nginx reverse proxy auf Port 8099, CouchDB hinter `/couchdb/`
- HAOS Auto-Erkennung in Setup-URL (nginx-Proxy)

### v1.0.0.1 — 2026-04-15 (Hotfix)

#### Fix: s6-overlay PID 1 Fehler
- **Problem:** `s6-overlay-suexec: fatal: can only run as pid 1` — s6-overlay erwartet als PID 1 zu laufen, aber HAOS verwaltet den Container-Einstieg selbst.
- **Entscheidung:** s6-overlay komplett entfernt. Stattdessen ein einfaches `run.sh`-Script als ENTRYPOINT, das CouchDB, nginx und supercronic als Hintergrundprozesse startet und nginx im Vordergrund hält (Main-Prozess). Damit wird der Container einfacher und kompatibler mit HAOS.
