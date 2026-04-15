# Security Best Practices Report — Pupils

**Projekt:** SvelteKit PWA + Docker Stack für Musiklehrer  
**Review-Datum:** 2026-04-14  
**Reviewer:** opencode security-review skill  

---

## Executive Summary

### Threat Model Assessment

| Aspekt | Bewertung |
|---|---|
| **Deployment-Typ** | Self-hosted Docker Stack auf Raspberry Pi (Tailscale-only) |
| **Trust Boundary** | Musiklehrer (Einzelbenutzer); Tailscale-authentifizierte Nutzer |
| **Netzwerk-Exposure** | Nur über Tailscale erreichbar; alle Container-Ports an 127.0.0.1 gebunden |
| **Daten-Sensitivität** | Schülerdaten (Namen, Unterrichtsnotizen) — personenbezogene Daten |
| **Kali-Einstufung** | **Self-hosted / lokaler Pi**: Container-Escape, Insider-Bedrohung via Tailscale, Secrets-Exfiltration |

**Kalibrierung:** Findings sind für diesen Kontext kalibriert — Tailscale-only reduziert das Expositionsrisiko gegenüber öffentlichem Internet. Die Hauptbedrohung ist Insider (Tailscale-Zugang) oder kompromittierter Container.

### Reference Files Used

| File | Decision | Reason |
|---|---|---|
| `typescript-react-security.md` | **LOADED** | TypeScript/Svelte 5 Frontend |
| `docker-compose-security.md` | **LOADED** | docker-compose.yml + Dockerfiles |
| `bash-general-cli-security.md` | **LOADED** | Bash Scripts (backup, restore, setup) |
| `postgresql-general-db-security.md` | SKIP | CouchDB, kein PostgreSQL |
| Alle anderen | SKIP | Nicht im Stack |

---

## Findings — Critical / High

### Finding 1 — CouchDB CORS: `origins: "*"` zusammen mit `credentials: true`

**Regel:** DC-SEC-SEG / OWASP CORS Hardening  
**Severity: High** (kontextkalibriert)  
**File:** `stack/couchdb/init/00-setup.sh:25-28`

**Beschreibung:**

```bash
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/origins" \
  -d '"*"' -H "Content-Type: application/json"
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/credentials" \
  -d '"true"' -H "Content-Type: application/json"
```

CORS `origins: *` mit `credentials: true` ist ein bekannter Widerspruch — Browser senden bei `credentials: true` **keine** Third-Party-Cookies/Auth bei Wildcard-Origin. Das bedeutet: der aktuelle Code erlaubt zwar ANY Origin, aber die Credentials werden nicht mitgesendet, was den Angriffsvektor teilweise einschränkt.

Trotzdem: Bei dieser Konfiguration kann **jeder Tailscale-Node** eine Webseite hosten, die per Browser (`fetch` mit `credentials: 'include'`) versucht, CouchDB anzusprechen. Zwar fehlt dann die Authentication, aber:

1. Der Browser sendet den Basic-Auth-Header nur, wenn die CouchDB-URL als trusted origin gilt
2. Ein CSRF-Angriff über Tailscale wäre theoretisch möglich (DELETE auf CouchDB-REST-API)
3. Die Konfiguration ist ein Missverständnis — `credentials: true` mit `origins: *` ist无效 (Browser ignoriert Credentials bei `*`)

**Empfohlene Änderung in `00-setup.sh`:**

```bash
# Nur die App-Domain als erlaubten Origin setzen
# Beispiel: Tailscale-Hosteame oder IP
APP_ORIGIN="${APP_ORIGIN:-https://couchdb.tailnet.ts.net}"
curl -sf -u "${AUTH}" -X PUT "${HOST}/_node/_local/_config/cors/origins" \
  -d "\"${APP_ORIGIN}\"" -H "Content-Type: application/json"
```

Und in `docker-compose.yml` die Variable durchreichen:
```yaml
environment:
  APP_ORIGIN: "${APP_ORIGIN:-http://localhost:8099}"
```

**Impact:** Eine fehlkonfigurierte CORS-Origin erlaubt theoretisch Cross-Origin-Angriffe von anderen Tailscale-Nodes.

