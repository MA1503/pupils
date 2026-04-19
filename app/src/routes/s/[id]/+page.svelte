<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    getStudent, updateStudent,
    listSongs, createSong, updateSong, archiveSong,
    listEntries, createEntry, updateEntry, deleteEntry,
    chargeLesson, addMakeupDate, switchBilling,
    addGeneralEntry, updateGeneralEntry, deleteGeneralEntry
  } from '$lib/repo';
  import type { Student, Song, Entry, GeneralEntry, Billing, Schedule } from '$lib/types';
  import ScheduleInput from '$lib/components/ScheduleInput.svelte';
  import BillingBadge from '$lib/components/BillingBadge.svelte';

  const id = $page.params.id as string;

  let student = $state<Student | null>(null);
  let songs = $state<Song[]>([]);
  let entries = $state<Entry[]>([]);
  let activeSongIndex = $state(0);
  let editingStudent = $state(false);
  let loading = $state(true);
  let editingEntryId = $state<string | null>(null);
  let editingText = $state('');
  let editingRemark = $state('');
  let editingDateId = $state<string | null>(null);
  let editingDateValue = $state('');

  let songsExpanded = $state(false);
  const SONGS_COLLAPSED_LIMIT = 6;
  const shouldAutoExpand = $derived(activeSongIndex >= SONGS_COLLAPSED_LIMIT);
  const visibleSongs = $derived(
    songsExpanded || shouldAutoExpand || songs.length <= SONGS_COLLAPSED_LIMIT
      ? songs
      : songs.slice(0, SONGS_COLLAPSED_LIMIT)
  );

  let editName = $state('');
  let editSchedule = $state<Schedule | null>(null);
  let editContractStart = $state('');
  let editTariff = $state('');
  
  // Billing edit
  let editingBilling = $state(false);
  let editBillingType = $state<Billing['type']>('free');
  let editCardSize = $state(10);
  let editCardAlreadyUsed = $state(0);
  let editContractStartDate = $state('');
  let editContractRate = $state<number | undefined>(undefined);

  let editingSong = $state(false);
  let editSongTitle = $state('');
  
  // Makeup date
  let showMakeupInput = $state(false);
  let makeupDateValue = $state('');

  // Toast
  let toast = $state<{ msg: string; undoFn?: () => Promise<void> } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let previousBilling = $state<Student['billing'] | null>(null);

  function showToast(msg: string, undoFn?: () => Promise<void>) {
    if (toastTimer) clearTimeout(toastTimer);
    toast = { msg, undoFn };
    toastTimer = setTimeout(() => { toast = null; }, 5000);
  }
  
  // General notes editing
  let editingGeneralEntryId = $state<string | null>(null);
  let editingGeneralText = $state('');
  let editingGeneralRemark = $state('');
  let editingGeneralDate = $state<string | null>(null);
  let editingGeneralDateValue = $state('');

  const WEEKDAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  onMount(async () => {
    if (id === 'new') {
      try {
        const { createStudent } = await import('$lib/repo');
        const s = await createStudent({ name: 'Neue Schülerin', lessonSlot: '', contractStart: '', tariff: '' });
        window.location.href = `/s/${s._id}`;
        return;
      } catch (e) {
        console.error('Fehler beim Erstellen:', e);
        window.location.href = '/';
        return;
      }
    }
    try {
      student = await getStudent(id);
      songs = await listSongs(id);
      const wantedSongUlid = $page.url.searchParams.get('song');
      if (wantedSongUlid && songs.length > 0) {
        const idx = songs.findIndex(s => s._id.split(':')[2] === wantedSongUlid);
        if (idx >= 0) activeSongIndex = idx;
      }
      if (songs.length > 0 && activeSongIndex > 0) {
        entries = await listEntries(songs[activeSongIndex - 1]._id);
      }
    } catch (e) {
      console.error('Fehler beim Laden:', e);
    } finally {
      loading = false;
    }
  });

  // Tab array includes "Allgemein" at position 0
  const allTabs = $derived([
    { type: 'general', title: 'Allgemein' },
    ...songs.map(s => ({ type: 'song' as const, title: s.title, song: s }))
  ]);

  async function switchTab(idx: number) {
    editingSong = false;
    activeSongIndex = idx;
    if (idx > 0 && songs[idx - 1]) {
      entries = await listEntries(songs[idx - 1]._id);
    } else {
      entries = [];
    }
  }

  async function addSong() {
    const title = prompt('Song-Titel:');
    if (!title) return;
    try {
      const song = await createSong(id, title);
      songs = [song, ...songs];
      activeSongIndex = 1; // Position 1 (after Allgemein)
      entries = [];
    } catch (e) {
      const err = e as { status?: number };
      if (err?.status === 409) {
        alert('Song existiert bereits — bitte neu versuchen');
      } else {
        throw e;
      }
    }
  }

  function startEditSong() {
    if (activeSongIndex === 0 || !songs[activeSongIndex - 1]) return;
    editSongTitle = songs[activeSongIndex - 1].title;
    editingSong = true;
  }

  async function renameSong() {
    if (!editSongTitle.trim() || activeSongIndex === 0) return;
    const updated = await updateSong(songs[activeSongIndex - 1], { title: editSongTitle.trim() });
    songs = songs.map((s, i) => i === activeSongIndex - 1 ? updated : s);
    editingSong = false;
  }

  async function removeSong() {
    if (activeSongIndex === 0 || !confirm(`Song "${songs[activeSongIndex - 1].title}" löschen?`)) return;
    await archiveSong(songs[activeSongIndex - 1]);
    const remaining = songs.filter((_, i) => i !== activeSongIndex - 1);
    songs = remaining;
    editingSong = false;
    if (remaining.length === 0) {
      activeSongIndex = 0;
      entries = [];
    } else {
      activeSongIndex = Math.min(activeSongIndex, remaining.length);
      if (activeSongIndex > 0) {
        entries = await listEntries(remaining[activeSongIndex - 1]._id);
      }
    }
  }

  async function addEntry() {
    if (activeSongIndex === 0 || songs.length === 0) return;
    const entry = await createEntry(songs[activeSongIndex - 1]._id, id);
    entries = [entry, ...entries];
  }

  async function saveEntry(entry: Entry, text: string, remark?: string) {
    const updated = await updateEntry(entry, text, remark);
    entries = entries.map(e => e._id === updated._id ? updated : e);
  }

  async function removeEntry(entry: Entry) {
    await deleteEntry(entry);
    entries = entries.filter(e => e._id !== entry._id);
  }

  function startEditEntry(entry: Entry) {
    editingEntryId = entry._id;
    editingText = entry.text;
    editingRemark = entry.remark ?? '';
  }

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

  function cancelEditEntry() {
    editingEntryId = null;
    editingText = '';
    editingRemark = '';
  }

  async function saveDateEdit() {
    if (!editingDateId || !editingDateValue) return;
    const entry = entries.find(e => e._id === editingDateId);
    if (entry) {
      const updated = await updateEntry(entry, entry.text, entry.remark, editingDateValue);
      entries = entries.map(e => e._id === updated._id ? updated : e);
    }
    editingDateId = null;
    editingDateValue = '';
  }

  function startEditStudent() {
    if (!student) return;
    editName = student.name;
    editSchedule = student.schedule ?? null;
    editContractStart = student.contractStart;
    editTariff = student.tariff;
    editingStudent = true;
    editingBilling = false;
    editBillingType = student.billing?.type ?? 'free';
    editCardAlreadyUsed = 0;

    if (student.billing?.type === 'card') {
      const card = student.billing as Extract<Billing, { type: 'card' }>;
      editCardSize = card.size;
      editCardAlreadyUsed = card.charges.length;
    } else if (student.billing?.type === 'free' && student.tariff) {
      // Pre-fill from old tariff string if not yet migrated
      const cardMatch = student.tariff.match(/(\d+)er[\s-]*[Kk]arte/i);
      if (cardMatch) {
        editBillingType = 'card';
        editCardSize = parseInt(cardMatch[1], 10);
        editingBilling = true; // open billing section directly
      }
    }

    if (student.billing?.type === 'contract') {
      const contract = student.billing as Extract<Billing, { type: 'contract' }>;
      editContractStartDate = contract.startDate;
      editContractRate = contract.monthlyRate;
    }
  }

  async function saveStudent() {
    if (!student) return;
    
    // Build lessonSlot string from schedule for backward compatibility
    let lessonSlotStr = student.lessonSlot;
    if (editSchedule) {
      const dayName = WEEKDAY_NAMES[editSchedule.weekday];
      const cadenceStr = editSchedule.cadence === 'biweekly-even' 
        ? ', zweiwöchentlich gerade' 
        : editSchedule.cadence === 'biweekly-odd' 
          ? ', zweiwöchentlich ungerade' 
          : '';
      lessonSlotStr = `${dayName} ${editSchedule.time}${cadenceStr}`;
    }
    
    student = await updateStudent(student, {
      name: editName,
      schedule: editSchedule ?? undefined,
      lessonSlot: lessonSlotStr,
      contractStart: editContractStart,
      tariff: editTariff
    });
    editingStudent = false;
  }
  
  async function saveBilling() {
    if (!student) return;
    
    let newBilling: Billing;
    switch (editBillingType) {
      case 'card': {
        const existingCharges = student.billing?.type === 'card'
          ? (student.billing as Extract<Billing, { type: 'card' }>).charges
          : [];
        // If initial count changed, rebuild charges to match
        const initialCharges = editCardAlreadyUsed > 0 && existingCharges.length === 0
          ? Array.from({ length: editCardAlreadyUsed }, () => ({ date: student!.contractStart || new Date().toISOString().slice(0, 10), source: 'regular' as const }))
          : existingCharges;
        newBilling = { type: 'card', size: editCardSize, charges: initialCharges };
        break;
      }
      case 'contract':
        newBilling = { 
          type: 'contract', 
          startDate: editContractStartDate || new Date().toISOString().slice(0, 10),
          monthlyRate: editContractRate,
          charges: []
        };
        break;
      default:
        newBilling = { type: 'free' };
    }
    
    student = await switchBilling(student, newBilling);
    editingBilling = false;
  }

  async function toggleArchive() {
    if (!student) return;
    const msg = student.archived
      ? `${student.name} wieder aktivieren?`
      : `${student.name} pausieren? Der Schüler verschwindet aus der Hauptliste.`;
    if (!confirm(msg)) return;
    student = await updateStudent(student, { archived: !student.archived });
  }
  
  async function handleChargeLesson() {
    if (!student || !student.billing || student.billing.type === 'free') return;

    if (student.billing.type === 'card') {
      const remaining = (student.billing as import('$lib/types').BillingCard).size
        - (student.billing as import('$lib/types').BillingCard).charges.length;
      if (remaining <= 0 && !confirm('Karte ist leer — trotzdem abrechnen?')) return;
    }

    previousBilling = student.billing;
    student = await chargeLesson(student);

    let msg = 'Stunde abgerechnet';
    const b = student.billing;
    if (b?.type === 'card') {
      const rem = b.size - b.charges.length;
      msg = `Abgerechnet · noch ${rem} Stunde${rem === 1 ? '' : 'n'}`;
    }

    const snap = previousBilling;
    showToast(msg, async () => {
      if (student && snap) student = await updateStudent(student, { billing: snap });
    });
  }
  
  async function handleAddMakeupDate() {
    if (!student || !makeupDateValue) return;
    student = await addMakeupDate(student, makeupDateValue);
    showMakeupInput = false;
    makeupDateValue = '';
  }
  
  function formatSchedule(s: Schedule): string {
    const dayName = WEEKDAY_NAMES[s.weekday];
    const cadenceLabel = s.cadence === 'biweekly-even' || s.cadence === 'biweekly-odd' ? '2-wöchig' : '';
    return `${dayName} ${s.time}${cadenceLabel ? ' · ' + cadenceLabel : ''}`;
  }
  
  // General notes functions
  async function addGeneralNote() {
    if (!student) return;
    const newNote = await addGeneralEntry(student, '', '');
    student = newNote;
    editingGeneralEntryId = newNote.generalNotes?.[newNote.generalNotes.length - 1]?.id ?? null;
    editingGeneralText = '';
    editingGeneralRemark = '';
  }
  
  function startEditGeneralEntry(entry: GeneralEntry) {
    editingGeneralEntryId = entry.id;
    editingGeneralText = entry.text;
    editingGeneralRemark = entry.remark ?? '';
  }
  
  async function saveEditGeneralEntry() {
    if (!student || !editingGeneralEntryId) return;
    student = await updateGeneralEntry(student, editingGeneralEntryId, editingGeneralText, editingGeneralRemark);
    editingGeneralEntryId = null;
    editingGeneralText = '';
    editingGeneralRemark = '';
  }
  
  function cancelEditGeneralEntry() {
    editingGeneralEntryId = null;
    editingGeneralText = '';
    editingGeneralRemark = '';
  }
  
  async function removeGeneralEntry(entry: GeneralEntry) {
    if (!student || !confirm('Eintrag löschen?')) return;
    student = await deleteGeneralEntry(student, entry.id);
  }
  
  async function saveGeneralDateEdit() {
    if (!student || !editingGeneralDate || !editingGeneralDateValue) return;
    const entry = student.generalNotes?.find(e => e.id === editingGeneralDate);
    if (entry) {
      const updated = await updateGeneralEntry(student, editingGeneralDate, entry.text, entry.remark);
      // Update date manually
      const finalNotes = updated.generalNotes?.map(e => 
        e.id === editingGeneralDate ? { ...e, entryDate: editingGeneralDateValue, updatedAt: new Date().toISOString() } : e
      );
      student = await updateStudent(updated, { generalNotes: finalNotes });
    }
    editingGeneralDate = null;
    editingGeneralDateValue = '';
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  }
</script>

