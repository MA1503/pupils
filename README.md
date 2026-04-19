# Pupils — Yasmins Vocal Lab

Progressive Web App für eine Gesangslehrerin, um Schüler, Unterrichtsstunden und Repertoire zu verwalten. Läuft offline-first via PouchDB und synchronisiert mit CouchDB auf einem Heimserver über Tailscale.

→ [CHANGELOG](CHANGELOG.md)

---

## Features

- **Schülerverwaltung** — Schüler anlegen, Termin (inkl. 2-wöchentlicher Cadence), Tarif, Status (aktiv/pausiert)
- **Abrechnung** — Stundenkarte (n-er), Festvertrag oder Frei; Zähler, Reset, Karte wechseln
- **Stundenprotokoll** — Einträge pro Song mit Notiz + Hinweis, Timeline-Ansicht
- **Allgemeine Notizen** — songübergreifende Notizen pro Schüler (eigener Tab)
- **Bibliothek** — alle Songs aller Schüler gruppiert nach Titel, durchsuchbar
- **Heute** — wer hat heute Unterricht (inkl. Cadence-Logik, Nachholtermine, Ferien)
- **Verschieben** — Stunde auf anderes Datum/Uhrzeit verschieben
- **Offline** — vollständig offline nutzbar (PouchDB + Service Worker)
- **Backup** — tägliches Backup nach filen.io

---

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | SvelteKit 5 · Svelte 5 Runes · TypeScript |
| Styling | Tailwind CSS · Material-You Tokens (CSS-Variablen) |
| Lokale DB | PouchDB (IndexedDB) |
| Sync | CouchDB auf Raspberry Pi via Tailscale |
| Deployment | Docker (CouchDB + nginx + Backup-Service) |
| PWA | Workbox Service Worker via `@vite-pwa/sveltekit` |

---

## Projektstruktur

```
pupils/
├── app/                    # SvelteKit PWA
│   ├── src/
│   │   ├── lib/            # repo.ts, db.ts, types.ts, stores.ts, Komponenten
│   │   └── routes/         # +page.svelte je Route (/heute, /bibliothek, /einstellungen, /s/[id])
│   └── static/             # Icons, Manifest
├── stack/                  # Docker-Stack (CouchDB + nginx + backup)
├── docs/                   # DEPLOY.md, FIRST_RUN.md, DISASTER_RECOVERY.md
├── AGENTS.md               # Konventionen für alle AI-Agents (Implementer, Reviewer)
├── CLAUDE.md               # Architekt-Rolle für Claude Code
└── TASK.md                 # Aktiver Implementierungsauftrag (ggf. leer nach Release)
```

---

## Lokale Entwicklung

**Voraussetzungen:** Node.js ≥ 20, Docker

```bash
# CouchDB starten (dev)
docker compose -f docker-compose.dev.yml up -d
# → http://localhost:5984/_utils  (admin / devpassword)

# App starten
cd app
npm install
npm run dev
# → http://localhost:5173

# TypeScript prüfen
npm run check
```

---

## Produktion (Docker)

Vollständige Anleitung: [docs/DEPLOY.md](docs/DEPLOY.md)

```bash
# Pflicht-Umgebungsvariablen in stack/.env:
COUCHDB_ADMIN_PASSWORD=...   # ≥ 24 Zeichen
TEACHER_PASSWORD=...          # ≥ 16 Zeichen  (App-Login)
FILEN_EMAIL=...
FILEN_PASSWORD=...
```

Stack deployen:
```bash
cd stack
docker compose up -d
```

---

## Datenmodell

| Typ | ID-Format |
|-----|-----------|
| Student | `student:<ulid>` |
| Song | `song:<studentUlid>:<songUlid>` |
| Entry | `entry:<songUlid>:<invTimestamp>:<entryUlid>` |

Entry-IDs nutzen invertierte Timestamps → `allDocs` liefert neueste zuerst.

---

## Entwicklungs-Workflow (AI-Pipeline)

Änderungen laufen durch drei Rollen:

1. **Architect** (Claude Code) — plant, schreibt `TASK.md`
2. **Implementer** (`/implement` OpenCode-Skill) — schreibt Code, schreibt Handoff
3. **Reviewer** (`/review` OpenCode-Skill) — prüft Code, führt `npm run check` aus

Details: [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md)

---

## Lizenz

MIT
