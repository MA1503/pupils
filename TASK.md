# Pupils App — Task für Kimi Implementierung (Session 3)

## Kontext

SvelteKit PWA + Docker Stack für eine Musiklehrerin. CSS ist **handgerollt** (kein Tailwind-Plugin) — alle Utility-Klassen stehen in `app/src/app.css`. Neue CSS-Klassen MÜSSEN dort eingetragen werden, sonst sind sie wirkungslos.

Svelte 5 mit Runes (`$state`, `$derived`, `$props`). Stores in `.ts`-Dateien bleiben bei `writable()` aus `svelte/store`.

---

## Change 1 — App-Name umbenennen

**Datei:** `app/src/routes/+layout.svelte`

**Zeile 40:**
```svelte
<!-- ALT: -->
<span class="text-xl font-bold text-[#ff8ba1] font-headline tracking-tight">The Rhythmic Atelier</span>

<!-- NEU: -->
<span class="text-xl font-bold text-[#ff8ba1] font-headline tracking-tight">Yasmins Vocal Lab</span>
```

---

## Change 2 — Buttons mehr visuelle Tiefe

Alle aktiven/primären Buttons wirken zu flach. Fixes in `app/src/app.css` und den Templates.

### 2a. In `app/src/app.css` diese Klassen hinzufügen (am Ende der Datei):

```css
/* === Button Elevation === */
.shadow-primary { box-shadow: 0 4px 16px rgba(255, 139, 161, 0.35); }
.shadow-primary-lg { box-shadow: 0 8px 24px rgba(255, 139, 161, 0.4); }
.text-primary-dim { color: var(--primary-dim); }
.primary-dim { color: var(--primary-dim); }
.mt-0\.5 { margin-top: 0.125rem; }
.border-primary\/20 { border-color: rgba(255, 139, 161, 0.2); }
.-translate-x-1\/2 { transform: translateX(-50%); }
.z-\[100\] { z-index: 100; }
.z-\[101\] { z-index: 101; }
.left-1\/2 { left: 50%; }
details summary::-webkit-details-marker { display: none; }
.font-body { font-family: var(--font-body); }
```

### 2b. In `app/src/routes/+page.svelte` — Sort-Buttons (Zeilen 43–54):

Aktiver Sort-Button bekommt zusätzlich `shadow-primary`:
```svelte
class="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 {$sortKey === 'name' ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-primary' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}"
```
```svelte
class="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 {$sortKey === 'contractStart' ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-primary' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}"
```

### 2c. In `app/src/routes/+page.svelte` — FAB-Button (Zeile ~98):

`editorial-shadow` → `editorial-shadow shadow-primary-lg`:
```svelte
class="editorial-shadow shadow-primary-lg bg-gradient-to-br from-primary to-primary-container text-on-primary-container h-14 pl-5 pr-6 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform duration-200"
```

### 2d. In `app/src/routes/s/[id]/+page.svelte` — HEUTE FAB (Zeile ~323):

```svelte
class="flex items-center gap-2 px-6 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold rounded-2xl fab-shadow shadow-primary-lg active:scale-90 transition-transform"
```

---

## Change 3 — Settings-Button (Zahnrad) mit Funktion belegen

Der Settings-Button in `+layout.svelte` öffnet ein Bottom-Sheet mit Verbindungsstatus und "Verbindung ändern".

### 3a. `app/src/routes/+layout.svelte` — komplettes `<script>` ersetzen:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { loadConfig, startSync, onSyncStatus } from '$lib/db';
  import { syncStatus } from '$lib/stores';

  let { children } = $props();
  let currentPath = $derived($page.url.pathname);
  let settingsOpen = $state(false);
  let config = $state<{ url: string; user: string } | null>(null);

  onMount(() => {
    const cfg = loadConfig();
    config = cfg ? { url: cfg.url, user: cfg.user } : null;
    if (!cfg && $page.url.pathname !== '/setup') {
      goto('/setup');
      return;
    }
    if (cfg) {
      startSync(cfg.url, cfg.user, cfg.pass);
    }
    const unsubscribe = onSyncStatus((s) => syncStatus.set(s));
    return unsubscribe;
  });

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/' || currentPath.startsWith('/s/');
    return currentPath.startsWith(path);
  }