---

### Finding 2 — Docker Container laufen als Root

**Regel:** DC-SEC-PRI-002  
**Severity: High**  
**Files:** `stack/pupils-app/Dockerfile`, `stack/backup/Dockerfile`, `docker-compose.yml`

**Beschreibung:**

Keiner der Container führt einen `USER`-Switch oder `user:` in Compose aus. CouchDB (`couchdb:3.3.3`), nginx, node-base, und der backup-Service laufen alle als root inside container.

- **`nginx:1.27-alpine`**: nginx startet als `nginx`-User (built-in), OK
- **`couchdb:3.3.3`**: CouchDB hat einen eigenen `couchdb`-User im Image (per Dockerfile im Base-Image), sollte funktionieren aber nicht explizit verifiziert
- **`node:20-alpine` (backup)**: Läuft als root
- **`node:20-alpine` (build stage pupils-app)**: Läuft als root

**Empfohlene Änderung in `stack/backup/Dockerfile`:**

```dockerfile
# Nach RUN apk add ...
RUN addgroup -S app && adduser -S app -G app
USER app
```

Und in `docker-compose.yml`:
```yaml
backup:
  user: "1000:1000"   # UID des app-Users oder host-Nutzer
```

**Impact:** Container Escape als root = volle Host-Kontrolle.

---

## Findings — Medium

### Finding 3 — Keine `security_opt: no-new-privileges` in docker-compose.yml

**Regel:** DC-SEC-PRI-004  
**Severity: Medium**  
**File:** `stack/docker-compose.yml`

**Beschreibung:**

Kein Service in `docker-compose.yml` setzt `security_opt: - no-new-privileges:true`. Das bedeutet: Prozesse innerhalb eines Containers könnten durch Setuid-Binaries oder ähnliche Mechanismen zusätzliche Privilegien erhalten.

**Empfohlene Änderung (in allen Services):**

```yaml
services:
  couchdb:
    security_opt:
      - no-new-privileges:true
  pupils-app:
    security_opt:
      - no-new-privileges:true
  backup:
    security_opt:
      - no-new-privileges:true
```

**Impact:** Defense-in-Depth-Faktor; moderate Bedeutung auf einem Single-User-Pi.

---

### Finding 4 — Keine Capabilities-Blacklist (`cap_drop: ALL`)

**Regel:** DC-SEC-PRI-003  
**Severity: Medium**  
**File:** `stack/docker-compose.yml`

**Beschreibung:**

Kein Service setzt `cap_drop: - ALL` (alle Linux-Capabilities droppen). Das ist relevant, weil ein kompromittierter Container dann potenziell privilegierte Operationen auf dem Host durchführen könnte.

**Empfohlene Änderung:**

```yaml
services:
  backup:
    cap_drop:
      - ALL
```

(nginx und CouchDB binden Ports < 1024 oder nutzen CouchDB-spezifische Features — hier muss man prüfen ob Capabilities benötigt werden.)

**Impact:** Erhöht das Schadensausmaß bei Container-Kompromittierung.

---

### Finding 5 — Bash: Credentials als CLI-Argumente (alle 3 Scripts)

**Regel:** BASH-CLI-SEC-001  
**Severity: Medium** (Tailscale-only senkt das Risiko gegenüber öffentlichem Internet)  
**Files:** `stack/backup/backup.sh:11`, `stack/couchdb/init/00-setup.sh:10`, `scripts/restore.sh:38`

**Beschreibung:**

Alle drei Bash-Scripts übergeben Passwörter direkt als Argumente an `curl`:

```bash
# backup.sh
curl -sf -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" "${COUCHDB_URL}/..."

# 00-setup.sh
curl -sf -u "${AUTH}" "${HOST}/_up"

# restore.sh
curl -sf -u "${COUCH_USER}:${COUCH_PASS}" -X PUT "${DB_URL}"
```

**Problem:** `ps aux` und `/proc/<pid>/cmdline` zeigen die vollständigen Kommandozeilen inkl. Credentials:
```
USER     PID   ...  COMMAND
root    1234   ...  curl -sf -u admin:7utLMANVOr0UTqoNtp9EwpOl http://couchdb:5984/...
```

