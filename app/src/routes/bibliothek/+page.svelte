<script lang="ts">
  import { onMount } from 'svelte';
  import { listAllSongs, listStudents } from '$lib/repo';
  import type { Song, Student } from '$lib/types';

  let songs = $state<Song[]>([]);
  let studentMap = $state<Map<string, Student>>(new Map());
  let loading = $state(true);
  let query = $state('');
  
  // Group songs by normalized title
  const groupedSongs = $derived(() => {
    const groups = new Map<string, Array<{song: Song; student: Student}>>();
    
    const filtered = query.trim() === ''
      ? songs
      : songs.filter(s => {
      const student = studentMap.get(s.studentId);
          const q = query.toLowerCase().trim();
          return s.title.toLowerCase().includes(q) ||
            (student?.name.toLowerCase().includes(q) ?? false);
        });
    
    for (const song of filtered) {
      const student = studentMap.get(song.studentId);
      if (!student) continue;
      
      // Normalize: lowercase, trim — keine Umlaut-Normalisierung
      const normalized = song.title.toLowerCase().trim();
      
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized)!.push({ song, student });
    }
    
    // Sort by title
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de')));
  });
  
  const groups = $derived(groupedSongs());

  onMount(async () => {
    const [allSongs, allStudents] = await Promise.all([listAllSongs(), listStudents(true)]);
    studentMap = new Map(allStudents.map(s => [s._id, s]));
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

    {#if groups.size === 0}
      <p class="text-center text-outline-variant py-8">Noch keine Songs in der Bibliothek.</p>
    {:else}
      <div class="space-y-4">
        {#each groups as [normalizedTitle, items] (normalizedTitle)}
          {@const displayTitle = items[0].song.title}
          <details class="bg-surface-container-highest rounded-xl overflow-hidden">
            <summary class="p-5 flex items-center justify-between cursor-pointer select-none list-none">
              <div>
                <p class="font-headline font-bold text-on-surface">{displayTitle}</p>
                <p class="text-xs text-outline mt-0.5">{items.length} Schüler</p>
              </div>
              <span class="material-symbols-outlined text-outline-variant">expand_more</span>
            </summary>
            <div class="px-5 pb-5 space-y-3">
              {#each items as {song, student} (song._id)}
                <a
                  href="/s/{song.studentId}?song={songUlid(song)}"
                  class="block bg-surface-container-low p-4 rounded-lg flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <span class="text-sm text-on-surface-variant">{student.name}</span>
                  <span class="material-symbols-outlined text-outline-variant text-sm">chevron_right</span>
                </a>
              {/each}
            </div>
          </details>
        {/each}
      </div>
    {/if}
  </div>
{/if}
