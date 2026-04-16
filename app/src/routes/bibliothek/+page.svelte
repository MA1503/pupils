<script lang="ts">
  import { onMount } from 'svelte';
  import { listAllSongs, listStudents } from '$lib/repo';
  import type { Song, Student } from '$lib/types';

  let songs = $state<Song[]>([]);
  let studentMap = $state<Map<string, string>>(new Map());
  let loading = $state(true);

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
  <div class="px-6 pt-8 pb-28">
    <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-8">Bibliothek</h2>

    {#if songs.length === 0}
      <p class="text-center text-outline-variant py-8">Noch keine Songs in der Bibliothek.</p>
    {:else}
      <div class="space-y-2">
        {#each songs as song}
          <a
            href="/s/{song.studentId}?song={songUlid(song)}"
            class="block bg-surface-container-low p-4 rounded-xl hover:bg-surface-container active:scale-[0.98] transition-all"
          >
            <p class="font-headline font-bold text-on-surface">{song.title}</p>
            <p class="text-xs text-outline-variant mt-0.5">{studentMap.get(song.studentId) ?? '—'}</p>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
