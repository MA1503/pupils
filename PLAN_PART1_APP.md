# Pupils — Teil 1: SvelteKit-App (Implementierungs-Prompt für Kimi)

**Ziel dieses Dokuments**: Vollständige Implementierung der SvelteKit-PWA in `app/`.  
**Abgrenzung**: Dieser Part endet mit `npm run build` ohne Fehler. Der Docker-Stack kommt in Teil 2.

---

## Kontext (Kurzfassung)

Eine Musiklehrerin braucht ein digitales Notizbuch für Schülerfortschritte.  
- Primäres Gerät: Android Chrome (installierbar als PWA)  
- Offline-Pflicht: Unterricht teils ohne Internetverbindung  
- Sync mit CouchDB auf Raspberry Pi (wenn Heimnetz oder Tailscale erreichbar)  
- Alle Daten lokal in IndexedDB via PouchDB — Sync ist Bonus, kein Requirement

---

## 1. Verzeichnisstruktur — nur `app/`

```
pupils/
├── app/
│   ├── src/
│   │   ├── app.html
│   │   ├── app.d.ts
│   │   ├── routes/
│   │   │   ├── +layout.svelte        # App-Shell, Nav, First-Run-Guard
│   │   │   ├── +layout.ts            # ssr=false, prerender=true
│   │   │   ├── +page.svelte          # Schülerliste (Suche + Sort)
│   │   │   ├── setup/
│   │   │   │   └── +page.svelte      # First-Run: CouchDB-URL + Creds
│   │   │   └── s/
│   │   │       └── [id]/
│   │   │           └── +page.svelte  # Schülerakte + Song-Tabs + Einträge
│   │   └── lib/
│   │       ├── types.ts              # Document-Typen
│   │       ├── ids.ts                # ULID-Helfer + inverted Timestamp
│   │       ├── db.ts                 # PouchDB-Instanz + Sync-Management
│   │       ├── repo.ts               # CRUD-Helpers
│   │       ├── stores.ts             # Svelte writable stores (KEIN $state in .ts!)
│   │       └── components/
│   │           ├── SearchBar.svelte
│   │           ├── StudentRow.svelte
│   │           ├── SongTabs.svelte
│   │           ├── EntryList.svelte
│   │           ├── EntryEditor.svelte
│   │           └── SyncIndicator.svelte
│   ├── static/
│   │   ├── favicon.svg               # einfaches SVG-Noten-Symbol
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable.png
│   ├── svelte.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.dev.yml            # Nur CouchDB, für lokale Entwicklung
└── .gitignore
```

---

## 2. `package.json`

```json
{
  "name": "pupils-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  },
  "dependencies": {
    "pouchdb-browser": "^9.0.0",
    "pouchdb-find": "^9.0.0",
    "ulid": "^2.3.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@vite-pwa/sveltekit": "^0.3.0",
    "@types/pouchdb-browser": "^6.1.3",
    "@types/pouchdb-find": "^6.3.3",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "workbox-window": "^7.0.0"
  }
}
```

**Wichtig**: `@types/pouchdb-browser` und `@types/pouchdb-find` sind **Dev-Dependencies**, ohne sie scheitert TypeScript-Checking.

---

## 3. Konfigurationsdateien

### `svelte.config.js`
```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' })
  }
};

export default config;
```

### `vite.config.ts`

> **Kritisch**: `pouchdb-browser` verwendet `process.browser` (Browserify-Konvention).
> Vite stellt `process` standardmäßig nicht bereit → `ReferenceError` im Browser → weißes Fenster.
> Die `define`-Einträge unten sind zwingend.

```ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  define: {
    // PouchDB checks process.browser — Vite provides no process shim by default.
    // Without this: ReferenceError at runtime → blank white page.
    global: 'globalThis',
    'process.browser': 'true',
    'process.env': '{}',
  },
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Schüler-Notizen',
        short_name: 'Pupils',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
```

### `tsconfig.json`
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true
  }
}
```

### `src/app.html`
```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1a1a1a" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

### `src/app.d.ts`
```ts
declare global {
  namespace App {}
}
export {};
```

---

## 4. Datenmodell (`src/lib/types.ts`)

