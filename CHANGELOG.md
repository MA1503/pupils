# Changelog

## v1.0.10 — 2026-04-16

### Fix: Node 18 → 20 — Filen CLI lief nicht auf Pi
- **Problem:** CouchDB-Base-Image (Debian Bookworm) liefert `nodejs` v18 per apt. `@filen/cli` benötigt Node ≥20 — das CLI crashte sofort, der Fehler war unsichtbar weil `set -e` abbrach bevor der Output geloggt wurde.
- **Entscheidung:** Node 20 (LTS) via NodeSource in Dockerfile installiert statt apt-Paket. Filen-Fehlerausgabe wird jetzt auch bei Exit-Code ≠ 0 geloggt.

## v1.0.9 — 2026-04-16

### Fix: Backup schlägt fehl wenn Filen-Zugangsdaten nicht gesetzt
- **Problem:** `backup.sh` lief mit `set -e` und brach bei leerem `FILEN_EMAIL`/`FILEN_PASSWORD` sofort ab.
- **Entscheidung:** Filen-Upload wird übersprungen wenn keine Zugangsdaten gesetzt. Lokaler Dump in `/data/backups/` wird immer erstellt.

### Fix: Zeilenumbrüche in Unterrichtsnotizen
- **Problem:** Tailwind setzt `white-space: normal` per Default — Zeilenumbrüche aus dem Textarea wurden in der Anzeige ignoriert.
- **Entscheidung:** `whitespace-pre-wrap` zu den Notiz-`<p>`-Tags in der Schülerdetailseite hinzugefügt.

## v1.0.8 — 2026-04-15

### Fix: Ingress entfernt — UI war nach Install von 1.0.7 gebrochen
- **Problem:** nginx-Regex-Rewrite für HAOS-Ingress-Pfade funktionierte nicht mit SvelteKit: Assets wurden gegen `homeassistant.local:8123/_app/...` statt den Addon-Port aufgelöst → White Screen.
- **Entscheidung:** `ingress: false` + `webui`-Link (direkter Port 8099). Kein Sidebar-Panel, aber stabiler „Open Web UI"-Button in der Add-on-Seite.

### Security-Fixes
- **Supercronic SHA-Verifikation:** SHA1-Check nach Download für amd64 + arm64 (GLM-5 Finding 3)
- **backup.env entfernt:** Credentials persistieren nicht mehr im Container-FS — HAOS-Env-Vars werden direkt an `backup.sh` weitergereicht (Finding 2)
- **nginx server_tokens off:** Versionsinformation im Server-Header unterdrückt (Finding 5)

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

## v1.0.1 — 2026-04-15

### Fix: s6-overlay PID 1 Fehler
- **Problem:** `s6-overlay-suexec: fatal: can only run as pid 1` — s6-overlay erwartet als PID 1 zu laufen, aber HAOS verwaltet den Container-Einstieg selbst.
- **Entscheidung:** s6-overlay komplett entfernt. Stattdessen ein einfaches `run.sh`-Script als ENTRYPOINT, das CouchDB, nginx und supercronic als Hintergrundprozesse startet und nginx im Vordergrund hält (Main-Prozess). Damit wird der Container einfacher und kompatibler mit HAOS.

### Fix: GHCR Image-Tag mit Quotes
- **Problem:** Version-Extraktion im CI-Workflow produzierte `"1.0.0"` mit YAML-Quotes → invalid Docker tag.
- **Entscheidung:** `tr -d '"'` zum Extraktionsscript hinzugefügt.

### Fix: GHCR Username Lowercase
- **Problem:** Docker/ghcr.io erfordert Lowercase-Reponames, aber `MA1503` war groß.
- **Entscheidung:** Überall `ma1503` statt `MA1503` für Image-URLs.

### Fix: Attestation Step entfernt
- **Problem:** `actions/attest-build-provenance@v1` braucht OIDC `id-token: write` Permission, die nicht verfügbar war.
- **Entscheidung:** Attestation entfernt — nicht nötig für unser Use-Case.

### Fix: Sidebar-Ingress (erste Version)
- **Problem:** Add-on erschien nicht in der HAOS-Sidebar.
- **Entscheidung:** `ingress: true` und `ingress_port: 8099` in config.yaml hinzugefügt.

## v1.0.2 — 2026-04-15

