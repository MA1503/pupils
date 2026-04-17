<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import {
    getStudent, updateStudent,
    listSongs, createSong, updateSong, archiveSong,
    listEntries, createEntry, updateEntry, deleteEntry
  } from '$lib/repo';
  import type { Student, Song, Entry } from '$lib/types';

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

  let editName = $state('');
  let editLessonSlot = $state('');
  let editContractStart = $state('');
  let editTariff = $state('');

  let editingSong = $state(false);
  let editSongTitle = $state('');

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
      if (songs.length > 0) {
        entries = await listEntries(songs[activeSongIndex]._id);
      }
    } catch (e) {
      console.error('Fehler beim Laden:', e);
    } finally {
      loading = false;
    }
  });

  async function switchSong(idx: number) {
    editingSong = false;
    activeSongIndex = idx;
    entries = await listEntries(songs[idx]._id);
  }

  async function addSong() {
    const title = prompt('Song-Titel:');
    if (!title) return;
    try {
      const song = await createSong(id, title);
      songs = [song, ...songs];
      activeSongIndex = 0;
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
    editSongTitle = songs[activeSongIndex].title;
    editingSong = true;
  }

  async function renameSong() {
    if (!editSongTitle.trim()) return;
    const updated = await updateSong(songs[activeSongIndex], { title: editSongTitle.trim() });
    songs = songs.map((s, i) => i === activeSongIndex ? updated : s);
    editingSong = false;
  }

  async function removeSong() {
    if (!confirm(`Song "${songs[activeSongIndex].title}" löschen?`)) return;
    await archiveSong(songs[activeSongIndex]);
    const remaining = songs.filter((_, i) => i !== activeSongIndex);
    songs = remaining;
    editingSong = false;
    if (remaining.length === 0) {
      activeSongIndex = 0;
      entries = [];
    } else {
      activeSongIndex = Math.min(activeSongIndex, remaining.length - 1);
      entries = await listEntries(remaining[activeSongIndex]._id);
    }
  }

  async function addEntry() {
    if (songs.length === 0) return;
    const entry = await createEntry(songs[activeSongIndex]._id, id);
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

  async function toggleArchive() {
    if (!student) return;
    const msg = student.archived
      ? `${student.name} wieder aktivieren?`
      : `${student.name} pausieren? Der Schüler verschwindet aus der Hauptliste.`;
    if (!confirm(msg)) return;
    student = await updateStudent(student, { archived: !student.archived });
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
      <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
        {student.name}
      </h2>
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
        <input
          bind:value={editLessonSlot}
          placeholder="Unterrichtstermin (z.B. Mo 17:00)"
          class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface"
        />
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
          <p class="text-sm font-semibold text-on-surface-variant">{student.lessonSlot || '—'}</p>
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
    {/if}
  </section>

  <!-- Song Tabs -->
  <section class="mb-12 relative">
    <h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold mb-4 ml-1">Repertoire</h3>
    <div class="relative w-full">
      <!-- Tabs Container -->
      <div
        class="flex items-center gap-3 overflow-x-auto overflow-y-hidden no-scrollbar pb-2 w-full"
        style="touch-action: pan-x; overscroll-behavior-x: contain;"
        onwheel={(e) => {
          if (e.deltaY !== 0) {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {#each songs as song, i}
          {#if i === activeSongIndex}
            <div class="flex-shrink-0 flex items-center gap-1 px-5 py-2.5 rounded-full bg-primary text-on-primary-container shadow-lg shadow-primary/20">
              <span class="font-headline font-bold text-sm">{song.title}</span>
            </div>
          {:else}
            <button
              onclick={() => switchSong(i)}
              class="flex-shrink-0 px-5 py-2.5 rounded-full font-headline font-bold text-sm transition-colors bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant border-none"
            >
              {song.title}
            </button>
          {/if}
        {/each}
        <!-- Spacer: reserves scroll-room for fixed action buttons on the right -->
        <div class="flex-shrink-0 w-[120px]" aria-hidden="true"></div>
      </div>

      <!-- Fixed Buttons Container on the right -->
      <div 
        class="absolute right-0 top-0 bottom-2 flex items-center justify-end pr-0 pl-12 pointer-events-none"
        style="background: linear-gradient(to right, transparent, var(--background) 40%);"
      >
        <div class="flex items-center gap-2 bg-background pl-2 pointer-events-auto">
          <button
            onclick={addSong}
            class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/20 text-primary hover:bg-surface-variant transition-colors active:scale-95 shrink-0"
          >
            <span class="material-symbols-outlined text-[20px]">add</span>
          </button>
          {#if songs.length > 0}
            <button
              onclick={startEditSong}
              class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-highest text-primary hover:bg-surface-variant transition-colors active:scale-95 shrink-0 border-none"
            >
              <span class="material-symbols-outlined text-[20px]">edit</span>
            </button>
          {/if}
        </div>
      </div>
    </div>

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

  <!-- Notiz-Liste (Notes Timeline) -->
  <section class="pb-32">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold ml-1">Stundenprotokoll</h3>
      <div class="h-[1px] flex-grow ml-4 bg-outline-variant/20"></div>
    </div>

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
  </section>

  <!-- FAB: Floating Action Button -->
  {#if songs.length > 0}
    <div class="fixed bottom-24 right-6 z-50">
      <button
        onclick={addEntry}
        class="flex items-center gap-2 px-6 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold rounded-2xl fab-shadow shadow-primary-lg active:scale-90 transition-transform"
      >
        <span class="material-symbols-outlined font-bold" style="font-variation-settings: 'FILL' 0, 'wght' 700;">add</span>
        <span>HEUTE</span>
      </button>
    </div>
  {/if}
{/if}