</script>
```

### 3b. `app/src/routes/+layout.svelte` — komplettes Template ersetzen:

```svelte
<div class="flex justify-center min-h-screen">
  <main class="w-full max-w-[640px] flex flex-col min-h-screen pb-20">
    <!-- TopAppBar -->
    <header class="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-md max-w-[640px]">
      <div class="flex items-center justify-between px-6 h-16 w-full">
        <span class="text-xl font-bold text-[#ff8ba1] font-headline tracking-tight">Yasmins Vocal Lab</span>
        <button
          onclick={() => settingsOpen = true}
          class="material-symbols-outlined text-[#ececec] hover:bg-[#262626] transition-colors p-2 rounded-full"
        >settings</button>
      </div>
    </header>

    <!-- Content -->
    <div class="mt-20 px-6 pb-6">
      {@render children()}
    </div>

    <!-- BottomNavBar -->
    <nav class="fixed bottom-0 w-full z-50 rounded-t-3xl bg-[#131313]/80 backdrop-blur-md shadow-[0_-12px_32px_rgba(0,0,0,0.4)] max-w-[640px]">
      <div class="flex justify-around items-center px-4 h-20 w-full">
        <a href="/"
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/') && currentPath !== '/setup' ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}"
        >
          <span class="material-symbols-outlined" style={isActive('/') && currentPath !== '/setup' ? "font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : ""}>group</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Schüler</span>
        </a>
        <a href="/heute"
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/heute') ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}"
        >
          <span class="material-symbols-outlined">event_note</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Heute</span>
        </a>
        <span class="flex flex-col items-center justify-center px-4 py-1 text-[#2a2a2a] cursor-not-allowed">
          <span class="material-symbols-outlined">library_music</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Bibliothek</span>
        </span>
        <span class="flex flex-col items-center justify-center px-4 py-1 text-[#2a2a2a] cursor-not-allowed">
          <span class="material-symbols-outlined">person</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Profil</span>
        </span>
      </div>
    </nav>
  </main>
</div>

<!-- Settings Bottom Sheet -->
{#if settingsOpen}
  <div
    class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
    onclick={() => settingsOpen = false}
    role="presentation"
  ></div>
  <div class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-[101] bg-[#191a1a] rounded-t-3xl p-6 pb-10 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
    <div class="w-10 h-1 bg-[#484848] rounded-full mx-auto mb-6"></div>
    <h2 class="font-headline font-bold text-lg text-on-surface mb-6">Einstellungen</h2>

    <div class="space-y-4 mb-8">
      <div class="bg-surface-container-highest p-4 rounded-xl">
        <p class="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Server</p>
        <p class="text-sm text-on-surface-variant font-body truncate">{config?.url ?? '—'}</p>
      </div>
      <div class="bg-surface-container-highest p-4 rounded-xl">
        <p class="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Benutzer</p>
        <p class="text-sm text-on-surface-variant font-body">{config?.user ?? '—'}</p>
      </div>
    </div>

    <button
      onclick={() => { settingsOpen = false; goto('/setup'); }}
      class="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-headline font-bold rounded-xl active:scale-95 transition-transform shadow-primary"
    >
      Verbindung ändern
    </button>
  </div>
{/if}
```

---

## Change 4 — Schüler Pausieren / Reaktivieren

**Datei:** `app/src/routes/s/[id]/+page.svelte`

### 4a. Funktion im `<script>` ergänzen (nach der `saveStudent`-Funktion):

```ts
async function toggleArchive() {
  if (!student) return;
  const msg = student.archived
    ? `${student.name} wieder aktivieren?`
    : `${student.name} pausieren? Der Schüler verschwindet aus der Hauptliste.`;
  if (!confirm(msg)) return;
  student = await updateStudent(student, { archived: !student.archived });
}
```

### 4b. Im Edit-Formular nach dem Tarif-`<input>`, vor den Buttons einfügen:

```svelte
<!-- Archiv-Toggle -->
<div class="flex items-center justify-between bg-surface-container-low p-4 rounded-xl">
  <div>
    <p class="text-sm font-semibold text-on-surface">Status</p>
    <p class="text-xs text-outline mt-0\.5">{student.archived ? 'Pausiert — nicht in Hauptliste' : 'Aktiv'}</p>
  </div>
  <button
    type="button"
    onclick={toggleArchive}
    class="px-4 py-2 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 {student.archived ? 'bg-primary text-on-primary-container shadow-primary' : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant\/30'}"
  >
    {student.archived ? 'Aktivieren' : 'Pausieren'}
  </button>
</div>
```

**Korrektur der CSS-Klasse** — In `app.css` sicherstellen:
```css
.mt-0\.5 { margin-top: 0.125rem; }
.border-outline-variant\/30 { border-color: rgba(72, 72, 72, 0.3); }
```

---

## Change 5 — Neue Route `/heute`

**Neue Datei erstellen:** `app/src/routes/heute/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listStudents } from '$lib/repo';
  import type { Student } from '$lib/types';

  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  let allStudents = $state<Student[]>([]);
  let loading = $state(true);

  const todayAbbr = DAYS[new Date().getDay()];

  onMount(async () => {
    allStudents = await listStudents();
    loading = false;
  });

  const todayStudents = $derived(
    allStudents.filter(s => s.lessonSlot?.trimStart().startsWith(todayAbbr))
  );

  const otherStudents = $derived(
    allStudents.filter(s => !s.lessonSlot?.trimStart().startsWith(todayAbbr))
  );
</script>

<section class="space-y-6">
  <div>
    <h2 class="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
      {DAYS[new Date().getDay()]}, {new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
    </h2>
    <p class="text-sm text-outline mt-1">Unterricht heute</p>
  </div>

  {#if loading}
    <p class="text-center text-outline py-12">Laden…</p>
  {:else if todayStudents.length === 0}
    <div class="bg-surface-container-highest p-8 rounded-2xl text-center">
      <span class="material-symbols-outlined text-outline text-4xl block mb-3">event_available</span>
      <p class="text-on-surface-variant">Keine Unterrichtsstunden für heute gefunden.</p>
      <p class="text-xs text-outline mt-2">Tipp: Termin im Format "Mo 17:00" eintragen.</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each todayStudents as student (student._id)}
        <a
          href="/s/{student._id}"
          class="block bg-surface-container-highest p-5 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform shadow-primary"
        >
          <div class="flex items-center gap-4">
            <div class="h-11 w-11 rounded-full bg-surface-container-low flex items-center justify-center border border-primary\/20">
              <span class="material-symbols-outlined text-primary">person</span>
            </div>
            <div>
              <h3 class="font-headline font-bold text-on-surface">{student.name}</h3>
              <p class="text-sm text-outline">{student.lessonSlot}</p>
            </div>
          </div>
          <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
        </a>
      {/each}
    </div>
  {/if}

  {#if otherStudents.length > 0 && !loading}
    <details class="mt-8">
      <summary class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold cursor-pointer select-none mb-4 list-none flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">expand_more</span>
        Alle anderen ({otherStudents.length})
      </summary>
      <div class="space-y-3 mt-4">
        {#each otherStudents as student (student._id)}
          <a
            href="/s/{student._id}"
            class="block bg-surface-container-low p-4 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-outline">person</span>
              <div>
                <h3 class="font-headline font-bold text-sm text-on-surface-variant">{student.name}</h3>
                <p class="text-xs text-outline">{student.lessonSlot || 'Kein Termin'}</p>
              </div>
            </div>
            <span class="material-symbols-outlined text-outline-variant text-sm">chevron_right</span>
          </a>
        {/each}
      </div>
    </details>
  {/if}
</section>
```

---

## Change 6 — Security: docker-compose.yml Fixes

**Datei:** `stack/docker-compose.yml`

### 6a. REGRESSION FIXEN — `initdb.d` Volume aus `couchdb` Service entfernen

Im `couchdb` Service diese Zeile entfernen (CouchDB ignoriert `initdb.d` — nur der `couchdb-setup` Service führt das Script aus):

```yaml
# DIESE ZEILE ENTFERNEN:
- ./couchdb/init:/docker-entrypoint-initdb.d:ro
```

### 6b. Resource-Limits hinzufügen (Finding 7 aus Security Report)

Für `couchdb`, `pupils-app`, `backup` je ein `deploy`-Block ergänzen:

```yaml
  couchdb:
    # ... (bestehende config, nach logging:)
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

  pupils-app:
    # ... (bestehende config, nach logging:)
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.5'

  backup:
    # ... (bestehende config, nach logging:)
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

---

## Change 7 — Security: restore.sh trap für Temp-File (Finding 10)

**Datei:** `scripts/restore.sh`

Nach Zeile 2 (`set -euo pipefail`) einfügen:

```bash
# Temp-File bei Exit/Fehler automatisch löschen (Finding 10)
TMPFILE="/tmp/pupils-restore-bulk-$$.json"
trap 'rm -f "${TMPFILE}"' EXIT INT TERM
```

Dann alle 3 Vorkommen von `/tmp/pupils-restore-bulk.json` durch `"${TMPFILE}"` ersetzen.

---

## Handoff

### Implemented
- **[app/src/routes/+layout.svelte](app/src/routes/+layout.svelte)** — Komplette Datei ersetzt:
  - App-Name geändert zu "Yasmins Vocal Lab" (Zeile 21)
  - Settings-Button mit `onclick` Handler für Bottom-Sheet (Zeile 22-25)
  - Neue State-Variablen `settingsOpen` und `config` (Zeile 12-13)
  - `isActive()` Funktion angepasst für `/s/` Routes (Zeile 29-32)
  - Neuer "Heute" Tab in BottomNav mit korrekter Aktiv-Logik (Zeile 43-47)
  - Bibliothek und Profil Tabs visuell deaktiviert (Zeile 48-55)
  - Settings Bottom-Sheet Overlay und Panel (Zeile 62-91)

- **[app/src/app.css](app/src/app.css)** — Neue Utility-Klassen am Ende hinzugefügt (Zeile 421-437):
  - `.shadow-primary`, `.shadow-primary-lg` — Pink glow für Buttons
  - `.text-primary-dim`, `.primary-dim`
  - `.mt-0.5`, `.border-primary/20`
  - `.-translate-x-1/2`, `.left-1/2` — für Bottom-Sheet Positionierung
  - `.z-[100]`, `.z-[101]` — Layering für Overlay/Sheet
  - `details summary::-webkit-details-marker` — für /heute Seite
  - `.font-body`, `.cursor-not-allowed`

- **[app/src/routes/+page.svelte](app/src/routes/+page.svelte)** — Button Shadows:
  - Sort-Buttons "Name" und "Vertragsbeginn" bekommen `shadow-primary` wenn aktiv (Zeile 45, 51)
  - FAB Button bekommt `shadow-primary-lg` zusätzlich zu `editorial-shadow` (Zeile 98)

- **[app/src/routes/s/[id]/+page.svelte](app/src/routes/s/[id]/+page.svelte)** — Archiv-Funktion:
  - Neue `toggleArchive()` Funktion (Zeile 133-140)
  - Archiv-Toggle UI im Edit-Formular nach Tarif-Input (Zeile 177-188)
  - HEUTE FAB bekommt `shadow-primary-lg` (Zeile 323)

- **[app/src/routes/heute/+page.svelte](app/src/routes/heute/+page.svelte)** — NEU erstellt:
  - Zeigt Schüler mit heutigem Wochentag im lessonSlot
  - Kollapsible "Alle anderen" Sektion mit nativem `<details>`

- **[stack/docker-compose.yml](stack/docker-compose.yml)** — Security Fixes:
  - `initdb.d` Volume aus couchdb Service entfernt (Regression Fix)
  - Resource-Limits für couchdb (512M / 1.0 CPU), pupils-app (128M / 0.5 CPU), backup (256M / 0.5 CPU)

- **[scripts/restore.sh](scripts/restore.sh)** — Security Finding 10:
  - `trap` hinzugefügt für automatische Temp-File Löschung bei Exit/Error (Zeile 14-16)
  - Temp-File Pfad enthält nun PID (`$$`) für Eindeutigkeit
  - Alle `/tmp/pupils-restore-bulk.json` Vorkommen durch `"${TMPFILE}"` ersetzt

### Tests
- (not applicable — testing is the Reviewer's responsibility)

### Deviations from plan
- None — implemented exactly as specified

### Open points for Reviewer
- Verify the /heute route correctly filters students by weekday abbreviation (Mo, Di, Mi, etc.)
- Check that archived students are properly filtered in the main list (should already work via existing listStudents logic)
- Test the settings bottom sheet opens/closes correctly on mobile

### Version
- Current: No version.md file found

---

## Zusammenfassung

| # | Datei | Art |
|---|-------|-----|
| 1+3 | `app/src/routes/+layout.svelte` | Name + Settings-Sheet + Heute-Nav |
| 2 | `app/src/routes/+page.svelte` | Button-Schatten |
| 4 | `app/src/routes/s/[id]/+page.svelte` | Pausieren/Aktivieren |
| 5 | `app/src/routes/heute/+page.svelte` | NEU erstellen |
| 2a | `app/src/app.css` | Neue Utility-Klassen |
| 6 | `stack/docker-compose.yml` | initdb.d fix + Resource-Limits |
| 7 | `scripts/restore.sh` | trap Temp-File |

## Hinweise für den Implementierer

- **Kein Tailwind-Plugin** — alle CSS-Klassen müssen in `app/src/app.css` vorhanden sein. Jede neue Klasse die im Template auftaucht MUSS dort definiert sein.
- **Svelte 5**: `$state()`, `$derived()`, `$props()` in `.svelte` Dateien. `writable()` in `.ts` Dateien.
- `confirm()` in `toggleArchive` ist absichtlich einfach gehalten — läuft auf Android Chrome problemlos.
- `details`/`summary` für "Alle anderen" braucht kein JavaScript — nativer Browser-Collapse.
- `text-4xl` und `text-sm` beim `material-symbols-outlined` in Change 5 — die Icon-Größe wird durch `font-size` gesteuert.
