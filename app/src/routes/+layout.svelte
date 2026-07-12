<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { loadConfig, startSync, onSyncStatus, getLocal, testConnection } from '$lib/db';
  import { syncStatus } from '$lib/stores';
  import { loadSettings, fetchAndStoreHolidays } from '$lib/holidays';
  import { listStudents, updateStudent, listSongs, listEntries, archiveSong } from '$lib/repo';
  import { parseSlotToSchedule, todayISO } from '$lib/date';
  import '../app.css';

  let { children } = $props();
  let currentPath = $derived($page.url.pathname);
  let studioName = $state('');

  // Sync-Problem-Banner: 'auth' = Passwort falsch, 'offline' = Server nicht erreichbar.
  // Aktiver Check statt Sync-Events: PouchDB meldet mit retry:true bei toter
  // Verbindung nur 'paused' ohne Fehler — der Ausfall wäre sonst unsichtbar.
  let syncProblem = $state<'auth' | 'offline' | null>(null);
  let checking = false;

  async function checkSyncHealth() {
    if (checking) return;
    checking = true;
    try {
      const cfg = loadConfig();
      if (!cfg) return;
      await testConnection(cfg.url, cfg.user, cfg.pass);
      syncProblem = null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      syncProblem = msg.startsWith('401') ? 'auth' : 'offline';
    } finally {
      checking = false;
    }
  }

  const dotColor = $derived(
    $syncStatus === 'active' ? 'bg-green-500' :
    $syncStatus === 'paused' ? 'bg-yellow-400' :
    $syncStatus === 'error' || $syncStatus === 'denied' ? 'bg-red-500' :
    'bg-zinc-600'
  );

  onMount(() => {
    const cfg = loadConfig();
    if (!cfg && $page.url.pathname !== '/setup') {
      goto('/setup');
      return;
    }
    if (cfg) {
      startSync(cfg.url, cfg.user, cfg.pass);
    }
    const unsubscribe = onSyncStatus((s) => {
      syncStatus.set(s);
      if (s === 'error' || s === 'denied') {
        checkSyncHealth();
      } else if (s === 'active') {
        syncProblem = null;
      }
    });

    // Gesundheits-Check: beim Start und dann minütlich
    let healthTimer: ReturnType<typeof setInterval> | null = null;
    if (cfg) {
      checkSyncHealth();
      healthTimer = setInterval(checkSyncHealth, 60_000);
    }

    // Persistenten Speicher anfordern — sonst darf der Browser IndexedDB
    // und localStorage bei Speicherdruck wegräumen (Datenverlust-Vorfall 07/2026).
    navigator.storage?.persist?.()
      .then((granted) => console.log('[storage] persistent:', granted))
      .catch(() => {});

    // Fetch studio name
    fetch('/studio.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.studioName) studioName = data.studioName;
      })
      .catch(() => {});
    
    // Run migrations and holiday fetch after sync starts
    runMigrationsAndHolidays();

    return () => {
      unsubscribe();
      if (healthTimer) clearInterval(healthTimer);
    };
  });

  async function runMigrationsAndHolidays() {
    try {
      await migrateLessonSlots();
    } catch (e) {
      console.error('Migration lessonSlots failed:', e);
    }
    
    try {
      await migrateBilling();
    } catch (e) {
      console.error('Migration billing failed:', e);
    }
    
    try {
      await migrateAllgSongs();
    } catch (e) {
      console.error('Migration Allg. songs failed:', e);
    }

    try {
      await applyScheduledPauses();
    } catch (e) {
      console.error('Geplante Pausen konnten nicht angewendet werden:', e);
    }

    // Holiday fetch
    try {
      const db = getLocal();
      const settings = await loadSettings(db);
      if (settings.bundesland) {
        const lastFetch = settings.holidaysFetchedAt;
        const needsRefresh = !lastFetch || 
          (Date.now() - new Date(lastFetch).getTime()) > 30 * 24 * 60 * 60 * 1000;
        if (needsRefresh) {
          fetchAndStoreHolidays(settings.bundesland, db); // fire-and-forget
        }
      }
    } catch (e) {
      console.error('Holiday fetch failed:', e);
    }
  }

  // Migration 1: Freitext-Termin → schedule
  async function migrateLessonSlots() {
    const students = await listStudents(true);
    for (const s of students) {
      if (s.schedule != null || !s.lessonSlot) continue;
      const parsed = parseSlotToSchedule(s.lessonSlot);
      await updateStudent(s, { schedule: parsed ?? undefined });
    }
  }

  // Migration 2: Billing-Default
  async function migrateBilling() {
    const students = await listStudents(true);
    for (const s of students) {
      if (s.billing != null) continue;
      await updateStudent(s, { billing: { type: 'free' } });
    }
  }

  // Migration 3: "Allg."-Songs → generalNotes
  async function migrateAllgSongs() {
    const students = await listStudents(true);
    for (const s of students) {
      const songs = await listSongs(s._id);
      for (const song of songs) {
        const normalized = song.title.trim().toLowerCase();
        if (!/^allg\.?$|^allgemein$/.test(normalized)) continue;
        const entries = await listEntries(song._id);
        const generalNotes = [
          ...(s.generalNotes ?? []),
          ...entries.map(e => ({ 
            id: e._id.split(':').pop() || Math.random().toString(36),
            entryDate: e.entryDate,
            text: e.text,
            remark: e.remark,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt
          }))
        ];
        await updateStudent(s, { generalNotes });
        await archiveSong(song);
      }
    }
  }

  // Geplante Pausen anwenden: pausedFrom erreicht → Schüler pausieren
  async function applyScheduledPauses() {
    const today = todayISO();
    const students = await listStudents(true);
    for (const s of students) {
      if (s.archived || !s.pausedFrom) continue;
      if (s.pausedFrom <= today) {
        await updateStudent(s, { archived: true });
      }
    }
  }

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/' || currentPath.startsWith('/s/');
    return currentPath.startsWith(path);
  }
