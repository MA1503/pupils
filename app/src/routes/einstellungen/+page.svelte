<script lang="ts">
  import { goto } from '$app/navigation';
  import { loadConfig } from '$lib/db';
  import type { PupilsConfig } from '$lib/types';

  let config = $state<PupilsConfig | null>(null);
  let backupRunning = $state(false);
  let backupResult = $state<{ ok: boolean; log: string } | null>(null);

  config = loadConfig();

  async function runBackup() {
    if (!config) return;
    backupRunning = true;
    backupResult = null;
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${config.user}:${config.pass}`) },
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

<div class="px-6 pt-8 pb-28">
  <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-8">Einstellungen</h2>

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
    onclick={() => goto('/setup')}
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