```typescript
// src/lib/types.ts

export type Student = {
  _id: string;          // "student:<ulid>"
  _rev?: string;
  type: 'student';
  name: string;         // "Anna Müller"
  lessonSlot: string;   // Freitext: "Mo 17:00, zweiwöchentlich"
  contractStart: string; // ISO-Date: "2024-09-01"
  tariff: string;       // "30min/Woche · 90€/Monat"
  archived?: boolean;   // soft-delete
  createdAt: string;    // ISO-DateTime
  updatedAt: string;
};

export type Song = {
  _id: string;          // "song:<studentUlid>:<songUlid>"
  _rev?: string;
  type: 'song';
  studentId: string;    // "student:<ulid>"
  title: string;        // "Für Elise"
  archived?: boolean;
  createdAt: string;
};

export type Entry = {
  _id: string;          // "entry:<songUlid>:<invTimestamp>:<entryUlid>"
  _rev?: string;
  type: 'entry';
  songId: string;       // "song:<studentUlid>:<songUlid>"
  studentId: string;    // "student:<ulid>"
  entryDate: string;    // ISO-Date, default = heute
  text: string;         // Freitext-Notiz
  createdAt: string;
  updatedAt: string;
};

export type SyncStatus = 'idle' | 'active' | 'paused' | 'error' | 'denied';

export type PupilsConfig = {
  url: string;   // z.B. "https://pi.tailnet.ts.net/couchdb/pupils"
  user: string;  // "teacher"
  pass: string;
};
```

---

## 5. ID-Generierung (`src/lib/ids.ts`)

```typescript
// src/lib/ids.ts
import { ulid } from 'ulid';

/** Extrahiert den ULID-Teil aus einer prefixed ID */
export function ulidOf(prefixedId: string): string {
  const parts = prefixedId.split(':');
  return parts[parts.length - 1];
}

/** "student:01HX..." */
export function studentId(): string {
  return `student:${ulid()}`;
}

/** "song:<studentUlid>:<songUlid>" */
export function songId(studentId: string): string {
  return `song:${ulidOf(studentId)}:${ulid()}`;
}

/**
 * "entry:<songUlid>:<invTimestamp>:<entryUlid>"
 * invTimestamp = (9999999999999 - Date.now()).toString().padStart(13,'0')
 * → ASC-Sort in allDocs liefert neueste Einträge ZUERST
 */
export function entryId(songId: string): string {
  const inv = (9999999999999 - Date.now()).toString().padStart(13, '0');
  return `entry:${ulidOf(songId)}:${inv}:${ulid()}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
```

---

## 6. PouchDB + Sync (`src/lib/db.ts`)

```typescript
// src/lib/db.ts
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';
PouchDB.plugin(PouchFind);

let local: PouchDB.Database | null = null;
let syncHandler: PouchDB.Replication.Sync<object> | null = null;

export function getLocal(): PouchDB.Database {
  if (!local) local = new PouchDB('pupils');
  return local;
}

// --------------- Sync-Status-Emitter ---------------
import type { SyncStatus } from './types';

type StatusListener = (s: SyncStatus, detail?: unknown) => void;
const listeners = new Set<StatusListener>();

export function onSyncStatus(cb: StatusListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(s: SyncStatus, d?: unknown) {
  listeners.forEach(l => l(s, d));
}

// --------------- Config in localStorage ---------------
const CONFIG_KEY = 'pupilsConfig';

export function loadConfig(): { url: string; user: string; pass: string } | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConfig(url: string, user: string, pass: string) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, user, pass }));
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

// --------------- Sync starten/stoppen ---------------
export function startSync(remoteUrl: string, user: string, pass: string) {
  stopSync();
  const remote = new PouchDB(remoteUrl, {
    fetch: (url, opts) => {
      const options = opts ?? {};
      const headers = new Headers(options.headers as HeadersInit | undefined);
      headers.set('Authorization', 'Basic ' + btoa(`${user}:${pass}`));
      return fetch(url as RequestInfo, { ...options, headers });
    }
  });

  syncHandler = getLocal()
    .sync(remote, { live: true, retry: true })
    .on('active',  ()  => emit('active'))
    .on('paused',  (e) => emit(e ? 'error' : 'paused', e))
    .on('denied',  (e) => emit('denied', e))
    .on('error',   (e) => emit('error', e));
}

export function stopSync() {
  syncHandler?.cancel();
  syncHandler = null;
}