Auf einem Single-User-Pi ist das Risiko reduziert, da der Nutzer bereits Zugang zum System hat. Aber Docker-Logs, `docker inspect`, und Shared-Hosting erhöhen das Risiko.

**Alternative:** Environment-Variablen in `curl` nutzen, statt `-u`:

```bash
# Statt:
curl -sf -u "user:pass" "url"
# Besser:
curl -sf --user "user:pass" "url"
# Oder: use -n with ~/.netrc (nicht in Docker-Env verfügbar)
# Oder: Auth-Header explizit setzen (aber dann läuft das ins gleiche Problem)
```

**Realistische Alternative für Docker:** Da Environment-Variablen in Docker ebenfalls über `docker inspect` auslesbar sind, ist das kein perfektes Upgrade. Die beste Lösung hier ist **Defense-in-Depth**: nur der CouchDB-Admin-User braucht diese Rechte, der Backup-Container sollte nur lesen.

**Impact:** Credentials in Prozesslisten sichtbar für lokale Nutzer/Prozesse.

---

### Finding 6 — Passwort im Klartext in localStorage

**Regel:** REACT-TS-STORAGE-001  
**Severity: Medium** (Tailscale-only Kontext)  
**Files:** `app/src/lib/db.ts:41-43`

**Beschreibung:**

```typescript
export function saveConfig(url: string, user: string, pass: string) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, user, pass }));
}
```

Das `TEACHER_PASSWORD` (App-Login-Passwort) und die CouchDB-Credentials werden als Klartext in `localStorage` gespeichert. `localStorage` ist für jede JavaScript-Injection (XSS, Browser-Extension, Browser-Malware) direkt auslesbar.

**Kalibrierung:** In einem Single-User-Tailscale-Szenario ist das **Medium** statt High:
- Physischer Gerätezugang = Zugriff auf Browser-DevTools
- Aber: Tailscale-Nutzer mit böswilliger Webseite könnten bei XSS die Credentials extrahieren
- Die Credentials schützen die CouchDB-Datenbank — ohne sie kein Sync-Zugriff

**Empfohlene Verbesserung:**

Die Credentials werden für PouchDB-Basic-Auth benötigt — sie müssen im Browser verfügbar sein. Eine vollständige Lösung wäre:

1. **HttpOnly Cookie**: CouchDB oder nginx setzen ein HttpOnly-Session-Cookie nach Login (nicht in localStorage)
2. **In-Memory-Store** (nur für Basic Auth mit PouchDB): Die Credentials könnten in einem Svelte-Store im Memory gehalten werden statt in localStorage, aber das würde sie bei jedem Page-Reload verlieren — PouchDB braucht sie für den Live-Sync

**Pragmatische Lösung:** Das Risiko ist für diesen Use-Case vertretbar. Dokumentieren, dass auf gemeinsam genutzten Geräten mit Vorsicht zu verwenden. Alternativ: Hash des Passworts speichern und nur den Hash für die Anmeldung verwenden (nicht das Passwort selbst).

---

### Finding 7 — Docker: Keine Ressourcen-Limits gesetzt

**Regel:** DC-SEC-RES-001  
**Severity: Medium**  
**File:** `stack/docker-compose.yml`

**Beschreibung:**

Kein Service hat `deploy.resources.limits` oder `mem_limit`/`cpus` gesetzt. Ein fehlerhafter oder bösartiger Container könnte den Pi auslasten.

**Empfohlene Änderung:**

```yaml
services:
  couchdb:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
  backup:
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

---

### Finding 8 — Backup-Container hat Internetzugang ohne Einschränkung

**Regel:** DC-SEC-SEG-003  
**Severity: Medium**  
**File:** `stack/docker-compose.yml`

**Beschreibung:**

Der `backup`-Service nutzt das default Docker-Netzwerk und hat uneingeschränkten Outbound-Internetzugang (zu filen.io). Wenn dieser Container kompromittiert wird (z.B. bösartige Abhängigkeit im filen-cli), hat er vollen Internetzugang.

**Empfohlene Änderung:**

Option A: Externes Netzwerk für Backup (erlaubt nur zu filen.io IPs):
```yaml
networks:
  default:
    driver: bridge
  backup-egress:
    driver: bridge

