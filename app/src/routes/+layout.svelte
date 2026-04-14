<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { loadConfig, startSync, onSyncStatus } from '$lib/db';
  import { syncStatus } from '$lib/stores';
  import '../app.css';

  let { children } = $props();

  let currentPath = $derived($page.url.pathname);

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

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }
</script>

<div class="flex justify-center min-h-screen">
  <main class="w-full max-w-[640px] flex flex-col min-h-screen pb-20">
    <!-- TopAppBar -->
    <header class="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-md max-w-[640px]">
      <div class="flex items-center justify-between px-6 h-16 w-full">
        <span class="text-xl font-bold text-[#ff8ba1] font-headline tracking-tight">The Rhythmic Atelier</span>
        <div class="flex gap-4">
          <button class="material-symbols-outlined text-[#ececec] hover:bg-[#262626] transition-colors p-2 rounded-full">settings</button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="mt-20 px-6 pb-6">
      {@render children()}
    </div>

    <!-- BottomNavBar -->
    <nav class="fixed bottom-0 w-full z-50 rounded-t-3xl bg-[#131313]/80 backdrop-blur-md shadow-[0_-12px_32px_rgba(0,0,0,0.4)] max-w-[640px]">
      <div class="flex justify-around items-center px-4 h-20 w-full">
        <!-- Schüler Tab -->
        <a 
          href="/" 
          class="flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-transform active:scale-90 {isActive('/') && currentPath !== '/setup' ? 'text-[#ff8ba1] bg-[#262626]' : 'text-[#484848] hover:text-[#ff8ba1]'}"
        >
          <span class="material-symbols-outlined" style={isActive('/') && currentPath !== '/setup' ? "font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : ""}>group</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Schüler</span>
        </a>
        <!-- Heute Tab -->
        <a 
          href="#heute" 
          class="flex flex-col items-center justify-center px-4 py-1 text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform"
        >
          <span class="material-symbols-outlined">event_note</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Heute</span>
        </a>
        <!-- Bibliothek Tab -->
        <a 
          href="#bibliothek" 
          class="flex flex-col items-center justify-center px-4 py-1 text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform"
        >
          <span class="material-symbols-outlined">library_music</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Bibliothek</span>
        </a>
        <!-- Profil Tab -->
        <a 
          href="#profil" 
          class="flex flex-col items-center justify-center px-4 py-1 text-[#484848] hover:text-[#ff8ba1] active:scale-90 transition-transform"
        >
          <span class="material-symbols-outlined">person</span>
          <span class="font-headline text-[10px] font-bold uppercase tracking-widest mt-1">Profil</span>
        </a>
      </div>
    </nav>
  </main>
</div>
