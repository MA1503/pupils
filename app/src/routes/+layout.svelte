<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { loadConfig, startSync, onSyncStatus } from '$lib/db';
  import { syncStatus } from '$lib/stores';
  import '../app.css';

  let { children } = $props();
  let currentPath = $derived($page.url.pathname);
  let settingsOpen = $state(false);
  let config = $state<{ url: string; user: string } | null>(null);
  let backupRunning = $state(false);
  let backupResult = $state<{ ok: boolean; log: string } | null>(null);

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

  async function runBackup() {
    const cfg = loadConfig();
    if (!cfg) return;
    backupRunning = true;
    backupResult = null;
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${cfg.user}:${cfg.pass}`) },
        signal: AbortSignal.timeout(300_000)
      });
      backupResult = { ok: res.ok, log: await res.text() };
    } catch (e) {
      backupResult = { ok: false, log: `Fehler: ${e instanceof Error ? e.message : String(e)}` };
    } finally {
      backupRunning = false;
    }
  }
</script>

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
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/') && currentPath !== '/setup' ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}">
          <span class="material-symbols-outlined" style={isActive('/') && currentPath !== '/setup' ? "font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : ""}>group</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Schüler</span>
        </a>
        <a href="/heute"
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/heute') ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}">
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

    <button
      onclick={runBackup}
      disabled={backupRunning}
      class="w-full mt-3 py-4 bg-surface-container-highest text-on-surface font-headline font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
    >
      {backupRunning ? 'Backup läuft…' : 'Backup jetzt starten'}
    </button>

    {#if backupResult}
      <div class="mt-4 p-4 rounded-xl {backupResult.ok ? 'bg-primary/10 text-primary' : 'bg-error-container text-on-error-container'}">
        <p class="font-headline font-bold text-sm mb-2">{backupResult.ok ? 'Backup erfolgreich' : 'Backup fehlgeschlagen'}</p>
        <pre class="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">{backupResult.log}</pre>
      </div>
    {/if}
  </div>
{/if}
