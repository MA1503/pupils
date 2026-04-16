<script lang="ts">
  import { onMount } from 'svelte';
  import { listStudents, searchStudents } from '$lib/repo';
  import { students, sortedStudents, sortKey } from '$lib/stores';

  let query = $state('');
  let loading = $state(true);
  let showArchived = $state(false);

  onMount(async () => {
    students.set(await listStudents(showArchived));
    loading = false;
  });

  async function toggleArchived() {
    showArchived = !showArchived;
    students.set(await listStudents(showArchived));
  }

  const filtered = $derived(searchStudents($sortedStudents, query));

  function addStudent() {
    window.location.href = '/s/new';
  }

  function toggleSort(key: 'name' | 'contractStart') {
    sortKey.set(key);
    localStorage.setItem('sortKey', key);
  }
</script>

<!-- Search & Filter Section -->
<section class="space-y-6">
  <!-- Search Bar -->
  <div class="relative group">
    <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
      <span class="material-symbols-outlined text-outline">search</span>
    </div>
    <input
      type="text"
      bind:value={query}
      placeholder="Schüler suchen..."
      class="w-full bg-surface-container-lowest border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline-variant font-body transition-all"
    />
  </div>

  <!-- Sort Controls -->
  <div class="flex gap-3">
    <button
      onclick={() => toggleSort('name')}
      class="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 {$sortKey === 'name' ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-primary' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}"
    >
      Name
    </button>
    <button
      onclick={() => toggleSort('contractStart')}
      class="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 {$sortKey === 'contractStart' ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-primary' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}"
    >
      Vertragsbeginn
    </button>
    <button
      onclick={toggleArchived}
      class="py-3 px-4 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 {showArchived ? 'bg-surface-container-highest text-primary border border-primary/40' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}"
      title={showArchived ? 'Pausierte Schüler ausblenden' : 'Pausierte Schüler einblenden'}
    >
      <span class="material-symbols-outlined text-lg align-middle">{showArchived ? 'visibility_off' : 'visibility'}</span>
    </button>
  </div>
</section>

<!-- Student List -->
<section class="mt-8 space-y-4">
  {#if loading}
    <p class="text-center text-outline py-12">Laden…</p>
  {:else if filtered.length === 0}
    <p class="text-center text-outline-variant py-12">
      {query ? 'Keine Schüler gefunden.' : 'Noch keine Schüler. Tipp auf +, um anzufangen.'}
    </p>
  {:else}
    {#each filtered as student (student._id)}
      <a
        href="/s/{student._id}"
        class="block bg-surface-container-highest p-6 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border border-outline-variant/10">
            <span class="material-symbols-outlined text-outline text-xl">person</span>
          </div>
          <div>
            <h3 class="font-headline text-lg font-bold text-on-surface tracking-tight">{student.name}</h3>
            <p class="font-body text-sm text-outline">{student.lessonSlot || 'Kein Termin'}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {#if student.archived}
            <span class="text-primary-dim text-xs font-bold font-headline uppercase tracking-widest">Pausiert</span>
          {:else if student.lessonSlot}
            <span class="text-primary text-xs font-bold font-headline uppercase tracking-widest">Aktiv</span>
          {/if}
          <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
        </div>
      </a>
    {/each}
  {/if}
</section>

<!-- Floating Action Button -->
<div class="fixed bottom-24 right-6 z-50">
  <button
    onclick={addStudent}
    class="editorial-shadow shadow-primary-lg bg-gradient-to-br from-primary to-primary-container text-on-primary-container h-14 pl-5 pr-6 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform duration-200"
  >
    <span class="material-symbols-outlined font-bold">add</span>
    <span class="font-headline font-extrabold text-sm uppercase tracking-wider">Schüler</span>
  </button>
</div>