/** Verbindungstest beim Setup — wirft bei Fehler */
export async function testConnection(url: string, user: string, pass: string): Promise<void> {
  // URL endet auf /pupils — wir testen /_session am CouchDB-Root
  const base = url.replace(/\/[^/]+$/, '');
  const resp = await fetch(`${base}/_session`, {
    headers: { Authorization: 'Basic ' + btoa(`${user}:${pass}`) }
  });
  if (resp.status === 401) throw new Error('401: Falscher Benutzername oder Passwort');
  if (!resp.ok) throw new Error(`${resp.status}: Server nicht erreichbar`);
  const data = await resp.json();
  if (!data?.ok && !data?.userCtx?.name) {
    throw new Error('Authentifizierung fehlgeschlagen');
  }
}
```

---

## 7. CRUD-Helpers (`src/lib/repo.ts`)

```typescript
// src/lib/repo.ts
import { getLocal } from './db';
import { studentId, songId, entryId, now, today, ulidOf } from './ids';
import type { Student, Song, Entry } from './types';

// ---- Students ----

export async function listStudents(): Promise<Student[]> {
  const result = await getLocal().allDocs<Student>({
    startkey: 'student:',
    endkey: 'student:\ufff0',
    include_docs: true
  });
  return result.rows
    .map(r => r.doc!)
    .filter(d => !d.archived);
}

export async function getStudent(id: string): Promise<Student> {
  return getLocal().get<Student>(id);
}

export async function createStudent(data: Omit<Student, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const doc: Student = {
    _id: studentId(),
    type: 'student',
    createdAt: now(),
    updatedAt: now(),
    ...data
  };
  await getLocal().put(doc);
  return doc;
}

export async function updateStudent(student: Student, changes: Partial<Student>): Promise<Student> {
  const updated = { ...student, ...changes, updatedAt: now() };
  const result = await getLocal().put(updated);
  return { ...updated, _rev: result.rev };
}

export async function archiveStudent(student: Student): Promise<void> {
  await getLocal().put({ ...student, archived: true, updatedAt: now() });
}

// ---- Songs ----

export async function listSongs(sid: string): Promise<Song[]> {
  const ulidPart = ulidOf(sid);
  const result = await getLocal().allDocs<Song>({
    startkey: `song:${ulidPart}:`,
    endkey: `song:${ulidPart}:\ufff0`,
    include_docs: true
  });
  return result.rows
    .map(r => r.doc!)
    .filter(d => !d.archived);
}

export async function createSong(sid: string, title: string): Promise<Song> {
  const doc: Song = {
    _id: songId(sid),
    type: 'song',
    studentId: sid,
    title,
    createdAt: now()
  };
  await getLocal().put(doc);
  return doc;
}

export async function updateSong(song: Song, changes: Partial<Song>): Promise<Song> {
  const updated = { ...song, ...changes };
  const result = await getLocal().put(updated);
  return { ...updated, _rev: result.rev };
}

export async function archiveSong(song: Song): Promise<void> {
  await getLocal().put({ ...song, archived: true });
}

// ---- Entries ----

export async function listEntries(sId: string): Promise<Entry[]> {
  // sId ist die Song._id, z.B. "song:01HX...:01HY..."
  // Entry-Prefix nutzt nur den ULID-Teil des Song-IDs (letzter Part)
  const ulidPart = ulidOf(sId);
  const result = await getLocal().allDocs<Entry>({
    startkey: `entry:${ulidPart}:`,
    endkey: `entry:${ulidPart}:\ufff0`,
    include_docs: true
  });
  // Bereits neueste zuerst durch inverted Timestamp in der ID
  return result.rows.map(r => r.doc!);
}

export async function createEntry(sId: string, studentId: string): Promise<Entry> {
  const doc: Entry = {
    _id: entryId(sId),
    type: 'entry',
    songId: sId,
    studentId,
    entryDate: today(),
    text: '',
    createdAt: now(),
    updatedAt: now()
  };
  await getLocal().put(doc);
  return doc;
}

export async function updateEntry(entry: Entry, text: string, entryDate?: string): Promise<Entry> {
  const updated: Entry = {
    ...entry,
    text,
    entryDate: entryDate ?? entry.entryDate,
    updatedAt: now()
  };
  const result = await getLocal().put(updated);
  return { ...updated, _rev: result.rev };
}

export async function deleteEntry(entry: Entry): Promise<void> {
  await getLocal().remove(entry._id, entry._rev!);
}

// ---- Suche ----

