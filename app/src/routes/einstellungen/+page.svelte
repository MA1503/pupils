<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { loadConfig, getLocal } from '$lib/db';
  import { BUNDESLAENDER, loadSettings, saveSettings, fetchAndStoreHolidays, listHolidays, addManualHoliday, removeHoliday } from '$lib/holidays';
  import { getISOWeek, weekParity } from '$lib/date';
  import type { PupilsConfig, Holiday } from '$lib/types';

  let config = $state<PupilsConfig | null>(null);
  let backupRunning = $state(false);
  let backupResult = $state<{ ok: boolean; log: string } | null>(null);
  
  let settings = $state<{ bundesland?: string; holidaysFetchedAt?: string }>({});
  let holidays = $state<Holiday[]>([]);
  let loadingHolidays = $state(true);
  
  // Manual holiday form
  let manualDate = $state('');
  let manualName = $state('');

  config = loadConfig();

  const currentKW = getISOWeek(new Date());
  const currentParity = weekParity(new Date());

  onMount(async () => {
    const db = getLocal();
    settings = await loadSettings(db);
    holidays = await listHolidays(
      new Date().toISOString().slice(0, 10),
      new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
      db
    );
    loadingHolidays = false;
  });

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
  
  async function handleBundeslandChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const db = getLocal();
    await saveSettings(db, { bundesland: select.value });
    settings = await loadSettings(db);
  }
  
  async function refreshHolidays() {
    if (!settings.bundesland) return;
    const db = getLocal();
    await fetchAndStoreHolidays(settings.bundesland, db);
    settings = await loadSettings(db);
    holidays = await listHolidays(
      new Date().toISOString().slice(0, 10),
      new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
      db
    );
  }
  
  async function addManual() {
    if (!manualDate || !manualName || !settings.bundesland) return;
    const db = getLocal();
    await addManualHoliday(manualDate, manualName, settings.bundesland, db);
    manualDate = '';
    manualName = '';
    holidays = await listHolidays(
      new Date().toISOString().slice(0, 10),
      new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
      db
    );
  }
  
  async function removeHolidayDate(dateISO: string) {
    const db = getLocal();
    await removeHoliday(dateISO, db);
    holidays = await listHolidays(
      new Date().toISOString().slice(0, 10),
      new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
      db
    );
  }
  
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  }
</script>

<div class="pt-8 pb-28">
  <h2 class="text-5xl font-headline font-extrabold tracking-tight text-on-surface mb-8">Einstellungen</h2>

  <!-- KW Info -->
  <div class="bg-surface-container-highest p-4 rounded-xl mb-4">
    <p class="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Kalenderwoche</p>
    <p class="text-sm text-on-surface-variant font-body">
      Aktuell KW {currentKW} · {currentParity === 'even' ? 'gerade' : 'ungerade'} Woche
    </p>
  </div>

  <!-- Connection Info -->
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

  <!-- Bundesland & Holidays Section -->
  <div class="bg-surface-container-highest p-4 rounded-xl mb-4 space-y-4">
    <h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold">Bundesland & Ferien</h3>
    
    <div>
      <label class="block text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Bundesland</label>
      <select 
        value={settings.bundesland ?? ''} 
        onchange={handleBundeslandChange}
        class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface"
      >
        <option value="">Bitte wählen...</option>
        {#each Object.entries(BUNDESLAENDER) as [key, label]}
          <option value={key}>{label}</option>
        {/each}
      </select>
    </div>
    
    {#if settings.bundesland}
      <button
        onclick={refreshHolidays}
        class="w-full py-3 bg-surface-container-low text-on-surface font-headline font-bold rounded-xl active:scale-95 transition-transform"
      >
        Ferien jetzt aktualisieren
      </button>
      
      {#if settings.holidaysFetchedAt}
        <p class="text-xs text-outline">
          Zuletzt aktualisiert: {new Date(settings.holidaysFetchedAt).toLocaleDateString('de-DE')}
        </p>
      {/if}
      
      <!-- Manual Holiday Form -->
      <div class="border-t border-outline-variant/30 pt-4">
        <label class="block text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Manueller Feiertag</label>
        <div class="flex gap-2 mb-2">
          <input
            type="date"
            bind:value={manualDate}
            class="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-2 text-on-surface text-sm"
          />
          <input
            type="text"
            bind:value={manualName}
            placeholder="Name"
            class="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-2 text-on-surface text-sm"
          />
          <button
            onclick={addManual}
            disabled={!manualDate || !manualName}
            class="px-4 bg-primary text-on-primary rounded-lg text-sm font-bold disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
      </div>
      
      <!-- Manual Holidays List -->
      {#if !loadingHolidays && holidays.filter(h => h.source === 'manual').length > 0}
        <div class="space-y-2">
          <p class="text-[10px] uppercase tracking-widest text-outline font-bold">Manuelle Einträge</p>
          {#each holidays.filter(h => h.source === 'manual') as holiday (holiday._id)}
            <div class="flex items-center justify-between bg-surface-container-low p-3 rounded-lg">
              <div>
                <p class="text-sm text-on-surface">{holiday.name}</p>
                <p class="text-xs text-outline">{formatDate(holiday.date)}</p>
              </div>
              <button
                onclick={() => removeHolidayDate(holiday.date)}
                class="w-8 h-8 flex items-center justify-center text-error-dim rounded-lg hover:bg-surface-container-highest transition-colors"
              >
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
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
