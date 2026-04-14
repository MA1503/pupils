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

<main class="pt-24 pb-12 flex flex-col items-center min-h-screen max-w-[640px] mx-auto">
  <!-- Welcome Hero Section -->
  <section class="w-full text-left mb-12">
    <div class="mb-6 overflow-hidden rounded-xl h-48 w-full bg-surface-container-highest relative">
      <div class="absolute inset-0 bg-gradient-to-br from-primary/20 to-tertiary/20"></div>
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="material-symbols-outlined text-[80px] text-primary/40">music_note</span>
      </div>
    </div>
    <h2 class="font-headline font-extrabold text-4xl mb-3 tracking-tighter leading-none">
      Hallo! <span class="editorial-gradient-text">Lass uns deine Schüler-Daten synchronisieren.</span>
    </h2>
    <p class="text-on-surface-variant font-body text-base max-w-md">
      Verbinde dich mit deiner CouchDB-Instanz, um deinen Unterrichtsplan und deine Notizen geräteübergreifend aktuell zu halten.
    </p>
  </section>

  <!-- Setup Form Card -->
  <section class="w-full bg-surface-container-highest rounded-xl p-8 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
    <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); connect(); }}>
      <!-- Server URL Input -->
      <div class="space-y-2">
        <label class="block font-headline font-bold text-sm text-primary uppercase tracking-widest" for="server-url">Server-URL</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span class="material-symbols-outlined text-outline text-lg">dns</span>
          </div>
          <input
            id="server-url"
            type="url"
            bind:value={url}
            placeholder="https://couchdb.example.com"
            class="w-full bg-surface-container-lowest border-none focus:ring-0 text-on-surface placeholder:text-outline-variant rounded-lg pl-12 pr-4 py-4 transition-all focus:border-b-2 focus:border-primary"
          />
        </div>
      </div>

      <!-- Username Input -->
      <div class="space-y-2">
        <label class="block font-headline font-bold text-sm text-primary uppercase tracking-widest" for="username">Benutzername</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span class="material-symbols-outlined text-outline text-lg">person</span>
          </div>
          <input
            id="username"
            type="text"
            bind:value={user}
            placeholder="Dein Nutzername"
            autocomplete="username"
            class="w-full bg-surface-container-lowest border-none focus:ring-0 text-on-surface placeholder:text-outline-variant rounded-lg pl-12 pr-4 py-4 transition-all focus:border-b-2 focus:border-primary"
          />
        </div>
      </div>

      <!-- Password Input -->
      <div class="space-y-2">
        <label class="block font-headline font-bold text-sm text-primary uppercase tracking-widest" for="password">Passwort</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span class="material-symbols-outlined text-outline text-lg">lock</span>
          </div>
          <input
            id="password"
            type="password"
            bind:value={pass}
            placeholder="••••••••"
            autocomplete="current-password"
            class="w-full bg-surface-container-lowest border-none focus:ring-0 text-on-surface placeholder:text-outline-variant rounded-lg pl-12 pr-12 py-4 transition-all focus:border-b-2 focus:border-primary"
          />
          <button type="button" class="absolute inset-y-0 right-0 pr-4 flex items-center text-outline-variant hover:text-primary transition-colors">
            <span class="material-symbols-outlined">visibility</span>
          </button>
        </div>
      </div>

      <!-- Error Message -->
      {#if error}
        <div class="bg-error-container text-on-error-container p-4 rounded-xl text-sm">
          {error}
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="pt-6 space-y-4">
        <button
          type="submit"
          disabled={loading || !url || !user || !pass}
          class="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold h-12 rounded-xl active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? 'Verbinde…' : 'Verbinden'}
        </button>
        <button
          type="button"
          onclick={() => goto('/')}
          class="w-full bg-transparent border border-outline-variant/30 text-on-surface font-headline font-bold h-12 rounded-xl hover:bg-surface-container-low transition-colors active:scale-95"
        >
          Vorerst überspringen
        </button>
      </div>
    </form>
  </section>

  <!-- Secondary Info / Footer -->
  <footer class="mt-12 text-center">
    <div class="flex items-center justify-center gap-2 mb-4">
      <span class="material-symbols-outlined text-outline-variant text-sm">shield</span>
      <p class="text-on-surface-variant text-xs font-label">Deine Daten werden verschlüsselt übertragen und lokal gespeichert.</p>
    </div>
  </footer>
</main>

<!-- Visual Polish: Decorative Elements -->
<div class="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
<div class="fixed bottom-[5%] left-[-10%] w-[300px] h-[300px] bg-tertiary/5 rounded-full blur-[80px] -z-10"></div>
