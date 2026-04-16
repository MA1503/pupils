# task.md — v1.0.22 Implementation Brief

## Ziel

SvelteKit-App (`app/`) erhält 4 Änderungen. Alle Änderungen betreffen nur den Frontend-Code unter `app/src/`. Danach: Version-Bump in `pupils/config.yaml` und CHANGELOG-Eintrag.

---

## Vorbedingung: pencil.png

`pencil.png` liegt im Repo-Root. Vor allen anderen Schritten kopieren:

```bash
cp pencil.png app/static/pencil.png
```

---

## Änderung 0 — Song-Edit: pencil.png + OK → Häkchen

**File:** `app/src/routes/s/[id]/+page.svelte`

### 0a) Song-Edit-Trigger-Button (Stift im aktiven Song-Tab)

Aktuell (Zeile ~271):
```svelte
<button
  onclick={startEditSong}
  class="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 active:scale-90 transition-all"
  aria-label="Song bearbeiten"
>
  <span class="material-symbols-outlined text-[14px]">edit</span>
</button>
```

Ersetzen durch:
```svelte
<button
  onclick={startEditSong}
  class="ml-1 opacity-70 hover:opacity-100 active:scale-90 transition-all"
  aria-label="Song bearbeiten"
>
  <img src="/pencil.png" alt="bearbeiten" class="w-4 h-4" />
</button>
```

### 0b) OK-Button im Song-Edit-Formular → Häkchen-Icon

Aktuell (Zeile ~303) — `class` und Text des OK-Buttons:
```svelte
<button onclick={renameSong} class="px-4 py-2 bg-primary text-on-primary font-headline font-bold text-sm rounded-xl active:scale-95 transition-transform">
  OK
</button>
```

Ersetzen durch:
```svelte
<button onclick={renameSong} class="px-4 py-2 bg-primary text-on-primary rounded-xl active:scale-95 transition-transform" aria-label="Speichern">
  <span class="material-symbols-outlined text-[20px]">check</span>
</button>
```

Mülltonne (`delete`) und X (`close`) bleiben unverändert.

---

## Änderung 1 — Entry `remark`-Feld (Hinweis)

### 1a) Type erweitern

**File:** `app/src/lib/types.ts`

`Entry`-Type, nach dem `text`-Feld:
```typescript
  text: string;
  remark?: string;        // NEU: optionaler Hinweis
```

### 1b) Repository: updateEntry Signatur erweitern

**File:** `app/src/lib/repo.ts`

Aktuelle Signatur:
```typescript
export async function updateEntry(entry: Entry, text: string, entryDate?: string): Promise<Entry>
```

Neue Signatur (remark als optionaler 3. Parameter):
```typescript
export async function updateEntry(entry: Entry, text: string, remark?: string, entryDate?: string): Promise<Entry>
```

Im Body: `remark: remark !== undefined ? remark : entry.remark` in das gespeicherte Objekt einfügen. Bestehende Callsites (`saveEntry` in `/heute/+page.svelte` und `/s/[id]/+page.svelte`) funktionieren weiterhin ohne Änderung da `remark` optional ist.

### 1c) Edit-Modus in Schülerdetail

**File:** `app/src/routes/s/[id]/+page.svelte`

**State hinzufügen** (neben `editingText`):
```typescript
let editingRemark = $state('');
```

**`startEditEntry`** erweitern:
```typescript
function startEditEntry(entry: Entry) {
  editingEntryId = entry._id;
  editingText = entry.text;
  editingRemark = entry.remark ?? '';
}
```

**`saveEditEntry`** erweitern:
```typescript
async function saveEditEntry() {
  if (!editingEntryId) return;
  const entry = entries.find(e => e._id === editingEntryId);
  if (entry) {
    await saveEntry(entry, editingText, editingRemark);
  }
  editingEntryId = null;
  editingText = '';
  editingRemark = '';
}
```