export function searchStudents(students: Student[], query: string): Student[] {
  const q = query.toLowerCase().trim();
  if (!q) return students;
  return students.filter(s => s.name.toLowerCase().includes(q));
}
```

---

## 8. Svelte Stores (`src/lib/stores.ts`)

> **WICHTIG für Svelte 5**: Verwende **`writable()` aus `svelte/store`** — NICHT `$state` in einer `.ts`-Datei.  
> `$state` funktioniert nur in `.svelte`-Dateien oder `.svelte.ts`-Dateien mit Rune-Verarbeitung.  
> Svelte 5 unterstützt `writable()` vollständig (backwards-compatible).

```typescript
// src/lib/stores.ts
import { writable, derived } from 'svelte/store';
import type { Student, SyncStatus } from './types';

export const students = writable<Student[]>([]);
export const syncStatus = writable<SyncStatus>('idle');
export const sortKey = writable<'name' | 'contractStart'>('name');

export const sortedStudents = derived(
  [students, sortKey],
  ([$students, $sortKey]) => {
    return [...$students].sort((a, b) => {
      if ($sortKey === 'name') return a.name.localeCompare(b.name, 'de');
      return a.contractStart.localeCompare(b.contractStart);
    });
  }
);
```

---

## 9. Routen

### `src/routes/+layout.ts`
```typescript
export const ssr = false;
export const prerender = true;
```

### `src/routes/+layout.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { loadConfig, startSync, onSyncStatus } from '$lib/db';
  import { syncStatus } from '$lib/stores';
  import SyncIndicator from '$lib/components/SyncIndicator.svelte';

  let { children } = $props();

  onMount(() => {
    // First-Run-Guard: kein Config → /setup
    const config = loadConfig();
    if (!config && $page.url.pathname !== '/setup') {
      goto('/setup');
      return;
    }
    if (config) {
      startSync(config.url, config.user, config.pass);
    }

    // Sync-Status in Store spiegeln
    const unsubscribe = onSyncStatus((s) => syncStatus.set(s));
    return unsubscribe;
  });
</script>

<header>
  <a href="/" class="app-title">Schüler-Notizen</a>
  <SyncIndicator />
</header>

<main>
  {@render children()}
</main>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #1a1a1a;
    color: white;
  }
  .app-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    text-decoration: none;
  }
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 1rem;
  }
</style>
```

### `src/routes/+page.svelte` — Schülerliste
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { listStudents, searchStudents } from '$lib/repo';
  import { students, sortedStudents, sortKey } from '$lib/stores';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import StudentRow from '$lib/components/StudentRow.svelte';

  let query = $state('');
  let loading = $state(true);

  onMount(async () => {
    students.set(await listStudents());
    loading = false;
  });

  const filtered = $derived(searchStudents($sortedStudents, query));

  async function addStudent() {
    goto('/s/new');
  }
</script>

<div class="toolbar">
  <SearchBar bind:value={query} />
  <button onclick={addStudent}>+ Schüler</button>
</div>

<div class="sort-bar">
  Sortierung:
  <button
    class:active={$sortKey === 'name'}
    onclick={() => { sortKey.set('name'); localStorage.setItem('sortKey','name'); }}
  >Name</button>
  <button
    class:active={$sortKey === 'contractStart'}
    onclick={() => { sortKey.set('contractStart'); localStorage.setItem('sortKey','contractStart'); }}
  >Vertragsbeginn</button>
</div>

{#if loading}
  <p>Laden…</p>
{:else if filtered.length === 0}
  <p class="empty">
    {query ? 'Keine Schüler gefunden.' : 'Noch keine Schüler. Tipp auf +, um anzufangen.'}
  </p>
{:else}
  <ul class="student-list">
    {#each filtered as student (student._id)}
      <StudentRow {student} />
    {/each}
  </ul>
{/if}

<style>
  .toolbar { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
  .sort-bar { font-size: 0.85rem; margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center; }
  .sort-bar button { padding: 0.2rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; }
  .sort-bar button.active { background: #1a1a1a; color: white; border-color: #1a1a1a; }
  .student-list { list-style: none; padding: 0; margin: 0; }
  .empty { color: #666; text-align: center; margin-top: 2rem; }
</style>
```

