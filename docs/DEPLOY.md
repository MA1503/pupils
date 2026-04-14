# Deployment auf Raspberry Pi 400 (HAOS)

## Voraussetzungen

- HAOS läuft auf dem Pi
- USB-Platte eingesteckt und als Storage eingebunden (z.B. `/mnt/usb/`)
- **Portainer** HA-Addon installiert und gestartet
- **Tailscale** HA-Addon installiert, `tailscale up` durchgeführt, Gerät im Tailscale-Dashboard sichtbar
- Dieses Repo zugänglich (GitHub-URL oder manueller Upload)

## Schritt 1: Verzeichnisse anlegen

Auf dem Pi via SSH (HA Terminal-Addon oder Advanced SSH Addon):

```bash
mkdir -p /mnt/usb/pupils/couchdb-data
mkdir -p /mnt/usb/pupils/couchdb-config
mkdir -p /mnt/usb/pupils/backups
```

## Schritt 2: Stack in Portainer anlegen

1. Portainer öffnen (HA → Portainer Addon → „Open Web UI")
2. **Stacks** → **Add stack**
3. Option A — Git-Repo (empfohlen):
   - Repository URL: deine GitHub-URL
   - Compose path: `stack/docker-compose.yml`
   - Bei privatem Repo: Deploy-Key hinterlegen
4. Option B — Manuell:
   - Inhalt von `stack/docker-compose.yml` ins Web-Editor-Feld einfügen

## Schritt 3: Environment Variables setzen

In Portainer unter dem Stack → **Environment variables**:

| Variable | Wert |
|---|---|
| `COUCHDB_ADMIN_USER` | `admin` |
| `COUCHDB_ADMIN_PASSWORD` | mind. 24 Zeichen, z.B. `pwgen -s 24 1` |
| `TEACHER_PASSWORD` | mind. 16 Zeichen — das ist das App-Passwort |
| `COUCHDB_CORS_ORIGIN` | URL der App, z.B. `https://<tailnet>.ts.net` (Port 443) oder `http://192.168.1.100:8099` |
| `FILEN_EMAIL` | filen.io E-Mail |
| `FILEN_PASSWORD` | filen.io Passwort |

## Schritt 4: Stack deployen

„Deploy the stack" — Portainer baut die Images und startet Container.  
In den Logs verfolgen:
- `couchdb`: Sollte `CouchDB Setup abgeschlossen` zeigen, dann `healthy`
- `pupils-app`: nginx startet
- `backup`: crond startet (keine weiteren Logs bis 2:00 Uhr)

## Schritt 5: Tailscale Serve konfigurieren

Auf dem Pi via SSH:

```bash
# App über Tailscale erreichbar machen
tailscale serve --bg --https=443 --set-path=/ http://localhost:8099

# CouchDB über Tailscale erreichbar machen (für App-Setup)
tailscale serve --bg --https=443 --set-path=/couchdb http://localhost:5984

# Status prüfen
tailscale serve status
```

Die App ist jetzt unter `https://<pi-hostname>.ts.net/` erreichbar.  
CouchDB unter `https://<pi-hostname>.ts.net/couchdb`.

## Schritt 6: Backup manuell testen

```bash
docker exec -it $(docker ps -qf name=backup) /backup.sh
```

Erfolgreich wenn: kein Fehler + Datei in filen.io Webinterface unter `/pupils-backups/` sichtbar.
