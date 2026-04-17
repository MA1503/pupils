<script lang="ts">
  import { onMount } from 'svelte';
  import { listStudents } from '$lib/repo';
  import type { Student } from '$lib/types';

  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  let allStudents = $state<Student[]>([]);
  let loading = $state(true);

  const todayAbbr = DAYS[new Date().getDay()];

  onMount(async () => {
    allStudents = await listStudents();
    loading = false;
  });

  const todayStudents = $derived(
    allStudents.filter(s => !s.archived && s.lessonSlot?.trimStart().startsWith(todayAbbr))
  );

  const otherStudents = $derived(
    allStudents.filter(s => !s.archived && !s.lessonSlot?.trimStart().startsWith(todayAbbr))
  );
</script>

<section class="space-y-6">
  <div>
    <h2 class="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
      {DAYS[new Date().getDay()]}, {new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
    </h2>
    <p class="text-sm text-outline mt-1">Unterricht heute</p>
  </div>

  {#if loading}
    <p class="text-center text-outline py-12">Laden…</p>
  {:else if todayStudents.length === 0}
    <div class="bg-surface-container-highest p-8 rounded-2xl text-center">
      <span class="material-symbols-outlined text-outline text-4xl block mb-3">event_available</span>
      <p class="text-on-surface-variant">Keine Unterrichtsstunden für heute gefunden.</p>
      <p class="text-xs text-outline mt-2">Tipp: Termin im Format "Mo 17:00" eintragen.</p>
    </div>
  {:else}
    <div class="space-y-5">
      {#each todayStudents as student (student._id)}
        <a
          href="/s/{student._id}"
          class="block bg-surface-container-highest p-5 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform shadow-primary"
        >
          <div class="flex items-center gap-4">
            <div class="h-11 w-11 rounded-full bg-surface-container-low flex items-center justify-center border border-primary/20">
              <span class="material-symbols-outlined text-primary">person</span>
            </div>
            <div>
              <h3 class="font-headline font-bold text-on-surface">{student.name}</h3>
              <p class="text-sm text-outline">{student.lessonSlot}</p>
            </div>
          </div>
          <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
        </a>
      {/each}
    </div>
  {/if}

  {#if otherStudents.length > 0 && !loading}
    <details class="mt-8">
      <summary class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold cursor-pointer select-none mb-4 list-none flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">expand_more</span>
        Alle anderen ({otherStudents.length})
      </summary>
      <div class="space-y-3 mt-4">
        {#each otherStudents as student (student._id)}
          <a
            href="/s/{student._id}"
            class="block bg-surface-container-low p-4 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-outline">person</span>
              <div>
                <h3 class="font-headline font-bold text-sm text-on-surface-variant">{student.name}</h3>
                <p class="text-xs text-outline">{student.lessonSlot || 'Kein Termin'}</p>
              </div>
            </div>
            <span class="material-symbols-outlined text-outline-variant text-sm">chevron_right</span>
          </a>
        {/each}
      </div>
    </details>
  {/if}
</section>