### `src/routes/setup/+page.svelte` — First-Run
```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { testConnection, saveConfig, startSync } from '$lib/db';

  let url = $state('');
  let user = $state('teacher');
  let pass = $state('');
  let error = $state('');
  let loading = $state(false);

  async function connect() {
    error = '';
    loading = true;
    try {
      await testConnection(url.trim(), user.trim(), pass);
      saveConfig(url.trim(), user.trim(), pass);
      startSync(url.trim(), user.trim(), pass);
      goto('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        error = '401: Falscher Benutzername oder Passwort. Passwort in Portainer prüfen.';
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        error = 'Server nicht erreichbar. URL prüfen, Tailscale aktiv?';
      } else if (msg.includes('CORS')) {
        error = 'CORS-Fehler. CouchDB CORS-Einstellung prüfen (00-setup.sh ausgeführt?).';
      } else {
        error = msg;
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="setup">
  <h1>Ersteinrichtung</h1>
  <p>Verbinde die App mit deiner CouchDB-Datenbank auf dem Raspberry Pi.</p>

  <label>
    Server-URL
    <input type="url" bind:value={url} placeholder="https://pi.tailnet.ts.net/couchdb/pupils" />
  </label>

  <label>
    Benutzer
    <input type="text" bind:value={user} placeholder="teacher" autocomplete="username" />
  </label>

  <label>
    Passwort
    <input type="password" bind:value={pass} autocomplete="current-password" />
  </label>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <button onclick={connect} disabled={loading || !url || !user || !pass}>
    {loading ? 'Verbinde…' : 'Verbinden'}
  </button>

  <p class="hint">
    Ohne Verbindung kannst du die App trotzdem lokal nutzen —
    Daten werden synchronisiert, sobald der Pi erreichbar ist.
  </p>
  <button class="skip" onclick={() => goto('/')}>Vorerst überspringen</button>
</div>

<style>
  .setup { max-width: 400px; margin: 2rem auto; }
  h1 { margin-bottom: 0.5rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; font-weight: 500; }
  input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
  button { width: 100%; padding: 0.75rem; background: #1a1a1a; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: #c00; background: #fee; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; }
  .hint { font-size: 0.85rem; color: #666; margin-top: 1rem; text-align: center; }
  .skip { margin-top: 0.5rem; background: transparent; color: #666; border: 1px solid #ccc; }
</style>
```

### `src/routes/s/[id]/+page.svelte` — Schülerakte