### Fix: White Screen mit HAOS Ingress
- **Problem:** Mit `ingress: true` wurde die SvelteKit-App über `/api/hassio_ingress/[HASH]/` erreichbar. Alle JS/CSS-Dateien (`/_app/immutable/...`) wurden mit 404 beantwortet, weil SvelteKit absolute Pfade erzeugt die nicht hinter dem Ingress-Prefix aufgelöst werden.
- **Entscheidung:** Ingress entfernt, App direkt über Port 8099 zugreifbar. `webui`-Feld hinzugefügt ("Open Web UI" Link in Sidebar).

### Fix: Changelog in HAOS
- **Problem:** `No changelog found for app 7da1d1ca_pupils!` — HAOS erwartet eine Changelog-URL in der config.yaml.
- **Entscheidung:** `changelog`-Feld hinzugefügt, zeigt auf `CHANGELOG.md` im Repository (raw GitHub URL).

## v1.0.3 — 2026-04-15

### Fix: HAOS erkennt Add-on-Updates nicht
- **Problem:** HAOS bot kein Update an. Zwei Ursachen: (1) Fehlende Docker-Labels `io.hass.version` / `io.hass.type` / `io.hass.arch`. (2) Docker-Cache hat alte Layer wiederverwendet.
- **Entscheidung:** HAOS-Labels als `LABEL` im Dockerfile hinzugefügt. `BUILD_VERSION` als Build-Arg im CI-Workflow. Version auf 1.0.3 erhöht für Cache-Bust.

## v1.0.4 — 2026-04-15

### Fix: HAOS "Add-on aus Repository entfernt"
- **Problem:** HAOS zeigte Warnung "App wurde aus dem Repository entfernt". Add-on-Ordner hieß `haos-addon/`, slug war `pupils`. HAOS identifiziert Add-ons über den Ordnerpfad.
- **Entscheidung:** Ordner von `haos-addon/` zu `pupils/` umbenannt (slug = Ordnername). Alle Pfade in Dockerfile und CI-Workflow angepasst.

## v1.0.5 — 2026-04-15

### Fix: Add-on nicht in HAOS Store sichtbar
- **Problem:** Nach Umbenennung des Ordners wurde das Add-on nicht im Store angezeigt. Zwei Ursachen: (1) HAOS erwartet `init: true` (s6-overlay) als Default — ohne s6-overlay muss `init: false` gesetzt werden. (2) `webui`-Format war falsch: `http://[HOST]:8099` statt `http://[HOST]:[PORT:8099]` — HAOS ignorierte die gesamte config.yaml.
- **Entscheidung:** `init: false`, `startup: "application"`, korrektes `webui`-Format.

## v1.0.6 — 2026-04-15

### Fix: Falscher GHCR-Image-Name
- **Problem:** Beim Umbenennen von `haos-addon` → `pupils` wurde `replaceAll` auch auf den Image-Namen im CI-Workflow angewendet: `pupils-haos-addon` → `pupils-pupils`. HAOS konnte das Image nicht pullen (404 manifest unknown). Zusätzlich hat der Docker-Cache alte Layer wiederverwendet und keine neuen Tags gepusht.
- **Entscheidung:** Image-Name korrigiert zu `pupils-haos-addon`. `no-cache: true` im CI-Workflow gesetzt um stale Docker-Cache zu verhindern.

## v1.0.7 — 2026-04-15 (aktuell)

### Fix: Sidebar-Ingress mit nginx Path-Stripping
- **Problem:** HAOS Ingress proxyt die App unter `/api/hassio_ingress/HASH/`. SvelteKit erzeugt absolute Asset-Pfade (`/_app/...`) die im Ingress-Kontext nicht aufgelöst werden → White Screen.
- **Entscheidung:** nginx rewrite-Regel die den Ingress-Prefix (`/api/hassio_ingress/HASH/`) vor dem Servieren entfernt. App funktioniert sowohl direkt (Port 8099) als auch via Ingress. `ingress: true` und `ingress_port: 8099` in config.yaml.

### Fix: Pausierte Schüler nicht sichtbar
- **Problem:** Pausierte Schüler wurden aus der Liste gefiltert (`listStudents()` schloss `archived: true` aus) und waren weder sichtbar noch wieder aktivierbar.
- **Entscheidung:** `listStudents()` bekommt `includeArchived`-Parameter (Default: `false`). Auge-Button in der Schülerliste zum Ein-/Ausblenden pausierter Schüler. Pausierte Schüler erscheinen mit "Pausiert"-Badge und können über die Detailseite wieder aktiviert werden.