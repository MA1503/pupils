# Ersteinrichtung auf dem Handy (Android Chrome)

**Voraussetzung**: Tailscale ist auf dem Handy installiert und du bist mit demselben Tailscale-Account angemeldet.

## Schritt 1: App öffnen

In Chrome auf deinem Handy öffnen:  
`https://<pi-hostname>.ts.net/`

Du siehst den Einrichtungsbildschirm.

## Schritt 2: Verbindung einrichten

Fülle die Felder aus:

| Feld | Wert |
|---|---|
| **Server-URL** | `https://<pi-hostname>.ts.net/couchdb/pupils` |
| **Benutzer** | `teacher` |
| **Passwort** | Das `TEACHER_PASSWORD` aus dem Stack |

Tipp auf **Verbinden**.  
Bei Erfolg siehst du sofort die Schülerliste.

## Schritt 3: App installieren

Chrome-Menü (⋮) → **„Zum Startbildschirm hinzufügen"**  
→ App erscheint auf dem Homescreen und startet fortan wie eine normale App.

## Schritt 4: Offline-Test

Flugmodus aktivieren → App öffnen → Eintrag schreiben → Flugmodus aus → 
Sync-Symbol oben rechts wird kurz grün → Eintrag erscheint in Fauxton auf dem Pi.

## Fehler-Lösungen

| Fehler | Ursache | Lösung |
|---|---|---|
| „Server nicht erreichbar" | Tailscale nicht verbunden | Tailscale auf Handy öffnen, verbinden |
| „401: Falsches Passwort" | Falsches TEACHER_PASSWORD | Passwort in Portainer Stack-Env prüfen |
| CORS-Fehler | 00-setup.sh nicht gelaufen | CouchDB-Container neu starten |
