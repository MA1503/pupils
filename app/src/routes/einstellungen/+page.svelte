<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { loadConfig, getLocal } from '$lib/db';
  import { BUNDESLAENDER, loadSettings, saveSettings, fetchAndStoreHolidays, listHolidays, addManualHoliday, removeHoliday } from '$lib/holidays';
  import { getISOWeek, weekParity } from '$lib/date';
  import { version } from '$app/environment';
  import type { PupilsConfig, Holiday, AppSettings } from '$lib/types';

  let config = $state<PupilsConfig | null>(null);
  let backupRunning = $state(false);
  let backupResult = $state<{ ok: boolean; log: string } | null>(null);

  let settings = $state<AppSettings>({ _id: 'settings:app', type: 'settings' });
  let holidays = $state<Holiday[]>([]);
  let loadingHolidays = $state(true);

  // Manual holiday form
  let manualDate = $state('');
  let manualName = $state('');

  // Inline edit for manual holidays
  let editingHolidayId = $state<string | null>(null);
  let editingHolidayDate = $state('');
  let editingHolidayName = $state('');

  const currentKW = getISOWeek(new Date());
  const currentParity = weekParity(new Date());

  onMount(async () => {
    config = loadConfig();
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
  
  async function removeHolidayDate(holiday: Holiday) {
    const db = getLocal();
    // For range docs, remove by _id directly; for single-day, remove by date
    if (holiday.subtype === 'school' || holiday.dateFrom) {
      const doc = await db.get(holiday._id);
      await db.remove(doc._id, (doc as { _rev: string })._rev);
    } else {
      await removeHoliday(holiday.date!, db);
    }
    await reloadHolidays();
  }

  function startEditHoliday(holiday: Holiday) {
    editingHolidayId = holiday._id;
    editingHolidayDate = holiday.date ?? holiday.dateFrom ?? '';
    editingHolidayName = holiday.name;
  }

  async function saveEditHoliday(holiday: Holiday) {
    if (!editingHolidayDate || !editingHolidayName) return;
    const db = getLocal();
    const doc = await db.get<Holiday>(holiday._id);
    await db.put({ ...doc, date: editingHolidayDate, name: editingHolidayName });
    editingHolidayId = null;
    await reloadHolidays();
  }

  async function reloadHolidays() {
    const db = getLocal();
    holidays = await listHolidays(
      new Date().toISOString().slice(0, 10),
      new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
      db
    );
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function holidayDisplayDate(h: Holiday): string {
    if (h.dateFrom && h.dateTo) return `${formatDate(h.dateFrom)} – ${formatDate(h.dateTo)}`;
    return formatDate(h.date ?? '');
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

  <!-- Version -->
  <div class="bg-surface-container-highest p-4 rounded-xl mb-4">
    <p class="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Version</p>
    <p class="text-sm text-on-surface-variant font-body">v{version}</p>
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

      <!-- Status line -->
      {#if settings.holidaysFetchedAt}
        <p class="text-xs {settings.holidaysFetchResult === 'error' ? 'text-yellow-600' : 'text-outline'}">
          {settings.holidaysFetchResult === 'error' ? '⚠ Letzter Versuch fehlgeschlagen · ' : ''}Zuletzt: {new Date(settings.holidaysFetchedAt).toLocaleDateString('de-DE')}
          {#if settings.holidaysCount}
            · {settings.holidaysCount.public} Feiertage · {settings.holidaysCount.school} Ferientage
          {/if}
        </p>
      {/if}

      <!-- API holidays list (collapsible) -->
      {#if !loadingHolidays && holidays.filter(h => h.source === 'api').length > 0}
        <details class="text-xs">
          <summary class="cursor-pointer text-outline font-bold uppercase tracking-widest text-[10px] py-1">
            {holidays.filter(h => h.source === 'api').length} geladene Einträge
          </summary>
          <div class="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {#each holidays.filter(h => h.source === 'api') as h (h._id)}
              <div class="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg">
                <div>
                  <span class="text-on-surface-variant">{h.name}</span>
                  <span class="ml-2 text-outline">{holidayDisplayDate(h)}</span>
                </div>
                <span class="text-[9px] uppercase tracking-widest text-outline border border-outline/20 rounded px-1.5 py-0.5">
                  {h.subtype === 'school' ? 'Ferien' : 'Feiertag'}
                </span>
              </div>
            {/each}
          </div>
        </details>
      {/if}

      <!-- Manual Holiday Form -->
      <div class="border-t border-outline-variant/30 pt-4">
        <p class="block text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Manueller Eintrag</p>
        <div class="flex gap-2 mb-2">
          <input type="date" bind:value={manualDate}
            class="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-2 text-on-surface text-sm" />
          <input type="text" bind:value={manualName} placeholder="Name"
            class="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-2 text-on-surface text-sm" />
          <button onclick={addManual} disabled={!manualDate || !manualName}
            class="px-4 bg-primary text-on-primary rounded-lg text-sm font-bold disabled:opacity-50">
            +
          </button>
        </div>
      </div>

      <!-- Manual entries with inline edit -->
      {#if !loadingHolidays && holidays.filter(h => h.source === 'manual').length > 0}
        <div class="space-y-2">
          <p class="text-[10px] uppercase tracking-widest text-outline font-bold">Manuelle Einträge</p>
          {#each holidays.filter(h => h.source === 'manual') as holiday (holiday._id)}
            {#if editingHolidayId === holiday._id}
              <div class="flex gap-2 bg-surface-container-low p-2 rounded-lg">
                <input type="date" bind:value={editingHolidayDate}
                  class="flex-1 bg-surface-container-highest border-none rounded-lg px-3 py-1.5 text-on-surface text-sm" />
                <input type="text" bind:value={editingHolidayName} placeholder="Name"
                  class="flex-1 bg-surface-container-highest border-none rounded-lg px-3 py-1.5 text-on-surface text-sm" />
                <button onclick={() => saveEditHoliday(holiday)}
                  class="w-8 h-8 flex items-center justify-center text-primary">
                  <span class="material-symbols-outlined text-sm">check</span>
                </button>
                <button onclick={() => editingHolidayId = null}
                  class="w-8 h-8 flex items-center justify-center text-outline-variant">
                  <span class="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            {:else}
              <div class="flex items-center justify-between bg-surface-container-low p-3 rounded-lg">
                <div>
                  <p class="text-sm text-on-surface">{holiday.name}</p>
                  <p class="text-xs text-outline">{holidayDisplayDate(holiday)}</p>
                </div>
                <div class="flex gap-1">
                  <button onclick={() => startEditHoliday(holiday)}
                    class="w-8 h-8 flex items-center justify-center text-outline-variant hover:text-primary rounded-lg hover:bg-surface-container-highest transition-colors">
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onclick={() => removeHolidayDate(holiday)}
                    class="w-8 h-8 flex items-center justify-center text-error-dim rounded-lg hover:bg-surface-container-highest transition-colors">
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            {/if}
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
