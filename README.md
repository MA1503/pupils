# Pupils — Musikunterricht-Verwaltung

Pupils ist eine Progressive Web App (PWA) für Musiklehrer, um den Unterrichtsfortschritt von Schülern zu verfolgen. Die App funktioniert offline und synchronisiert Daten mit einem CouchDB-Server.

## Funktionen

- **Schülerverwaltung**: Schüler anlegen, bearbeiten und pausieren
- **Stundenprotokoll**: Unterrichtsstunden mit Notizen und Hinweisen dokumentieren
- **Repertoire**: Songs pro Schüler verwalten
- **Wochenplan**: Übersicht nach Wochentag sortiert
- **Offline-Modus**: Funktioniert ohne Internetverbindung via PouchDB (IndexedDB)
- **Automatische Sicherung**: Tägliches Backup nach filen.io

## Technologie

- **Frontend**: SvelteKit 5 (PWA)
- **Lokale Datenbank**: PouchDB (IndexedDB)
- **Server-Datenbank**: CouchDB
- **Deployment**: Docker (CouchDB + nginx + Backup)
- **Fernzugriff**: Tailscale

## Projektstruktur

```
pupils/
├── app/               # SvelteKit PWA
│   ├── src/
│   │   ├── lib/       # Komponenten, Stores, DB-Logik
│   │   └── routes/    # Seiten (/heute, /bibliothek, /einstellungen)
│   └── static/        # Icons, Manifest
├── stack/             # Docker-Stack
│   ├── docker-compose.yml
│   ├── Dockerfile.app
│   ├── 00-setup.sh
│   └── backup.sh
└── docs/              # Dokumentation
    ├── DEPLOY.md      # Deployment-Anleitung
    ├── FIRST_RUN.md  # Erste Einrichtung
    └── DISASTER_RECOVERY.md
```

## Lokale Entwicklung

### Voraussetzungen

- Node.js ≥20
- Docker (für CouchDB)

### CouchDB starten

```bash
cd stack
docker compose -f docker-compose.dev.yml up -d
```

CouchDB ist dann unter http://localhost:5984 erreichbar (admin/devpassword).

### App starten

```bash
cd app
npm install
npm run dev
```

App läuft unter http://localhost:5173.

### Typprüfung

```bash
cd app
npm run check
```

## Produktion

Siehe [docs/DEPLOY.md](docs/DEPLOY.md) für die vollständige Deployment-Anleitung.

### Kurzfassung

1. Verzeichnisse anlegen: `/mnt/usb/pupils/couchdb-data`, `/mnt/usb/pupils/backups`
2. Docker Stack via Portainer deployen
3. Environment Variables setzen:
   - `COUCHDB_ADMIN_PASSWORD` (≥24 Zeichen)
   - `TEACHER_PASSWORD` (≥16 Zeichen)
   - `FILEN_EMAIL` / `FILEN_PASSWORD` (für Backup)
4. Tailscale Serve konfigurieren

## App-Passwort

Das `TEACHER_PASSWORD` wird für die Anmeldung in der App verwendet. Nach der Ersteinrichtung kann in den Einstellungen ein Backup manuell ausgelöst werden.

## Datenmodell

| Typ | ID |
|---|---|
| Student | `student:<ulid>` |
| Song | `song:<studentUlid>:<songUlid>` |
| Entry | `entry:<songUlid>:<invTimestamp>:<entryUlid>` |

Einträge nutzen invertierte Timestamps, damit `allDocs` die neuesten zuerst zurückgibt.

## Lizenz

MIT