</script>

<div class="flex justify-center min-h-screen">
  <main class="w-full max-w-[640px] flex flex-col min-h-screen pb-20">
    <!-- TopAppBar -->
    <header class="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-md max-w-[640px]">
      <div class="flex items-center justify-between px-6 h-16 w-full">
        {#if studioName}
          <span class="text-xl font-bold text-[#ff8ba1] font-headline tracking-tight">{studioName}</span>
        {:else}
          <div></div>
        {/if}
        <button onclick={() => goto('/einstellungen')} class="flex items-center gap-2 py-1 px-2 rounded-lg active:scale-90 transition-transform">
          <div class="w-2.5 h-2.5 rounded-full {dotColor}"></div>
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="mt-20 px-6 pb-6">
      {#if syncProblem === 'auth' && currentPath !== '/setup'}
        <div class="mb-4 p-4 rounded-xl bg-error-container text-on-error-container flex items-center justify-between gap-3">
          <p class="text-sm font-body">
            <span class="font-headline font-bold">Anmeldung fehlgeschlagen.</span>
            Das gespeicherte Passwort stimmt nicht mehr.
          </p>
          <button
            onclick={() => goto('/setup')}
            class="flex-shrink-0 px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface font-headline font-bold text-sm active:scale-95 transition-transform"
          >
            Verbindung ändern
          </button>
        </div>
      {:else if syncProblem === 'offline' && currentPath !== '/setup'}
        <div class="mb-4 p-4 rounded-xl bg-surface-container-highest text-on-surface-variant">
          <p class="text-sm font-body">
            <span class="font-headline font-bold">Keine Verbindung zum Server.</span>
            Änderungen werden lokal gespeichert und später synchronisiert.
          </p>
        </div>
      {/if}
      {@render children()}
    </div>

    <!-- BottomNavBar -->
    <nav class="fixed bottom-0 w-full z-50 rounded-t-3xl bg-[#131313]/80 backdrop-blur-md shadow-[0_-12px_32px_rgba(0,0,0,0.4)] max-w-[640px]">
      <div class="flex justify-around items-center px-4 h-20 w-full">
        <a href="/"
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/') && currentPath !== '/setup' ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}">
          <span class="material-symbols-outlined" style={isActive('/') && currentPath !== '/setup' ? "font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : ""}>group</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Schüler</span>
        </a>
        <a href="/heute"
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/heute') ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}">
          <span class="material-symbols-outlined">event_note</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Heute</span>
        </a>
        <a href="/bibliothek"
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/bibliothek') ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}">
          <span class="material-symbols-outlined">library_music</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Bibliothek</span>
        </a>
        <a href="/einstellungen"
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/einstellungen') ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}">
          <span class="material-symbols-outlined">settings</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Einstellungen</span>
        </a>
      </div>
    </nav>
  </main>
</div>