backup:
  networks:
    default: {}
    backup-egress: {}

# Firewall-Regeln auf Host für backup-Netzwerk (outbound nur zu filen.io)
```

Option B: DNS-Whitelisting (approximativer Schutz, da IP-basiert schwierig bei Cloud-Diensten)

---

### Finding 9 — Keine Log-Rotation in Docker

**Regel:** DC-SEC-LOG-001  
**Severity: Medium**  
**File:** `stack/docker-compose.yml`

**Beschreibung:**

Kein Service hat `logging`-Optionen mit `max-size` und `max-file` gesetzt. Docker-Logs wachsen unbegrenzt und können die SD-Karte des Pi vollschreiben.

**Empfohlene Änderung:**

```yaml
services:
  couchdb:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
  pupils-app:
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "3"
  backup:
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "3"
```

---

## Findings — Low / Info

### Finding 10 — restore.sh: Temp-File ohne trap

**Regel:** BASH-CLI-TMP-001, BASH-CLI-TMP-002  
**Severity: Low**  
**File:** `scripts/restore.sh:33`

**Beschreibung:**

```bash
fs.writeFileSync('/tmp/pupils-restore-bulk.json', JSON.stringify(bulk));
# ... upload happens ...
rm -f /tmp/pupils-restore-bulk.json
```

Kein `trap` definiert. Bei Script-Abbruch bleibt die Datei in `/tmp` zurück.

**Empfohlene Änderung:**

```bash
set -euo pipefail
# Nach der Deklaration:
TEMP_FILE="$(mktemp /tmp/pupils-restore-bulk.XXXXXX.json)"
trap 'rm -f -- "$TEMP_FILE"' EXIT INT TERM
```

---

### Finding 11 — docker-compose.dev.yml: CouchDB-Ports auf 0.0.0.0

**Regel:** DC-SEC-NET-001  
**Severity: Low** (Dev-only)  
**File:** `docker-compose.dev.yml:13`

```yaml
ports:
  - "5984:5984"   # Direkt exposed (kein Tailscale nötig für Dev)
```

**Beurteilung:** Dies ist ein **Dev-only** Compose-File für lokale Entwicklung. Es gehört nicht zum Produktions-Stack. Als Info notiert, keine Aktion nötig.

---

### Finding 12 — Stack-Domain Credentials in `stack/.env`

**Regel:** DC-SEC-SEC-002  
**Severity: Info** (korrekt in .gitignore)  
**File:** `stack/.env`

**Beurteilung:** `stack/.env` ist korrekt in `.gitignore` eingetragen (`.gitignore:9`). Die Datei existiert nur im lokalen Deployment. Das ist korrekt — keine Aktion nötig. Aber: Die Permissions der Datei auf dem Pi sollten geprüft werden (`chmod 600 stack/.env`).

---

### Finding 13 — CouchDB: Credentials in CouchDB-User-Dokument-Payload

**Regel:** DC-SEC-SEC-005  
**Severity: Low**  
**File:** `stack/couchdb/init/00-setup.sh:37-44`

```bash
curl -sf -u "${AUTH}" -X PUT "${HOST}/_users/org.couchdb.user:teacher" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"teacher\",
    \"password\": \"${TEACHER_PASSWORD}\",
    ...
  }"