```svelte
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import {
    getStudent, updateStudent,
    listSongs, createSong, updateSong,
    listEntries, createEntry, updateEntry, deleteEntry
  } from '$lib/repo';
  import SongTabs from '$lib/components/SongTabs.svelte';
  import EntryList from '$lib/components/EntryList.svelte';
  import type { Student, Song, Entry } from '$lib/types';

  const id = $page.params.id;

  let student = $state<Student | null>(null);
  let songs = $state<Song[]>([]);
  let entries = $state<Entry[]>([]);
  let activeSongIndex = $state(0);
  let editingStudent = $state(false);
  let loading = $state(true);

  // Student-Edit-Felder
  let editName = $state('');
  let editLessonSlot = $state('');
  let editContractStart = $state('');
  let editTariff = $state('');

  onMount(async () => {
    if (id === 'new') {
      // Neue Schülerin anlegen
      const { createStudent } = await import('$lib/repo');
      const s = await createStudent({ name: 'Neue Schülerin', lessonSlot: '', contractStart: '', tariff: '' });
      goto(`/s/${s._id}`, { replaceState: true });
      return;
    }
    student = await getStudent(id);
    songs = await listSongs(id);
    if (songs.length > 0) {
      entries = await listEntries(songs[activeSongIndex]._id);
    }
    loading = false;
  });

  async function switchSong(idx: number) {
    activeSongIndex = idx;
    entries = await listEntries(songs[idx]._id);
  }

  async function addSong() {
    const title = prompt('Song-Titel:');
    if (!title) return;
    const song = await createSong(id, title);
    songs = [...songs, song];
    activeSongIndex = songs.length - 1;
    entries = [];
  }

  async function addEntry() {
    if (songs.length === 0) return;
    const entry = await createEntry(songs[activeSongIndex]._id, id);
    entries = [entry, ...entries];
    await tick();
    // Focus auf ersten Entry-Editor (EntryList kümmert sich drum)
    document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  }

  async function saveEntry(entry: Entry, text: string) {
    const updated = await updateEntry(entry, text);
    entries = entries.map(e => e._id === updated._id ? updated : e);
  }

  async function removeEntry(entry: Entry) {
    await deleteEntry(entry);
    entries = entries.filter(e => e._id !== entry._id);
  }

  function startEditStudent() {
    if (!student) return;
    editName = student.name;
    editLessonSlot = student.lessonSlot;
    editContractStart = student.contractStart;
    editTariff = student.tariff;
    editingStudent = true;
  }

  async function saveStudent() {
    if (!student) return;
    student = await updateStudent(student, {
      name: editName,
      lessonSlot: editLessonSlot,
      contractStart: editContractStart,
      tariff: editTariff
    });
    editingStudent = false;
  }
</script>

{#if loading}
  <p>Laden…</p>
{:else if student}
  <div class="student-header">
    {#if editingStudent}
      <div class="edit-form">
        <input bind:value={editName} placeholder="Name" />
        <input bind:value={editLessonSlot} placeholder="Unterrichtstermin (z.B. Mo 17:00)" />
        <input bind:value={editContractStart} type="date" />
        <input bind:value={editTariff} placeholder="Tarif (z.B. 30min · 90€/Monat)" />
        <div class="edit-actions">
          <button onclick={saveStudent}>Speichern</button>
          <button onclick={() => editingStudent = false}>Abbrechen</button>
        </div>
      </div>
    {:else}
      <div class="header-info">
        <h1>{student.name}</h1>
        <p class="meta">{student.lessonSlot}</p>
        <p class="meta">{student.tariff} · seit {student.contractStart}</p>
      </div>
      <button class="edit-btn" onclick={startEditStudent} aria-label="Schüler bearbeiten">✎</button>
    {/if}
  </div>

  <SongTabs {songs} active={activeSongIndex} onSelect={switchSong} onAdd={addSong} />

  {#if songs.length === 0}
    <p class="empty">Noch keine Songs. Tipp auf + in der Tab-Leiste.</p>
  {:else}
    <EntryList
      {entries}
      onSave={saveEntry}
      onDelete={removeEntry}
    />
  {/if}

  <!-- FAB: Heutigen Eintrag anlegen -->
  {#if songs.length > 0}
    <button class="fab" onclick={addEntry} aria-label="Eintrag heute hinzufügen">+ Heute</button>
  {/if}
{/if}

<style>
  .student-header {
    position: sticky;
    top: 56px; /* Höhe des App-Headers */
    background: white;
    border-bottom: 1px solid #eee;
    padding: 0.75rem 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    z-index: 5;
  }
  h1 { margin: 0 0 0.25rem; font-size: 1.4rem; }
  .meta { margin: 0; font-size: 0.85rem; color: #555; }
  .edit-btn {
    background: none; border: none; font-size: 1.2rem;
    cursor: pointer; padding: 0.5rem; color: #666;
  }
  .edit-form { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .edit-form input { padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; }
  .edit-actions { display: flex; gap: 0.5rem; }
  .edit-actions button { padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; }
  .empty { color: #666; text-align: center; margin-top: 2rem; }
  .fab {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: #1a1a1a;
    color: white;
    border: none;
    border-radius: 2rem;
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    z-index: 20;
  }
</style>
```

---

## 10. Komponenten

### `src/lib/components/SyncIndicator.svelte`
```svelte
<script lang="ts">
  import { syncStatus } from '$lib/stores';
  const labels: Record<string, string> = {
    idle: '○', active: '●', paused: '◑', error: '✕', denied: '✕'
  };
  const colors: Record<string, string> = {
    idle: '#999', active: '#22c55e', paused: '#f59e0b', error: '#ef4444', denied: '#ef4444'
  };
</script>

<span
  class="sync"
  style="color: {colors[$syncStatus] ?? '#999'}"
  title="Sync: {$syncStatus}"
>
  {labels[$syncStatus] ?? '○'}
</span>

<style>
  .sync { font-size: 1rem; cursor: default; user-select: none; }
</style>
```

### `src/lib/components/SearchBar.svelte`
```svelte
<script lang="ts">
  let { value = $bindable('') } = $props();
  let timeout: ReturnType<typeof setTimeout>;

  function onInput(e: Event) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      value = (e.target as HTMLInputElement).value;
    }, 200);
  }
</script>

<input
  type="search"
  placeholder="Schüler suchen…"
  value={value}
  oninput={onInput}
  class="search"
/>

<style>
  .search {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
  }
</style>
```

