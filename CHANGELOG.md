# Changelog

## v1.1.6 — 2026-04-17

### Fix: Repertoire nicht mehr scrollbar, jetzt Wrap-Grid
- **Root Cause**: `w-[120px]` war keine definierte CSS-Utility (handgeschriebenes CSS, kein Tailwind). Spacer-Div hatte `width: 0` → `scrollWidth === clientWidth` → kein Overflow → Browser konnte nicht scrollen.
- **Lösung**: Horizontaler Scroll entfernt. Songs werden jetzt als Wrap-Grid angezeigt (2–3 pro Zeile, `flex-grow: 1` + `min-width: 140px`).
- Bei mehr als 6 Songs: Collapse-Button "▼ X weitere". Aktiver Song wird automatisch sichtbar gehalten (Auto-Expand).
- Plus/Edit-Buttons aus absolute-positioned Overlay in den Section-Header verschoben.
- `.flex-wrap { flex-wrap: wrap; }` Utility zu `app/src/app.css` hinzugefügt.

## v1.1.5 — 2026-04-17

### Fix: Repertoire-Scroll wirklich repariert
- `pr-[120px]` durch einen `flex-shrink-0`-Spacer-Div ersetzt. Grund: Safari/WebKit ignoriert `padding-right` beim Berechnen des Scroll-Extents in Flex-Containern — Scrollbereich endete am letzten Chip, nicht am Padding.
- `touch-action: pan-x` explizit gesetzt, damit der Browser horizontale Swipes eindeutig dem Tab-Scroll zuordnet und nicht z.B. als Back-Gesture interpretiert.
- `overscroll-behavior-x: contain` verhindert Scroll-Chaining auf den Parent.

## v1.1.4 — 2026-04-17

### Fix: Repertoire-Scrolling repariert
- Flex-Container-Breiten-Problem behoben; Songs scrollen jetzt reibungslos horizontal
- Mausrad-Support für Desktop hinzugefügt (vertikales Scrollen → horizontale Tab-Navigation)

### Feature: Neue Songs erscheinen vorne
- Neuer Song wird an erster Position eingefügt (`activeSongIndex = 0`)
- `listSongs` gibt Songs in umgekehrter Reihenfolge zurück (neueste zuerst)

## v1.1.3 — 2026-04-17

### Fix: Repertoire-Bereich umstrukturiert
- Song-Chips scrollen links, Edit/Add-Buttons sind rechts fixiert mit Gradient-Overlay
- Edit-Icon aus aktivem Chip entfernt; zentrale Edit-Schaltfläche rechts

### Fix: Song-Edit-Buttons (Dunkel-Stil)
- Alle 3 Buttons (Save/Delete/Cancel) auf `bg-surface-container-low` mit farbigen Icons: rosa Check, gedämpftes Rot für Löschen, grau für Abbrechen

### Fix: text-error-dim Utility hinzugefügt
- Fehlende CSS-Klasse für `--error-dim` Token ergänzt

## v1.1.2 — 2026-04-17

### Fix: Button-Reset (app.css)
- Alle Buttons sind jetzt standardmäßig transparent ohne Rahmen/Padding. Verhindert Browser-Default-Styling bei Icon-Buttons ohne Hintergrundklasse.

### Fix: Song-Icon im aktiven Pill
- Edit-Icon sitzt jetzt in einem runden Container (`bg-black/10`), konsistent mit anderen Edit-Buttons.

### Fix: Song-Edit-Buttons einheitlich
- Alle drei Buttons (Speichern, Löschen, Abbrechen) jetzt `w-9 h-9` quadratisch mit zentriertem Icon.

### Fix: Datum-Edit-Buttons einheitlich
- Save/Cancel-Buttons beim Datum-Bearbeiten jetzt `w-9 h-9`, Datum-Input nimmt den restlichen Platz.

### Fix: Datum-Edit-Trigger sauber
- Das Edit-Icon neben dem Datum sitzt jetzt in einem klickbaren Container (`w-7 h-7`) mit Hover-State.

### Fix: Entry-Delete-Button konsistent
- Löschen-Button beim Entry-Edit jetzt `w-12 h-12` quadratisch.

## v1.1.1 — 2026-04-17

### Fix: Datum-Edit-Buttons gestylt
- Save/Cancel-Buttons beim Datum-Bearbeiten hatten keine CSS-Klassen → native Browser-Elemente. Jetzt als Icon-Buttons (`bg-primary` / `bg-surface-container-low`) gestylt.

### Fix: studio_name Default leer
- Default-Wert "Yasmins Vocal Lab" aus config.yaml entfernt, damit das Feld bei Neuinstallationen leer ist.

## v1.1.0 — 2026-04-17

### Fix: Song-Edit-Icon
- pencil.png entfernt; Material Symbol `edit` (grau, kein Hintergrund) wie der Schüler-Name-Edit-Button