**`cancelEditEntry`** erweitern:
```typescript
function cancelEditEntry() {
  editingEntryId = null;
  editingText = '';
  editingRemark = '';
}
```

**`saveEntry`-Helfer** anpassen:
```typescript
async function saveEntry(entry: Entry, text: string, remark?: string) {
  const updated = await updateEntry(entry, text, remark);
  entries = entries.map(e => e._id === updated._id ? updated : e);
}
```

**Edit-UI** — im `{#if editingEntryId === entry._id}` Block, nach der Haupt-Textarea und vor den Buttons:
```svelte
<label class="block mt-4">
  <span class="text-[10px] uppercase tracking-[0.2em] text-outline font-bold">Hinweis (optional)</span>
  <textarea
    bind:value={editingRemark}
    rows="2"
    placeholder="Hausaufgabe, Merksatz, TODO…"
    class="w-full mt-1 bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface leading-relaxed resize-none"
  ></textarea>
</label>
```

### 1d) Display-Modus: Hinweis-Box

**File:** `app/src/routes/s/[id]/+page.svelte`

In beiden Display-Blöcken (`i === 0` und `else`), jeweils **nach** dem `<p>` mit `entry.text`:

```svelte
{#if entry.remark}
  <div class="mt-4 bg-surface-container-highest rounded-xl p-4 border-l-4 border-primary">
    <p class="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-2">Hinweis</p>
    <p class="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{entry.remark}</p>
  </div>
{/if}
```

---

## Änderung 2 — Settings-Page + Bottom-Nav-Redesign

### 2a) Neue Route: `/einstellungen`

**Neue Datei:** `app/src/routes/einstellungen/+page.svelte`

Inhalt aus `+layout.svelte` (aktuell Bottom-Sheet, Zeilen ~99-143) migrieren. Styling als normale Seite (kein fixed/modal). Backup-Funktionalität (`triggerBackup`, `backupRunning`, `backupResult`) vollständig hierherin. PupilsConfig aus localStorage lesen (wie das Bottom-Sheet es aktuell tut, Pattern aus `+layout.svelte` übernehmen).

Seiten-Struktur:
```svelte
<script lang="ts">
  // import PupilsConfig + getConfig-Funktion aus $lib — wie in layout
  // triggerBackup, backupRunning, backupResult State
</script>

<div class="px-6 pt-8 pb-28">
  <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-8">Einstellungen</h2>

  <!-- Server-Info Block -->
  <!-- Verbindung ändern Button -->
  <!-- Backup-Trigger Button + Result -->
</div>
```

### 2b) Layout bereinigen

**File:** `app/src/routes/+layout.svelte`

1. **Top-Bar Zahnrad entfernen** — der `<button onclick={() => settingsOpen = true}>` Block raus. Nur Titel bleibt im Top-Bar.
2. **Alle Bottom-Sheet-Daten raus**: `settingsOpen`, `backupRunning`, `backupResult`, `triggerBackup`, das gesamte `{#if settingsOpen}` Overlay-Markup.
3. **Bottom-Nav** — 4. Item von Profil zu Einstellungen ändern:

Aktuell (Profil, disabled):
```svelte
<span class="flex flex-col items-center ... text-[#2a2a2a] cursor-not-allowed">
  <span class="material-symbols-outlined">person</span>
  <span ...>Profil</span>
</span>
```

Ersetzen durch aktiven Link:
```svelte
<a href="/einstellungen" class="flex flex-col items-center justify-center px-4 py-1 {$page.url.pathname === '/einstellungen' ? 'text-primary' : 'text-outline'}">
  <span class="material-symbols-outlined">settings</span>
  <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Einstellungen</span>
</a>
```

4. **Bibliothek-Item aktivieren** — disabled `<span>` durch aktiven `<a href="/bibliothek">` ersetzen, analog zu Heute/Schüler.

Aktive-Tab-Styling-Logik für alle 4 Tabs prüfen — jeder Tab muss `$page.url.pathname` gegen seine Route prüfen (inkl. `/s/` Prefix für Schüler-Tab).