### `src/lib/components/StudentRow.svelte`
```svelte
<script lang="ts">
  import type { Student } from '$lib/types';
  let { student }: { student: Student } = $props();
</script>

<li>
  <a href="/s/{student._id}">
    <span class="name">{student.name}</span>
    <span class="slot">{student.lessonSlot}</span>
  </a>
</li>

<style>
  li { border-bottom: 1px solid #eee; }
  a {
    display: flex;
    flex-direction: column;
    padding: 0.75rem 0;
    text-decoration: none;
    color: inherit;
  }
  a:hover { background: #f9f9f9; }
  .name { font-size: 1.05rem; font-weight: 500; }
  .slot { font-size: 0.85rem; color: #666; }
</style>
```

### `src/lib/components/SongTabs.svelte`
```svelte
<script lang="ts">
  import type { Song } from '$lib/types';
  let {
    songs,
    active,
    onSelect,
    onAdd
  }: {
    songs: Song[];
    active: number;
    onSelect: (i: number) => void;
    onAdd: () => void;
  } = $props();
</script>

<div class="tabs" role="tablist">
  {#each songs as song, i (song._id)}
    <button
      role="tab"
      aria-selected={i === active}
      class:active={i === active}
      onclick={() => onSelect(i)}
    >{song.title}</button>
  {/each}
  <button class="add-tab" onclick={onAdd} aria-label="Song hinzufügen">+</button>
</div>

<style>
  .tabs {
    display: flex;
    overflow-x: auto;
    border-bottom: 2px solid #eee;
    margin-bottom: 1rem;
    gap: 0.25rem;
    padding-bottom: 0;
  }
  button {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  button.active { border-bottom-color: #1a1a1a; font-weight: 600; }
  .add-tab { color: #666; font-size: 1.1rem; }
</style>
```

### `src/lib/components/EntryList.svelte`
```svelte
<script lang="ts">
  import type { Entry } from '$lib/types';
  import EntryEditor from './EntryEditor.svelte';

  let {
    entries,
    onSave,
    onDelete
  }: {
    entries: Entry[];
    onSave: (entry: Entry, text: string) => void;
    onDelete: (entry: Entry) => void;
  } = $props();
</script>

{#if entries.length === 0}
  <p class="empty">Noch keine Einträge. Tipp auf „+ Heute".</p>
{:else}
  <ul class="entry-list">
    {#each entries as entry (entry._id)}
      <EntryEditor {entry} {onSave} {onDelete} />
    {/each}
  </ul>
{/if}

<style>
  .entry-list { list-style: none; padding: 0; margin: 0 0 5rem; }
  .empty { color: #666; text-align: center; margin-top: 2rem; }
</style>
```

### `src/lib/components/EntryEditor.svelte`
```svelte
<script lang="ts">
  import type { Entry } from '$lib/types';

  let {
    entry,
    onSave,
    onDelete
  }: {
    entry: Entry;
    onSave: (entry: Entry, text: string) => void;
    onDelete: (entry: Entry) => void;
  } = $props();

  let editing = $state(entry.text === '');
  let draft = $state(entry.text);

  function save() {
    if (draft !== entry.text || entry.text === '') {
      onSave(entry, draft);
    }
    editing = false;
  }

  function handleBlur() {
    save();
  }
</script>

<li class="entry">
  <div class="entry-date">
    {new Date(entry.entryDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>

  {#if editing}
    <textarea
      bind:value={draft}
      onblur={handleBlur}
      rows="4"
      placeholder="Notiz schreiben…"
      autofocus
    ></textarea>
    <div class="actions">
      <button onclick={save}>Fertig</button>
      <button class="delete" onclick={() => onDelete(entry)}>Löschen</button>
    </div>
  {:else}
    <div
      class="entry-text"
      role="button"
      tabindex="0"
      onclick={() => { editing = true; draft = entry.text; }}
      onkeydown={(e) => e.key === 'Enter' && (editing = true)}
    >
      {entry.text || '(leer — tippen zum Bearbeiten)'}
    </div>
  {/if}
</li>

<style>
  .entry { border-bottom: 1px solid #eee; padding: 0.75rem 0; }
  .entry-date { font-size: 0.8rem; font-weight: 600; color: #555; margin-bottom: 0.4rem; }
  .entry-text {
    white-space: pre-wrap;
    cursor: pointer;
    min-height: 1.5rem;
    color: #333;
    line-height: 1.5;
  }
  .entry-text:hover { color: #000; }
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #1a1a1a;
    border-radius: 4px;
    font-size: 1rem;
    line-height: 1.5;
    resize: vertical;
    font-family: inherit;
  }
  .actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .actions button { padding: 0.4rem 0.75rem; border-radius: 4px; cursor: pointer; border: 1px solid #ccc; background: white; }
  .actions button:first-child { background: #1a1a1a; color: white; border-color: #1a1a1a; }
  .delete { color: #c00; }
</style>
```