### Fix: Entry-Edit-Buttons als Icons
- "Speichern"/"Abbrechen" → ✓/✗ Icons, konsistent mit Song-Edit-Form

### Fix: Layout-Einzug Bibliothek + Einstellungen
- Doppeltes px-6 entfernt; beide Seiten nun bündig mit Heute-Seite

### Fix: Heading-Größe
- Bibliothek + Einstellungen auf text-5xl (wie Heute) vereinheitlicht

### Fix: Karten-Abstände + Glow
- space-y-5 statt space-y-4; shadow-primary Opacity leicht reduziert

### Feature: Datum eines Eintrags editierbar
- Kleines edit-Icon neben dem Datum; öffnet date-Input; speichert via updateEntry

### Feature: Bibliothek Suche
- Suchfeld filtert nach Song-Titel oder Schülername (client-seitig)

### Feature: Wochenplan-Sortierung
- Neuer Sort-Button auf Schülerseite; sortiert nach Wochentag + Uhrzeit (Mo→Fr)

### Feature: Konfigurierbarer Studio-Name
- HAOS-Option `studio_name`; leer = kein Text im Top-Bar; Standard: "Yasmins Vocal Lab"

## v1.0.23 — 2026-04-16

### Fix: Stift-Icon Größe + Bibliothek Card-Styling
- pencil.png: Inline-Style statt fehlender w-4/h-4 CSS-Klassen; invert-Filter für dunklen Hintergrund
- Bibliothek: Karten jetzt mit shadow-primary (rosa Shimmer), bg-surface-container-highest, mehr Abstand

## v1.0.22 — 2026-04-16

### Feature: Hinweis-Feld pro Unterrichtseintrag
- Optionales zweites Textfeld pro Eintrag. Wenn gefüllt erscheint im Anzeigemodus eine eingebettete Box mit HINWEIS-Label (Primary-Akzent, leicht erhöhter Hintergrund).

### Feature: Bibliothek aktiviert
- Alle Songs aller Schüler alphabetisch. Klick öffnet Schülerdetail mit dem Song aktiv.

### Refactor: Einstellungen als eigene Seite
- Profil-Tab entfernt. Einstellungen-Icon in Bottom-Nav öffnet `/einstellungen` statt Overlay.

### Fix: Song-Edit-Button
- Eigenes pencil.png statt Material-Icon. OK-Button → Häkchen-Icon.

## v1.0.21 — 2026-04-16

### Fix: Song-Bearbeiten-Button sichtbar gemacht
- **Problem:** Edit-Icon im aktiven Song-Chip hatte keinen Hintergrund und nur 70% Opacity — kaum erkennbar als Button.
- **Entscheidung:** Kleiner weißer Kreis (`bg-white/20`, `rounded-full`) mit Hover-Feedback. Passt zum Primary-Pill-Design.

## v1.0.20 — 2026-04-16

### Fix: Filen-Upload — Credentials direkt aus options.json lesen
- **Problem:** HAOS `environment`-Block substituierte `{{filen_email}}`/`{{filen_password}}` nicht korrekt — `backup.sh` bekam die Literal-Strings `{{filen_email}}` statt der echten Zugangsdaten. Debug: `email='{{filen_email}}' pass_len=18` (18 = Länge von `{{filen_password}}`), echtes Passwort hat 15 Zeichen.
- **Root Cause:** HAOS Template-Substitution in `environment`-Block ist unzuverlässig nach Schema-Änderungen.
- **Entscheidung:** `backup.sh` liest `filen_email` und `filen_password` jetzt direkt aus `/data/options.json` via `jq` — dasselbe robuste Muster wie `teacher_password` in `run.sh`.

## v1.0.19 — 2026-04-16

### Debug: Filen-Credentials-Diagnose
- Temporärer Debug-Output in `backup.sh` um HAOS Template-Substitution zu verifizieren.
- Bestätigt: `{{filen_email}}` wurde literal übergeben. Fix in v1.0.20.

## v1.0.18 — 2026-04-16

### Fix: Filen-Upload — Rust CLI mit managed rclone statt offiziellem rclone
- **Problem:** Offizielles rclone Filen-Backend lehnte api_key ab (`Invalid API key`), auch mit exportiertem Key vom neuen Filen-CLI.
- **Root Cause:** Das rclone-Filen-Backend (`filen-rclone`-Fork von Filen) ist ein anderes Produkt als das offizielle rclone mit Filen-Provider. `export-api-key` ist explizit für "non-managed rclone" — aber das offizielle rclone-Backend hat Bugs mit der API-Key-Auth.
- **Entscheidung:** Rust Filen CLI (v0.2.5) direkt ins Image, nutzt sein eigenes managed `filen-rclone`. Auth via `--email`/`--password` Flags, kein api_key nötig. `--config-dir /data/filen-cli` für persistenten filen-rclone-Cache über Container-Neustarts.
- **Aufgeräumt:** rclone, unzip, libsecret-1-0, filen_api_key-Option entfernt. Nur email+password wie vorher.