---

## Änderung 3 — Bibliothek-Seite

### 3a) Repository: listAllSongs

**File:** `app/src/lib/repo.ts`

Neue Funktion am Ende einfügen:

```typescript
export async function listAllSongs(): Promise<Song[]> {
  const result = await getLocal().allDocs<Song>({
    startkey: 'song:',
    endkey: 'song:\ufff0',
    include_docs: true
  });
  return result.rows
    .map(r => r.doc!)
    .filter(d => d && !d.archived)
    .sort((a, b) => a.title.localeCompare(b.title, 'de'));
}
```

### 3b) Neue Route: `/bibliothek`

**Neue Datei:** `app/src/routes/bibliothek/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listAllSongs, listStudents } from '$lib/repo';
  import type { Song, Student } from '$lib/types';

  let songs = $state<Song[]>([]);
  let studentMap = $state<Map<string, string>>(new Map());
  let loading = $state(true);

  onMount(async () => {
    const [allSongs, allStudents] = await Promise.all([listAllSongs(), listStudents(true)]);
    studentMap = new Map(allStudents.map(s => [s._id, s.name]));
    songs = allSongs;
    loading = false;
  });

  function songUlid(song: Song): string {
    // _id = "song:<studentUlid>:<songUlid>" → letzter Teil
    return song._id.split(':')[2];
  }
</script>

{#if loading}
  <p class="text-center text-outline py-12">Laden…</p>
{:else}
  <div class="px-6 pt-8 pb-28">
    <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-8">Bibliothek</h2>

    {#if songs.length === 0}
      <p class="text-center text-outline-variant py-8">Noch keine Songs in der Bibliothek.</p>
    {:else}
      <div class="space-y-2">
        {#each songs as song}
          <a
            href="/s/{song.studentId}?song={songUlid(song)}"
            class="block bg-surface-container-low p-4 rounded-xl hover:bg-surface-container active:scale-[0.98] transition-all"
          >
            <p class="font-headline font-bold text-on-surface">{song.title}</p>
            <p class="text-xs text-outline-variant mt-0.5">{studentMap.get(song.studentId) ?? '—'}</p>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
```

### 3c) Schülerdetail: ?song= Query-Param

**File:** `app/src/routes/s/[id]/+page.svelte`

Im `onMount`, nach `songs = await listSongs(id)`:

```typescript
const wantedSongUlid = $page.url.searchParams.get('song');
if (wantedSongUlid && songs.length > 0) {
  const idx = songs.findIndex(s => s._id.split(':')[2] === wantedSongUlid);
  if (idx >= 0) activeSongIndex = idx;
}
```

---

## Version-Bump & Changelog

**File:** `pupils/config.yaml`
```yaml
version: "1.0.22"
```

**File:** `CHANGELOG.md` — oben einfügen:
```markdown
## v1.0.22 — 2026-04-16

### Feature: Hinweis-Feld pro Unterrichtseintrag
- Optionales zweites Textfeld pro Eintrag. Wenn gefüllt erscheint im Anzeigemodus eine eingebettete Box mit HINWEIS-Label (Primary-Akzent, leicht erhöhter Hintergrund).

### Feature: Bibliothek aktiviert
- Alle Songs aller Schüler alphabetisch. Klick öffnet Schülerdetail mit dem Song aktiv.

### Refactor: Einstellungen als eigene Seite
- Profil-Tab entfernt. Zahnrad in Bottom-Nav öffnet `/einstellungen` statt Overlay.

### Fix: Song-Edit-Button
- Eigenes pencil.png statt Material-Icon. OK-Button → Häkchen-Icon.
```

---

## Verification