---

## 11. `docker-compose.dev.yml` — Lokale Entwicklung

```yaml
# Nur CouchDB für lokale App-Entwicklung (kein pupils-app Container)
services:
  couchdb:
    image: couchdb:3.3.3
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: devpassword
      TEACHER_PASSWORD: teacherdev
    volumes:
      - ./stack/couchdb/init:/docker-entrypoint-initdb.d:ro
      - couchdb-dev-data:/opt/couchdb/data
    ports:
      - "5984:5984"   # Direkt exposed (kein Tailscale nötig für Dev)

volumes:
  couchdb-dev-data:
```

**Start**: `docker compose -f docker-compose.dev.yml up -d`  
**Fauxton UI**: http://localhost:5984/_utils (admin / devpassword)  
**App-Dev-URL für Setup**: `http://localhost:5984/pupils` (User: `teacher`, Pass: `teacherdev`)

---

## 12. `.gitignore`

```gitignore
node_modules/
.svelte-kit/
build/
dist/
.env
*.sqlite
*.sqlite-wal
*.sqlite-shm
stack/.env
```

---

## 13. Statische Icons (`static/`)

Für `icon-192.png`, `icon-512.png`, `icon-maskable.png`:  
Erzeuge ein einfaches Noten-Symbol (♩ oder ♪) auf dunklem Hintergrund (#1a1a1a).  
**Mindestanforderung**: PWA-Manifest-Validierung schlägt fehl wenn Icons fehlen. Platzhalter-PNGs in den richtigen Größen genügen für Phase 1.  
`favicon.svg`: Ein simples `<svg>` mit Noten-Symbol reicht.

---

## 14. Verifikations-Checkliste (Pass 1)

- [ ] `npm install` ohne Fehler
- [ ] `npm run check` (svelte-check) ohne Fehler
- [ ] `npm run build` produziert `build/` mit `index.html` + gehashten Assets
- [ ] `npm run dev` → Browser öffnet, `/setup` erscheint (kein Config)
- [ ] Setup: URL `http://localhost:5984/pupils`, user `teacher`, pass `teacherdev` → Redirect zu `/`
- [ ] Schülerin anlegen, Song erstellen, Eintrag schreiben
- [ ] DevTools → Application → Service Workers: registriert
- [ ] DevTools → Network → Offline setzen → Eintrag schreiben → online → in Fauxton `localhost:5984/_utils` erscheint der Eintrag

---

## 15. Hinweise für den Implementierer

1. **Svelte 5 `$props()` statt `export let`**: Alle Komponenten verwenden die neue Syntax `let { x } = $props()`.
2. **`$state` nur in `.svelte`-Dateien**: In `.ts`-Dateien immer `writable()` verwenden. Reaktiver State in Routen-Komponenten kann `$state` nutzen (im `<script>`-Block von `.svelte`-Dateien ist das korrekt).
3. **PouchDB + TypeScript**: Falls der TypeScript-Compiler Probleme mit PouchDB-Typen hat, `skipLibCheck: true` in tsconfig hilft als Notfallventil (ist bereits gesetzt).
4. **`@vite-pwa/sveltekit` Version**: Falls Build-Fehler auftreten, Version auf `0.3.x` pinnen. Die Plugin-API ändert sich gelegentlich.
5. **`adapter-static` Fallback**: Das `fallback: 'index.html'` ist zwingend für SPA-Routing (alle Routen liefern `index.html`, clientseitiges Routing übernimmt).
6. **Neue Schülerin `/s/new`**: Die Route prüft `id === 'new'` und erstellt sofort eine Student-Doc, dann redirect auf die echte ID. Alternativ kann eine separate `routes/s/new/+page.svelte` mit Formular implementiert werden — beides ist akzeptabel.