{#if loading}
  <p class="text-center text-outline py-12">Laden…</p>
{:else if student}
  <!-- Profile Header Area -->
  <section class="mb-10">
    <div class="flex items-center justify-between group">
      <div class="flex items-center gap-3">
        <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
          {student.name}
        </h2>
        <BillingBadge billing={student.billing} />
      </div>
      <button
        onclick={startEditStudent}
        class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-highest text-primary hover:bg-surface-variant transition-colors active:scale-95"
      >
        <span class="material-symbols-outlined text-[20px]">edit</span>
      </button>
    </div>

    {#if editingStudent}
      <div class="mt-4 bg-surface-container-highest p-6 rounded-xl space-y-4">
        <input
          bind:value={editName}
          placeholder="Name"
          class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface"
        />
        
        <div>
          <label class="block text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Unterrichtstermin</label>
          <ScheduleInput value={editSchedule} onchange={(s) => editSchedule = s} />
          {#if student.schedule === null && student.lessonSlot}
            <p class="text-xs text-yellow-500 mt-2">⚠ Bitte Termin überprüfen — konnte nicht automatisch erkannt werden</p>
          {/if}
        </div>
        
        <input
          bind:value={editContractStart}
          type="date"
          class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface"
        />
        <input
          bind:value={editTariff}
          placeholder="Tarif (z.B. 30min · 90€/Monat)"
          class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface"
        />
        
        <!-- Billing Section -->
        <div class="border-t border-outline-variant/30 pt-4 mt-4">
          <label class="block text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Abrechnung</label>
          
          {#if !editingBilling}
            <div class="flex items-center justify-between bg-surface-container-low p-3 rounded-lg">
              <span class="text-sm text-on-surface">
                {student.billing?.type === 'card' ? '10er-Karte' : 
                 student.billing?.type === 'contract' ? 'Festvertrag' : 'Frei'}
              </span>
              <button onclick={() => editingBilling = true} class="text-primary text-sm font-bold">Ändern</button>
            </div>
          {:else}
            <div class="space-y-3 bg-surface-container-low p-4 rounded-lg">
              <div class="flex flex-wrap gap-2">
                {#each [{key: 'free', label: 'Frei'}, {key: 'card', label: '10er-Karte'}, {key: 'contract', label: 'Festvertrag'}] as opt}
                  <button
                    onclick={() => editBillingType = opt.key as Billing['type']}
                    class="px-3 py-1.5 rounded-full text-xs font-bold {editBillingType === opt.key ? 'bg-primary text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'}"
                  >
                    {opt.label}
                  </button>
                {/each}
              </div>
              
              {#if editBillingType === 'card'}
                <div class="flex gap-2">
                  <div class="flex-1">
                    <p class="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Kartengröße</p>
                    <input
                      type="number"
                      bind:value={editCardSize}
                      placeholder="z.B. 10"
                      class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-2 text-on-surface text-sm"
                    />
                  </div>
                  <div class="flex-1">
                    <p class="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Bereits abgerechnet</p>
                    <input
                      type="number"
                      bind:value={editCardAlreadyUsed}
                      min="0"
                      placeholder="0"
                      class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-2 text-on-surface text-sm"
                    />
                  </div>
                </div>
                <p class="text-xs text-outline">
                  Verbleibend: {Math.max(0, editCardSize - editCardAlreadyUsed)} Stunden
                </p>
              {/if}
              
              {#if editBillingType === 'contract'}
                <input
                  type="date"
                  bind:value={editContractStartDate}
                  placeholder="Vertragsbeginn"
                  class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-2 text-on-surface text-sm mb-2"
                />
                <input
                  type="number"
                  bind:value={editContractRate}
                  placeholder="Monatlicher Betrag (optional)"
                  class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-2 text-on-surface text-sm"
                />
              {/if}
              
              <div class="flex gap-2 pt-2">
                <button onclick={saveBilling} class="flex-1 bg-primary text-on-primary py-2 rounded-lg text-sm font-bold">Speichern</button>
                <button onclick={() => editingBilling = false} class="flex-1 bg-surface-container-highest text-on-surface py-2 rounded-lg text-sm font-bold">Abbrechen</button>
              </div>
            </div>
          {/if}
        </div>
        
        <!-- Archiv-Toggle -->
        <div class="flex items-center justify-between bg-surface-container-low p-4 rounded-xl">
          <div>
            <p class="text-sm font-semibold text-on-surface">Status</p>
            <p class="text-xs text-outline mt-0.5">{student.archived ? 'Pausiert — nicht in Hauptliste' : 'Aktiv'}</p>
          </div>
          <button
            type="button"
            onclick={toggleArchive}
            class="px-4 py-2 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 {student.archived ? 'bg-primary text-on-primary-container shadow-primary' : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/30'}"
          >
            {student.archived ? 'Aktivieren' : 'Pausieren'}
          </button>
        </div>
        <div class="flex gap-3 pt-2">
          <button
            onclick={saveStudent}
            class="flex-1 bg-primary text-on-primary font-headline font-bold py-3 rounded-xl active:scale-95 transition-transform"
          >
            Speichern
          </button>
          <button
            onclick={() => editingStudent = false}
            class="flex-1 bg-surface-container-low text-on-surface font-headline font-bold py-3 rounded-xl active:scale-95 transition-transform"
          >
            Abbrechen
          </button>
        </div>
      </div>
    {:else}
      <div class="mt-4 grid grid-cols-3 gap-3">
        <div class="bg-surface-container-low p-3 rounded-xl">
          <p class="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Termin</p>
          {#if student.schedule}
            <p class="text-sm font-semibold text-on-surface-variant">{formatSchedule(student.schedule)}</p>
          {:else}
            <p class="text-sm font-semibold text-on-surface-variant">{student.lessonSlot || '—'}</p>
            {#if student.schedule === null && student.lessonSlot}
              <p class="text-xs text-yellow-500 mt-1">⚠ Bitte überprüfen</p>
            {/if}
          {/if}
        </div>
        <div class="bg-surface-container-low p-3 rounded-xl">
          <p class="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Tarif</p>
          <p class="text-sm font-semibold text-on-surface-variant">{student.tariff || '—'}</p>
        </div>
        <div class="bg-surface-container-low p-3 rounded-xl">
          <p class="text-[10px] uppercase tracking-widest text-outline mb-1 font-bold">Seit</p>
          <p class="text-sm font-semibold text-on-surface-variant">{student.contractStart || '—'}</p>
        </div>
      </div>
      
      <!-- Billing migration warning -->
      {#if student.billing?.type === 'free' && student.tariff}
        <div class="mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p class="text-sm font-bold text-yellow-600">Abrechnung nicht eingerichtet</p>
            <p class="text-xs text-outline mt-0.5">Altes Tarif-Feld: „{student.tariff}"</p>
          </div>
          <button onclick={startEditStudent} class="text-xs font-bold text-yellow-600 underline">Einrichten</button>
        </div>
      {/if}

      <!-- Abrechnen & Verschieben buttons -->
      <div class="flex gap-2 mt-3">
        {#if student.billing && student.billing.type !== 'free'}
          <button
            onclick={handleChargeLesson}
            class="flex-1 bg-primary text-on-primary font-headline font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
          >
            Stunde abrechnen
          </button>
        {/if}
        <button
          onclick={() => showMakeupInput = !showMakeupInput}
          class="flex-1 bg-surface-container-low text-on-surface font-headline font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
        >
          Verschieben
        </button>
      </div>

      {#if showMakeupInput}
        <div class="flex gap-2 mt-2">
          <input
            type="date"
            bind:value={makeupDateValue}
            class="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-2 text-on-surface text-sm"
          />
          <button onclick={handleAddMakeupDate} class="px-4 bg-primary text-on-primary rounded-lg text-sm font-bold">
            OK
          </button>
          <button onclick={() => { showMakeupInput = false; makeupDateValue = ''; }} class="px-4 bg-surface-container-highest text-on-surface rounded-lg text-sm">
            ✕
          </button>
        </div>
      {/if}
    {/if}
  </section>

  <!-- Song Repertoire Tabs -->
  <section class="mb-12">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold ml-1">Repertoire</h3>
      <div class="flex items-center gap-2">
        <button
          onclick={addSong}
          class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low text-primary hover:bg-surface-variant transition-colors active:scale-95 shrink-0 border border-outline-variant/20"
          aria-label="Song hinzufügen"
        >
          <span class="material-symbols-outlined text-[20px]">add</span>
        </button>
        {#if songs.length > 0 && activeSongIndex > 0}
          <button
            onclick={startEditSong}
            class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-highest text-primary hover:bg-surface-variant transition-colors active:scale-95 shrink-0 border-none"
            aria-label="Song bearbeiten"
          >
            <span class="material-symbols-outlined text-[20px]">edit</span>
          </button>
        {/if}
      </div>
    </div>

    {#if allTabs.length > 0}
      <div class="flex flex-wrap gap-3">
        {#each allTabs as tab, i}
          {@const isGeneral = tab.type === 'general'}
          {@const isActive = i === activeSongIndex}
          {#if isActive}
            <div
              class="grow px-5 py-2.5 rounded-full font-headline font-bold text-sm text-center shadow-lg {isGeneral ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-primary text-on-primary-container shadow-primary/20'}"
              style="min-width: 140px;"
            >
              {tab.title}
            </div>
          {:else}
            <button
              onclick={() => switchTab(i)}
              class="grow px-5 py-2.5 rounded-full font-headline font-bold text-sm transition-colors border-none {isGeneral ? 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant'}"
              style="min-width: 140px;"
            >
              {tab.title}
            </button>
          {/if}
        {/each}
      </div>

      {#if songs.length > SONGS_COLLAPSED_LIMIT && !shouldAutoExpand}
        <button
          onclick={() => songsExpanded = !songsExpanded}
          class="mt-4 w-full py-2 text-sm text-outline-variant hover:text-primary transition-colors flex items-center justify-center gap-2 border-none"
          style="background: transparent;"
        >
          <span class="material-symbols-outlined text-[20px]">
            {songsExpanded ? 'expand_less' : 'expand_more'}
          </span>
          {songsExpanded ? 'Weniger' : `${songs.length - SONGS_COLLAPSED_LIMIT} weitere`}
        </button>
      {/if}
    {/if}

    {#if editingSong}
      <div class="mt-3 flex items-center gap-2 bg-surface-container-highest p-3 rounded-xl">
        <input
          bind:value={editSongTitle}
          class="flex-1 bg-surface-container-low rounded-lg px-4 py-2.5 text-on-surface text-sm border-none font-headline font-bold"
          onkeydown={(e) => e.key === 'Enter' && renameSong()}
        />
        <button onclick={renameSong} class="w-10 h-10 flex items-center justify-center bg-surface-container-low text-primary rounded-xl active:scale-95 transition-transform border-none shrink-0 hover:bg-surface-variant" aria-label="Speichern">
          <span class="material-symbols-outlined text-[20px]">check</span>
        </button>
        <button onclick={removeSong} class="w-10 h-10 flex items-center justify-center bg-surface-container-low text-error-dim rounded-xl active:scale-95 transition-transform border-none shrink-0 hover:bg-surface-variant" aria-label="Song löschen">
          <span class="material-symbols-outlined text-[20px]">delete</span>
        </button>
        <button onclick={() => editingSong = false} class="w-10 h-10 flex items-center justify-center bg-surface-container-low text-on-surface-variant rounded-xl active:scale-95 transition-transform border-none shrink-0 hover:bg-surface-variant" aria-label="Abbrechen">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    {/if}
  </section>

  <!-- General Notes / Entry List -->
  <section class="pb-32">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold ml-1">
        {activeSongIndex === 0 ? 'Allgemeine Notizen' : 'Stundenprotokoll'}
      </h3>
      <div class="h-[1px] flex-grow ml-4 bg-outline-variant/20"></div>
    </div>

    {#if activeSongIndex === 0}
      <!-- General Notes Tab -->
      {#if !student?.generalNotes?.length}
        <p class="text-center text-outline-variant py-8">Noch keine allgemeinen Einträge. Tipp auf "+ Notiz".</p>
      {:else}
        <div class="space-y-10 relative">
          <!-- Vertical Timeline Line -->
          <div class="absolute left-3 top-2 bottom-0 w-[1px] bg-gradient-to-b from-surface-variant to-transparent"></div>

          {#each student.generalNotes.slice().reverse() as entry, i (entry.id)}
            <div class="relative pl-10 {i > 0 ? 'opacity-60' : ''}">
              <!-- Progress Pip -->
              <div class="absolute left-1 top-1.5 w-4 h-4 rounded-full border-2 {i === 0 ? 'border-surface-variant bg-background' : 'border-outline-variant bg-background'} flex items-center justify-center">
                {#if i === 0}
                  <div class="w-1.5 h-1.5 rounded-full bg-surface-variant"></div>
                {/if}
              </div>
              
              {#if editingGeneralDate === entry.id}
                <div class="flex items-center gap-2 mb-4">
                  <input type="date" bind:value={editingGeneralDateValue}
                    class="bg-surface-container-low border-none rounded-lg px-3 flex-1 text-on-surface text-sm font-headline font-bold h-9" />
                  <button onclick={saveGeneralDateEdit} aria-label="Datum speichern" class="w-9 h-9 flex items-center justify-center bg-surface-variant text-on-surface rounded-lg active:scale-95 transition-transform border-none shrink-0">
                    <span class="material-symbols-outlined" style="font-size:18px">check</span>
                  </button>
                  <button onclick={() => { editingGeneralDate = null; }} aria-label="Abbrechen" class="w-9 h-9 flex items-center justify-center bg-surface-container-low text-on-surface-variant rounded-lg active:scale-95 transition-transform border-none shrink-0">
                    <span class="material-symbols-outlined" style="font-size:18px">close</span>
                  </button>
                </div>
              {:else}
                <div class="flex items-center gap-1 mb-4">
                  <span class="text-sm font-headline font-bold text-on-surface-variant">{formatDate(entry.entryDate)}</span>
                  <button onclick={() => { editingGeneralDate = entry.id; editingGeneralDateValue = entry.entryDate; }}
                    class="w-7 h-7 ml-1 flex items-center justify-center rounded-lg bg-surface-container-highest text-outline-variant hover:bg-surface-variant hover:text-primary transition-colors border-none" aria-label="Datum bearbeiten">
                    <span class="material-symbols-outlined" style="font-size:15px">edit</span>
                  </button>
                </div>
              {/if}

              {#if editingGeneralEntryId === entry.id}
                <!-- Editing Mode -->
                <div class="bg-surface-container-highest p-6 rounded-2xl shadow-xl shadow-black/20">
                  <textarea
                    bind:value={editingGeneralText}
                    rows="4"
                    placeholder="Notiz schreiben…"
                    class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface leading-relaxed resize-none"
                  ></textarea>
                  <label class="block mt-4">
                    <span class="text-[10px] uppercase tracking-[0.2em] text-outline font-bold">Hinweis (optional)</span>
                    <textarea
                      bind:value={editingGeneralRemark}
                      rows="2"
                      placeholder="Hausaufgabe, Merksatz, TODO…"
                      class="w-full mt-1 bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface leading-relaxed resize-none"
                    ></textarea>
                  </label>
                  <div class="flex gap-3 mt-4">
                    <button onclick={saveEditGeneralEntry} class="flex-1 bg-surface-variant text-on-surface py-3 rounded-xl active:scale-95 transition-transform" aria-label="Speichern">
                      <span class="material-symbols-outlined text-[20px]">check</span>
                    </button>
                    <button onclick={cancelEditGeneralEntry} class="flex-1 bg-surface-container-low text-on-surface py-3 rounded-xl active:scale-95 transition-transform" aria-label="Abbrechen">
                      <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                    <button
                      onclick={() => { removeGeneralEntry(entry); cancelEditGeneralEntry(); }}
                      class="w-12 h-12 flex items-center justify-center bg-error-container text-on-error-container rounded-xl active:scale-95 transition-transform border-none shrink-0"
                      aria-label="Löschen"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              {:else if i === 0}
                <!-- Active/First entry -->
                <div
                  class="bg-surface-container-low p-6 rounded-2xl shadow-xl shadow-black/20 cursor-pointer hover:bg-surface-container transition-colors"
                  onclick={() => startEditGeneralEntry(entry)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && startEditGeneralEntry(entry)}
                >
                  <p class="text-on-surface leading-relaxed whitespace-pre-wrap">
                    {entry.text || '(leer — tippen zum Bearbeiten)'}
                  </p>
                  {#if entry.remark}
                    <div class="mt-4 bg-surface-container-highest rounded-xl p-4 border-l-4 border-surface-variant">
                      <p class="text-[10px] uppercase tracking-[0.2em] text-surface-variant font-bold mb-2">Hinweis</p>
                      <p class="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{entry.remark}</p>
                    </div>
                  {/if}
                </div>
              {:else}
                <div
                  class="bg-surface-container-low p-6 rounded-2xl cursor-pointer hover:bg-surface-container transition-colors"
                  onclick={() => startEditGeneralEntry(entry)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && startEditGeneralEntry(entry)}
                >
                  <p class="text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {entry.text || '(leer — tippen zum Bearbeiten)'}
                  </p>
                  {#if entry.remark}
                    <div class="mt-4 bg-surface-container-highest rounded-xl p-4 border-l-4 border-surface-variant">
                      <p class="text-[10px] uppercase tracking-[0.2em] text-surface-variant font-bold mb-2">Hinweis</p>
                      <p class="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{entry.remark}</p>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <!-- Song Entries Tab -->
      {#if songs.length === 0}
        <p class="text-center text-outline-variant py-8">Noch keine Songs. Tipp auf + in der Tab-Leiste.</p>
      {:else if entries.length === 0}
        <p class="text-center text-outline-variant py-8">Noch keine Einträge. Tipp auf "+ Heute".</p>
      {:else}
        <div class="space-y-10 relative">
          <!-- Vertical Timeline Line -->
          <div class="absolute left-3 top-2 bottom-0 w-[1px] bg-gradient-to-b from-primary/40 to-transparent"></div>

          {#each entries as entry, i}
            <div class="relative pl-10 {i > 0 ? 'opacity-60' : ''}">
              <!-- Progress Pip -->
              <div class="absolute left-1 top-1.5 w-4 h-4 rounded-full border-2 {i === 0 ? 'border-primary bg-background' : 'border-outline-variant bg-background'} flex items-center justify-center">
                {#if i === 0}
                  <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                {/if}
              </div>
              {#if editingDateId === entry._id}
                <div class="flex items-center gap-2 mb-4">
                  <input type="date" bind:value={editingDateValue}
                    class="bg-surface-container-low border-none rounded-lg px-3 flex-1 text-on-surface text-sm font-headline font-bold h-9" />
                  <button onclick={saveDateEdit} aria-label="Datum speichern" class="w-9 h-9 flex items-center justify-center bg-primary text-on-primary rounded-lg active:scale-95 transition-transform border-none shrink-0">
                    <span class="material-symbols-outlined" style="font-size:18px">check</span>
                  </button>
                  <button onclick={() => { editingDateId = null; }} aria-label="Abbrechen" class="w-9 h-9 flex items-center justify-center bg-surface-container-low text-on-surface-variant rounded-lg active:scale-95 transition-transform border-none shrink-0">
                    <span class="material-symbols-outlined" style="font-size:18px">close</span>
                  </button>
                </div>
              {:else}
                <div class="flex items-center gap-1 mb-4">
                  <span class="text-sm font-headline font-bold text-on-surface-variant">{formatDate(entry.entryDate)}</span>
                  <button onclick={() => { editingDateId = entry._id; editingDateValue = entry.entryDate; }}
                    class="w-7 h-7 ml-1 flex items-center justify-center rounded-lg bg-surface-container-highest text-outline-variant hover:bg-surface-variant hover:text-primary transition-colors border-none" aria-label="Datum bearbeiten">
                    <span class="material-symbols-outlined" style="font-size:15px">edit</span>
                  </button>
                </div>
              {/if}

              {#if editingEntryId === entry._id}
                <!-- Editing Mode -->
                <div class="bg-surface-container-highest p-6 rounded-2xl shadow-xl shadow-black/20">
                  <textarea
                    bind:value={editingText}
                    rows="4"
                    placeholder="Notiz schreiben…"
                    class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface leading-relaxed resize-none"
                  ></textarea>
                  <label class="block mt-4">
                    <span class="text-[10px] uppercase tracking-[0.2em] text-outline font-bold">Hinweis (optional)</span>
                    <textarea
                      bind:value={editingRemark}
                      rows="2"
                      placeholder="Hausaufgabe, Merksatz, TODO…"
                      class="w-full mt-1 bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface leading-relaxed resize-none"
                    ></textarea>
                  </label>
                  <div class="flex gap-3 mt-4">
                    <button onclick={saveEditEntry} class="flex-1 bg-primary text-on-primary py-3 rounded-xl active:scale-95 transition-transform" aria-label="Speichern">
                      <span class="material-symbols-outlined text-[20px]">check</span>
                    </button>
                    <button onclick={cancelEditEntry} class="flex-1 bg-surface-container-low text-on-surface py-3 rounded-xl active:scale-95 transition-transform" aria-label="Abbrechen">
                      <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                    <button
                      onclick={() => { removeEntry(entry); cancelEditEntry(); }}
                      class="w-12 h-12 flex items-center justify-center bg-error-container text-on-error-container rounded-xl active:scale-95 transition-transform border-none shrink-0"
                      aria-label="Löschen"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              {:else if i === 0}
                <!-- Active/First entry -->
                <div
                  class="bg-surface-container-low p-6 rounded-2xl shadow-xl shadow-black/20 cursor-pointer hover:bg-surface-container transition-colors"
                  onclick={() => startEditEntry(entry)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && startEditEntry(entry)}
                >
                  <p class="text-on-surface leading-relaxed whitespace-pre-wrap">
                    {entry.text || '(leer — tippen zum Bearbeiten)'}
                  </p>
                  {#if entry.remark}
                    <div class="mt-4 bg-surface-container-highest rounded-xl p-4 border-l-4 border-primary">
                      <p class="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-2">Hinweis</p>
                      <p class="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{entry.remark}</p>
                    </div>
                  {/if}
                </div>
              {:else}
                <div
                  class="bg-surface-container-low p-6 rounded-2xl cursor-pointer hover:bg-surface-container transition-colors"
                  onclick={() => startEditEntry(entry)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && startEditEntry(entry)}
                >
                  <p class="text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {entry.text || '(leer — tippen zum Bearbeiten)'}
                  </p>
                  {#if entry.remark}
                    <div class="mt-4 bg-surface-container-highest rounded-xl p-4 border-l-4 border-primary">
                      <p class="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-2">Hinweis</p>
                      <p class="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{entry.remark}</p>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </section>

  <!-- Toast -->
  {#if toast}
    <div class="fixed bottom-36 left-4 right-4 z-50 flex items-center justify-between bg-on-surface text-surface rounded-2xl px-5 py-3 shadow-xl">
      <span class="text-sm font-headline font-bold">{toast.msg}</span>
      {#if toast.undoFn}
        <button
          onclick={async () => { await toast?.undoFn?.(); toast = null; if (toastTimer) clearTimeout(toastTimer); }}
          class="text-primary font-bold text-sm ml-4 shrink-0"
        >
          Rückgängig
        </button>
      {/if}
    </div>
  {/if}

  <!-- FAB: Floating Action Button -->
  {#if activeSongIndex === 0 || songs.length > 0}
    <div class="fixed bottom-24 right-6 z-50">
      <button
        onclick={activeSongIndex === 0 ? addGeneralNote : addEntry}
        class="flex items-center gap-2 px-6 py-4 bg-gradient-to-br {activeSongIndex === 0 ? 'from-surface-variant to-surface-container-highest text-on-surface' : 'from-primary to-primary-container text-on-primary'} font-headline font-extrabold rounded-2xl fab-shadow shadow-primary-lg active:scale-90 transition-transform"
      >
        <span class="material-symbols-outlined font-bold" style="font-variation-settings: 'FILL' 0, 'wght' 700;">add</span>
        <span>{activeSongIndex === 0 ? 'NOTIZ' : 'HEUTE'}</span>
      </button>
    </div>
  {/if}
{/if}