## v1.0.17 — 2026-04-16

### Fix: api_key optional — rclone versucht zunächst mit email+password allein
- **Problem:** v1.0.16 verlangte FILEN_API_KEY als Pflichtfeld, der nur über das neue Filen-Rust-CLI (`filen export-api-key`) geholt werden kann — unnötige Hürde falls rclone ihn intern ableitet.
- **Entscheidung:** api_key bleibt als optionales Feld. Falls nicht gesetzt, versucht rclone mit email+password (Go-SDK leitet Auth-Keys intern ab). Falls doch nötig, kann er nachgetragen werden.

## v1.0.16 — 2026-04-16

### Fix: Filen-Upload komplett neu — rclone statt Node-CLI
- **Problem:** Filen hat Auth v1 deprecated. Alle `@filen/cli`-Versionen (v0.0.30 und v0.0.36) nutzen noch Auth v1 (altes SDK) → `Invalid credentials!` trotz korrekter Zugangsdaten. Das gesamte Node-CLI ist von Filen offiziell abgekündigt.
- **Root Cause:** Filen API nutzt heute Auth v2 (PBKDF2 + SHA-512 Key-Derivation). Das alte Node-SDK schickt das Klartext-Passwort → API lehnt ab.
- **Entscheidung:** `@filen/cli` vollständig ersetzt durch `rclone` ≥ 1.73, das das offizielle Filen-Backend (`filen-sdk-go`, Auth v2) enthält. Kein Keyring, kein D-Bus, kein glibc-Problem.
- **Neues Feld:** `filen_api_key` in den Add-on-Optionen (optional).
- **backup.sh:** Generiert `rclone.conf` mit obfuskierten Credentials zur Laufzeit in tmpfs, löscht sie nach dem Upload.

## v1.0.15 — 2026-04-16

### Fix: Filen CLI auf v0.0.36 gepinnt + libsecret
- **Problem:** v0.0.30 (alte SDK v0.1.x) → "Invalid credentials" wegen Filen API-Änderung. v0.0.39 (@latest) → Crash wegen `@jupiterpi/node-keyring` braucht glibc 2.38+, Bookworm hat 2.36.
- **Entscheidung:** v0.0.36 gepinnt (SDK v0.3.x, nutzt `keytar` statt `node-keyring`). `libsecret-1-0` ins Image für keytar-Runtime.

## v1.0.14 — 2026-04-16

### Fix: Filen CLI auf @latest aktualisiert (rückgängig gemacht in v1.0.15)
- @latest war v0.0.39 — crashte mit glibc-Inkompatibilität.

## v1.0.13 — 2026-04-16

### Feature: Backup-Trigger-Button in den App-Einstellungen
- **Problem:** HAOS-Container sind aus der SSH-Shell nicht ohne weiteres erreichbar — Backup-Verifikation ging nur via Nacht-Cron + Log-Check am nächsten Tag.
- **Entscheidung:** Neuer Button "Backup jetzt starten" im Einstellungen-Bottom-Sheet, der denselben `/app/backup.sh` anstößt wie supercronic. Output (Erfolg/Fehler + Log) wird direkt in der UI angezeigt.
- **Architektur:** Mini-Node.js-HTTP-Server (`api.js`) auf `127.0.0.1:9000`, gestartet aus `run.sh`. nginx proxied `/api/backup` weiter. Auth via Basic-Auth gegen CouchDB (`teacher`-User).
- **Concurrency:** Lockfile `/tmp/backup-running.lock` verhindert parallele Runs (HTTP 409). Stale-Lock-Erkennung beim Start.
- **Security:** api.js bindet auf `127.0.0.1`, Auth vor Lock/Spawn, kein User-Input an Shell, `try/finally` für Lockfile-Cleanup.

## v1.0.12 — 2026-04-16

### Fix: UI — doppeltes `+` beim FAB-Button + Letzter Eintrag unter Button verdeckt
- **Problem 1:** Schüler-FAB zeigte `+ + Schüler` (Material-Icon `add` + Text `+ Schüler`). Text auf `Schüler` gekürzt.
- **Problem 2:** Letzter Stundenprotokoll-Eintrag wurde vom `+ Heute`-Button überdeckt. `pb-32` zur Notizen-Section hinzugefügt.

## v1.0.11 — 2026-04-16

### Fix: Zeilenumbrüche in Notizen (fehlende CSS-Klasse)
- **Problem:** `whitespace-pre-wrap` wurde in der Vorlage gesetzt, existierte aber nicht in `app.css` (kein Tailwind-Build, sondern handgeschriebene Utility-Klassen).
- **Entscheidung:** `.whitespace-pre-wrap { white-space: pre-wrap; }` in `app.css` hinzugefügt.

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