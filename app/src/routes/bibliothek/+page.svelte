<script lang="ts">
  import { onMount } from 'svelte';
  import { listAllSongs, listStudents } from '$lib/repo';
  import type { Song, Student } from '$lib/types';

  let songs = $state<Song[]>([]);
  let studentMap = $state<Map<string, string>>(new Map());
  let loading = $state(true);
  let query = $state('');
  const filtered = $derived(
    query.trim() === ''
      ? songs
      : songs.filter(s =>
          s.title.toLowerCase().includes(query.trim().toLowerCase()) ||
          (studentMap.get(s.studentId) ?? '').toLowerCase().includes(query.trim().toLowerCase())
        )
  );

  onMount(async () => {
    const [allSongs, allStudents] = await Promise.all([listAllSongs(), listStudents(true)]);
    studentMap = new Map(allStudents.map(s => [s._id, s.name]));
    songs = allSongs;
    loading = false;
  });

  function songUlid(song: Song): string {
    return song._id.split(':')[2];
  }
</script>

{#if loading}
  <p class="text-center text-outline py-12">Laden…</p>
{:else}
  <div class="pt-8 pb-28">
    <h2 class="text-5xl font-headline font-extrabold tracking-tight text-on-surface mb-8">Bibliothek</h2>

    <div class="relative group mb-6">
      <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span class="material-symbols-outlined text-outline">search</span>
      </div>
      <input
        type="text"
        bind:value={query}
        placeholder="Song oder Schüler suchen..."
        class="w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline-variant font-body transition-all"
      />
    </div>

    {#if filtered.length === 0}
      <p class="text-center text-outline-variant py-8">Noch keine Songs in der Bibliothek.</p>
    {:else}
      <div class="space-y-5">
        {#each filtered as song}
          <a
            href="/s/{song.studentId}?song={songUlid(song)}"
            class="block bg-surface-container-highest p-5 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform shadow-primary"
          >
            <div>
              <p class="font-headline font-bold text-on-surface">{song.title}</p>
              <p class="text-xs text-outline mt-0.5">{studentMap.get(song.studentId) ?? '—'}</p>
            </div>
            <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
