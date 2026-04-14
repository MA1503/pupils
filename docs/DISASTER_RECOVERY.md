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