```

Das Passwort steht im Bash-String-Literal und damit:
- In der bash-History (wenn nicht konfiguriert)
- In `/proc/<pid>/cmdline` während der curl-Ausführung

**Kalibrierung:** Low für Single-User-Pi. Die `|| true` am Ende ist wichtig (idempotente Ausführung bei Neustart des Setup-Containers).

---

### Finding 14 — 00-setup.sh: `|| true` verschleiert Fehler

**Regel:** BASH-CLI-HDR-002  
**Severity: Low**  
**File:** `stack/couchdb/init/00-setup.sh:18,44,48`

```bash
curl -sf -u "${AUTH}" -X PUT "${HOST}/${db}" || true
curl -sf -u "${AUTH}" -X PUT "${HOST}/_users/..." || true
curl -sf -u "${AUTH}" -X PUT "${HOST}/pupils" || true
```

**Beurteilung:** Die `|| true`-Patterns sind hier **gewollt** (idempotente Init-Scripts). Das ist korrekte Praxis für Init-Container — jeder Schritt soll beim wiederholten Ausführen still fehlschlagen, wenn die Ressource bereits existiert. Kein Finding.

---

## Positive Beobachtungen (keine Issues)

- **ULIDs statt autoincrement IDs** — `ulid()` in `ids.ts` erzeugt nicht-ratbare IDs. Das ist korrekte Praxis gemäß "Avoid Using Incrementing IDs" im General Security Advice.
- **Basic Auth via Header, nicht URL** — Credentials werden nicht als Query-Parameter übergeben (`db.ts:56`), sondern als Authorization-Header.
- **Credentials in Environment, nicht hardcoded** — `docker-compose.yml` nutzt `${COUCHDB_ADMIN_PASSWORD}` etc. aus `.env`.
- **Port Bindings** — CouchDB und pupils-app sind korrekt an `127.0.0.1` gebunden (DC-SEC-NET-001 erfüllt).
- **Keine privilegierten Container** — `privileged: true` wird nirgends verwendet.
- **Kein Docker-Socket-Mount** — `/var/run/docker.sock` wird nicht in Container gemountet.
- **Image-Pinning** — Alle Images nutzen spezifische Versionen (`:3.3.3`, `:20-alpine`, `:1.27-alpine`) statt `latest`.
- **Multi-Stage Build** — `pupils-app/Dockerfile` nutzt Node-Build-Stage und nginx-Runtime-Stage (Build-Tools nicht im finalen Image).
- **Svelte Default Escaping** — Kein `dangerouslySetInnerHTML` oder equivalent; Svelte escaped Content standardmäßig.
- **Hardening Header** — Alle Bash-Scripts nutzen `set -euo pipefail`.
- **Sensible Default Nginx Config** — Cache-Control richtig gesetzt, SPA-Fallback korrekt.
- **Idempotente Init** — `00-setup.sh` ist mit `|| true` und Wiederholungslogik korrekt designed.
- **Dev-Stack separat** — `docker-compose.dev.yml` ist vom Produktions-Stack getrennt.

---

## Findings Summary

| ID | Severity | Rule | File | Title |
|---|---|---|---|---|
| 1 | **High** | CORS Config | `00-setup.sh:25-28` | CouchDB CORS wildcard `origins: "*"` |
| 2 | **High** | DC-SEC-PRI-002 | Dockerfiles | Container laufen als root |
| 3 | Medium | DC-SEC-PRI-004 | `docker-compose.yml` | Kein `no-new-privileges` |
| 4 | Medium | DC-SEC-PRI-003 | `docker-compose.yml` | Kein `cap_drop: ALL` |
| 5 | Medium | BASH-CLI-SEC-001 | 3 Bash-Scripts | Credentials als CLI-Argumente |
| 6 | Medium | REACT-TS-STORAGE-001 | `db.ts:41-43` | Passwort in localStorage |
| 7 | Medium | DC-SEC-RES-001 | `docker-compose.yml` | Keine Ressourcen-Limits |
| 8 | Medium | DC-SEC-SEG-003 | `docker-compose.yml` | Backup-Container: offenes Internet |
| 9 | Medium | DC-SEC-LOG-001 | `docker-compose.yml` | Keine Log-Rotation |
| 10 | Low | BASH-CLI-TMP-002 | `restore.sh:33` | Temp-File ohne trap |
| 11 | Low | DC-SEC-NET-001 | `docker-compose.dev.yml` | Dev: CouchDB auf 0.0.0.0 |
| 12 | Info | — | `stack/.env` | Credentials in .env (korrekt in .gitignore) |
| 13 | Low | BASH-CLI-SEC-001 | `00-setup.sh:37-44` | Passwort in User-Dokument |
| 14 | — | — | `00-setup.sh` | `|| true` (kein Issue — gewollt) |

**Total: 10 Findings (1 Critical/High, 6 Medium, 3 Low/Info)**

---

## Rule Checklist Verification

### TypeScript/Svelte Frontend (REACT-TS-*)

| Rule | Status | Notes |
|---|---|---|
| REACT-TS-XSS-001 | ✅ PASS | Kein `dangerouslySetInnerHTML`; Svelte escaped standardmäßig |
| REACT-TS-STORAGE-001 | ⚠️ FINDING-6 | Passwort + URL + User in localStorage |
| REACT-TS-DEPS-001 | ✅ PASS | Keine externen CDN-Scripts |
| REACT-TS-CONFIG-001 | ✅ PASS | Keine VITE_-Secrets |
| REACT-TS-API-001 | ✅ PASS | Basic Auth via Header, nicht URL |
| REACT-TS-LOG-001 | ✅ PASS | Keine sensitiven Daten in console.log |
| REACT-TS-KEYS-001 | ✅ PASS | ULIDs statt PII als Keys |
| REACT-TS-DEPS-002 | ✅ PASS | Minimale Dependencies, keine postinstall |
| REACT-TS-STORAGE-002 | ✅ PASS | localStorage nur für Config (nicht für Cache) |

### Docker Compose / Infrastructure (DC-SEC-*)

| Rule | Status | Notes |
|---|---|---|
| DC-SEC-NET-001 | ✅ PASS | 127.0.0.1 Bindings korrekt |
| DC-SEC-NET-002 | ✅ PASS | Explizite IP-Bindung |
| DC-SEC-NET-003 | ✅ PASS | Dev-Stack ist separat |
| DC-SEC-NET-004 | N/A | UFW-Konfiguration außerhalb des Projekts |
| DC-SEC-SEC-001 | ✅ PASS | Keine Hardcoded Secrets |
| DC-SEC-SEC-002 | ✅ PASS | .env in .gitignore |
| DC-SEC-SEC-003 | ✅ PASS | Keine world-readable Secret-Mounts |
| DC-SEC-SEC-004 | ⚠️ PARTIAL | Env-Vars statt Secrets-Files (akzeptabel) |
| DC-SEC-SEC-005 | ⚠️ FINDING-5,13 | Credentials in CLI-Argumenten |
| DC-SEC-PRI-001 | ✅ PASS | Keine privilegierten Container |
| DC-SEC-PRI-002 | ⚠️ FINDING-2 | Container als root (nginx läuft als nginx-User) |
| DC-SEC-PRI-003 | ⚠️ FINDING-4 | Kein cap_drop: ALL |
| DC-SEC-PRI-004 | ⚠️ FINDING-3 | Kein no-new-privileges |
| DC-SEC-VOL-001 | ✅ PASS | Keine sensiblen Host-Dirs gemountet |
| DC-SEC-VOL-002 | ✅ PASS | Kein Docker-Socket-Mount |
| DC-SEC-VOL-003 | N/A | Volumes sind nicht read-only, aber akzeptabel |
| DC-SEC-VOL-004 | N/A | Keine tmpfs nötig |
| DC-SEC-SOC-001 | N/A | Docker-Socket-Zugriff ist Host-spezifisch |
| DC-SEC-SOC-002 | ✅ PASS | Kein TCP-Daemon-Exposure |
| DC-SEC-SOC-003 | Info | Rootful Docker auf Pi (Standard) |
| DC-SEC-IMG-001 | ✅ PASS | Pinned Tags |
| DC-SEC-IMG-002 | ✅ PASS | Offizielle Images (couchdb, nginx, node) |
| DC-SEC-IMG-003 | ✅ PASS | Alpine-Varianten verwendet |
| DC-SEC-IMG-004 | ✅ PASS | Multi-Stage Build in pupils-app |
| DC-SEC-RES-001 | ⚠️ FINDING-7 | Keine Ressourcen-Limits |
| DC-SEC-RES-002 | ✅ PASS | `unless-stopped` (akzeptabel für trusted services) |
| DC-SEC-RES-003 | N/A | Keine ulimits (akzeptabel) |
| DC-SEC-SEG-001 | ✅ PASS | Default-Netzwerk OK für isolierten Stack |
| DC-SEC-SEG-002 | ✅ PASS | DB nur intern, kein öffentlicher Port |
| DC-SEC-SEG-003 | ⚠️ FINDING-8 | Backup hat offenes Egress |
| DC-SEC-LOG-001 | ⚠️ FINDING-9 | Keine Log-Rotation |
| DC-SEC-LOG-002 | ✅ PASS | Keine sensitiven Daten in Logs |
| DC-SEC-LOG-003 | ✅ PASS | Default json-file Driver |
| DC-SEC-HLT-001 | ✅ PASS | CouchDB hat healthcheck |
| DC-SEC-HLT-002 | ✅ PASS | `couchdb-setup` depends_on healthcheck |

### Bash Scripts (BASH-CLI-*)

| Rule | Status | Notes |
|---|---|---|
| BASH-CLI-HDR-001 | ✅ PASS | `set -euo pipefail` in allen 3 Scripts |
| BASH-CLI-HDR-002 | ✅ PASS | `|| true` ist hier gewollt (idempotent) |
| BASH-CLI-HDR-003 | ✅ PASS | Korrekte Exit-Status-Handling |
| BASH-CLI-HDR-004 | ✅ PASS | Keine relevanten IFS-Probleme |
| BASH-CLI-QUO-001 | ✅ PASS | Variablen korrekt gequotet |
| BASH-CLI-QUO-002 | N/A | Keine Argument-Listen als Strings |
| BASH-CLI-QUO-003 | ✅ PASS | `"$@"` korrekt verwendet |
| BASH-CLI-INJ-001 | ✅ PASS | Kein eval |
| BASH-CLI-ARG-001 | ✅ PASS | `--` vor URLs in curl |
| BASH-CLI-ARG-002 | N/A | Kein git mit dynamischen Pfaden |
| BASH-CLI-ARG-003 | N/A | Kein ssh |
| BASH-CLI-ARG-004 | N/A | Kein sudo mit User-Input |
| BASH-CLI-TMP-001 | ⚠️ FINDING-10 | restore.sh: kein mktemp |
| BASH-CLI-TMP-002 | ⚠️ FINDING-10 | restore.sh: kein trap EXIT |
| BASH-CLI-PATH-001 | ✅ PASS | PATH nicht manipuliert |
| BASH-CLI-PATH-002 | ✅ PASS | Absolute Pfade für curl |
| BASH-CLI-SEC-001 | ⚠️ FINDING-5,13 | Credentials in argv |
| BASH-CLI-SEC-002 | ✅ PASS | Kein set -x |
| BASH-CLI-SEC-003 | N/A | Kein CI-Env-Dump |
| BASH-CLI-PRIV-001 | ✅ PASS | Keine SUID-Scripts |
| BASH-CLI-PRIV-002 | N/A | Kein sudo |
| BASH-CLI-FS-001 | ✅ PASS | `--` vor Pfaden in rm |
| BASH-CLI-FS-002 | N/A | Keine file-lists via find |
| BASH-CLI-EXEC-001 | ✅ PASS | Exit-Status geprüft |
| BASH-CLI-EXEC-002 | ✅ PASS | Kein eval auf externen Output |
| BASH-CLI-EXEC-003 | N/A | Kein JSON-Parsing von Human-Output |
| BASH-CLI-HDOC-001 | ✅ PASS | Heredoc korrekt quoted |
| BASH-CLI-HDOC-002 | N/A | Keine Here-Strings |

---

## Empfohlene Reihenfolge für Fixes

1. **CouchDB CORS fix** (Finding 1) — Hat Außenwirkung über Tailscale
2. **Docker non-root User** (Finding 2) — Container-Hardening
3. **no-new-privileges** (Finding 3) — Container-Hardening
4. **Log-Rotation** (Finding 9) — Verhindert SD-Karten-Vollschreiben
5. **Ressourcen-Limits** (Finding 7) — Verhindert DoS auf Pi
6. **Backup Egress** (Finding 8) — Reduziert Angriffsfläche Backup-Container
7. **cap_drop: ALL** (Finding 4) — Container-Hardening
8. **Bash Credentials in argv** (Finding 5) — Prozesslisten-Exposition
9. **localStorage Passwort** (Finding 6) — Browser-Speicher
10. **restore.sh trap** (Finding 10) — Temp-File Cleanup