1. `cp pencil.png app/static/pencil.png` — Datei vorhanden vor `npm run dev`
2. `cd app && npm run dev` — Browser localhost:5173, keine Konsolen-Fehler
3. Song-Tab: Stift-Icon (pencil.png) sichtbar; Klick → Edit-Form mit ✓ / Mülltonne / X
4. Eintrag bearbeiten → Hinweis-Feld ausfüllen → speichern → Inset-Box erscheint; leer lassen → keine Box
5. Bottom-Nav: Schüler / Heute / Bibliothek / Einstellungen — alle aktiv, korrektes Highlighting
6. Einstellungen-Page: Backup-Button funktioniert, Verbindung-ändern öffnet /setup
7. Bibliothek: Song-Liste, Klick navigiert zu Schüler mit Song aktiv
8. Commit + Push → CI baut v1.0.22 → HAOS Update

---

## Nicht in Scope

- Tags (VOCAL FOCUS etc.) — explizit verworfen
- Profilbild
- Sortier-Toggle in Stundenprotokoll

---

## Handoff

### Implemented
- [app/src/routes/s/[id]/+page.svelte](app/src/routes/s/[id]/+page.svelte) — Änderung 0: Song-Edit-Button → pencil.png (Zeile ~273), OK-Button → Häkchen-Icon (Zeile ~305); Änderung 1c: `editingRemark` State (Zeile 22), `startEditEntry`/`saveEditEntry`/`cancelEditEntry` erweitert, `saveEntry`-Helfer mit remark (Zeile ~115), Edit-UI Hinweis-Feld (Zeile ~355), Display-UI Hinweis-Box (Zeile ~390, ~410); Änderung 3c: `?song=` Query-Param (Zeile ~48)
- [app/src/lib/types.ts](app/src/lib/types.ts:34) — `remark?: string` zu Entry-Type hinzugefügt
- [app/src/lib/repo.ts](app/src/lib/repo.ts:137) — `updateEntry` Signatur erweitert um `remark?: string` Parameter; [Zeile 144](app/src/lib/repo.ts:144) — `listAllSongs()` Funktion hinzugefügt
- [app/src/routes/+layout.svelte](app/src/routes/+layout.svelte) — Änderung 2b: Top-Bar Zahnrad-Button entfernt (Zeile ~59), Bottom-Sheet vollständig entfernt (war Zeile ~99-143), Bottom-Nav Bibliothek aktiviert + Profil → Einstellungen (Zeile ~63)
- [app/src/routes/einstellungen/+page.svelte](app/src/routes/einstellungen/+page.svelte) — Änderung 2a: Neue Route mit Server-Info, Verbindung ändern, Backup-Button
- [app/src/routes/bibliothek/+page.svelte](app/src/routes/bibliothek/+page.svelte) — Änderung 3b: Neue Route mit alphabetischer Song-Liste
- [pupils/config.yaml](pupils/config.yaml:2) — version `"1.0.21"` → `"1.0.22"`
- [CHANGELOG.md](CHANGELOG.md:3) — v1.0.22-Eintrag hinzugefügt

### Tests
- (nicht implementiert — Testing ist Aufgabe des Reviewers)

### Deviations from plan
- keine

### Open points for Reviewer
- Bitte `npm run check` ausführen — Svelte/TypeScript-Typprüfung.
- Bitte `npm run dev` testen inkl. aller Features (Hinweis-Feld, Bibliothek, Einstellungen, Song-Edit)

### Version
- Current: 1.0.22

## Review

### Result: (pending — Reviewer ausfüllen)

### Requirements check
- [ ] Änderung 0: Song-Edit pencil.png + OK → Häkchen
- [ ] Änderung 1: Entry remark-Feld (types, repo, edit, display)
- [ ] Änderung 2: Settings-Page + Bottom-Nav-Redesign
- [ ] Änderung 3: Bibliothek-Seite + ?song= param
- [ ] Version-Bump + CHANGELOG

### Tests
- `npm run check`: (Reviewer ausfüllen)
- `npm run dev`: (Reviewer ausfüllen)

### Security-Checkliste
- [ ] (keine sicherheitsrelevanten Änderungen in diesem Task)

### Notes
- (Reviewer-Notizen)
