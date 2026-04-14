<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import {
    getStudent, updateStudent,
    listSongs, createSong,
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

  let editName = $state('');
  let editLessonSlot = $state('');
  let editContractStart = $state('');
  let editTariff = $state('');

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
    activeSongIndex = idx;
    entries = await listEntries(songs[idx]._id);
  }

  async function addSong() {
    const title = prompt('Song-Titel:');
    if (!title) return;
    try {
      const song = await createSong(id, title);
      songs = [...songs, song];
      activeSongIndex = songs.length - 1;
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

  async function addEntry() {
    if (songs.length === 0) return;
    const entry = await createEntry(songs[activeSongIndex]._id, id);
    entries = [entry, ...entries];
  }

  async function saveEntry(entry: Entry, text: string) {
    const updated = await updateEntry(entry, text);
    entries = entries.map(e => e._id === updated._id ? updated : e);
  }

  async function removeEntry(entry: Entry) {
    await deleteEntry(entry);
    entries = entries.filter(e => e._id !== entry._id);
  }

  function startEditEntry(entry: Entry) {
    editingEntryId = entry._id;
    editingText = entry.text;
  }

  async function saveEditEntry() {
    if (!editingEntryId) return;
    const entry = entries.find(e => e._id === editingEntryId);
    if (entry) {
      await saveEntry(entry, editingText);
    }
    editingEntryId = null;
    editingText = '';
  }

  function cancelEditEntry() {
    editingEntryId = null;
    editingText = '';
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
  <section class="mb-12">
    <h3 class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold mb-4 ml-1">Repertoire</h3>
    <div class="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
      {#each songs as song, i}
        <button
          onclick={() => switchSong(i)}
          class="flex-shrink-0 px-5 py-2.5 rounded-full font-headline font-bold text-sm transition-colors {i === activeSongIndex ? 'bg-primary text-on-primary-container shadow-lg shadow-primary/20' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant'}"
        >
          {song.title}
        </button>
      {/each}
      <button
        onclick={addSong}
        class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-surface-container-low border border-outline-variant/20 text-primary rounded-full hover:bg-surface-container-highest transition-colors"
      >
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>
  </section>

  <!-- Notiz-Liste (Notes Timeline) -->
  <section>
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
            <span class="block text-sm font-headline font-bold text-on-surface-variant mb-4">{formatDate(entry.entryDate)}</span>

            {#if editingEntryId === entry._id}
              <!-- Editing Mode -->
              <div class="bg-surface-container-highest p-6 rounded-2xl shadow-xl shadow-black/20">
                <textarea
                  bind:value={editingText}
                  rows="4"
                  placeholder="Notiz schreiben…"
                  class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface leading-relaxed resize-none"
                ></textarea>
                <div class="flex gap-3 mt-4">
                  <button
                    onclick={saveEditEntry}
                    class="flex-1 bg-primary text-on-primary font-headline font-bold py-3 rounded-xl active:scale-95 transition-transform"
                  >
                    Speichern
                  </button>
                  <button
                    onclick={cancelEditEntry}
                    class="flex-1 bg-surface-container-low text-on-surface font-headline font-bold py-3 rounded-xl active:scale-95 transition-transform"
                  >
                    Abbrechen
                  </button>
                  <button
                    onclick={() => { removeEntry(entry); cancelEditEntry(); }}
                    class="bg-error-container text-on-error-container font-headline font-bold py-3 px-4 rounded-xl active:scale-95 transition-transform"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            {:else if i === 0}
              <!-- Active/First entry - styled differently -->
              <div
                class="bg-surface-container-highest p-6 rounded-2xl shadow-xl shadow-black/20 cursor-pointer hover:bg-surface-container-high transition-colors"
                onclick={() => startEditEntry(entry)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && startEditEntry(entry)}
              >
                <p class="text-on-surface leading-relaxed">
                  {entry.text || '(leer — tippen zum Bearbeiten)'}
                </p>
              </div>
            {:else}
              <div
                class="bg-surface-container-low p-6 rounded-2xl cursor-pointer hover:bg-surface-container transition-colors"
                onclick={() => startEditEntry(entry)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && startEditEntry(entry)}
              >
                <p class="text-on-surface-variant leading-relaxed">
                  {entry.text || '(leer — tippen zum Bearbeiten)'}
                </p>
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
        class="flex items-center gap-2 px-6 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold rounded-2xl fab-shadow active:scale-90 transition-transform"
      >
        <span class="material-symbols-outlined font-bold" style="font-variation-settings: 'FILL' 0, 'wght' 700;">add</span>
        <span>HEUTE</span>
      </button>
    </div>
  {/if}
{/if}
