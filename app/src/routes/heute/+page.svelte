<script lang="ts">
  import { onMount } from 'svelte';
  import { listStudents } from '$lib/repo';
  import { getLocal } from '$lib/db';
  import type { Student, Holiday } from '$lib/types';
  import { getISOWeek, weekParity } from '$lib/date';
  import { getHolidayForDate as getHoliday } from '$lib/holidays';

  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const ISO_WEEKDAYS = [7, 1, 2, 3, 4, 5, 6]; // Sunday=7, Monday=1, etc.

  let allStudents = $state<Student[]>([]);
  let loading = $state(true);
  let todayHoliday = $state<Holiday | null>(null);

  const today = new Date();
  const todayAbbr = DAYS[today.getDay()];
  const todayISO = today.toISOString().slice(0, 10);
  const todayWeekday = ISO_WEEKDAYS[today.getDay()];
  const todayKW = getISOWeek(today);
  const todayParity = weekParity(today);

  onMount(async () => {
    allStudents = await listStudents();
    todayHoliday = await getHoliday(todayISO, getLocal());
    loading = false;
  });

  function matchesSchedule(student: Student): boolean {
    if (!student.schedule) {
      // Fallback: alter Freitext-Match
      return student.lessonSlot?.trimStart().startsWith(DAYS[today.getDay()]) ?? false;
    }
    if (student.schedule.weekday !== todayWeekday) return false;
    const { cadence } = student.schedule;
    if (cadence === 'weekly') return true;
    if (cadence === 'biweekly-even') return todayParity === 'even';
    if (cadence === 'biweekly-odd') return todayParity === 'odd';
    return false;
  }

  // Filter today students based on schedule or makeup dates
  const todayStudents = $derived(
    allStudents.filter(s => {
      if (s.archived) return false;
      const regularMatch = matchesSchedule(s);
      const makeupMatch = s.makeupDates?.includes(todayISO);
      return regularMatch || makeupMatch;
    })
  );

  const otherStudents = $derived(
    allStudents.filter(s => !s.archived && !matchesSchedule(s) && !s.makeupDates?.includes(todayISO))
  );

  // Find next school day with students
  const nextSchoolDay = $derived(() => {
    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const nextISO = nextDate.toISOString().slice(0, 10);
      const nextWeekday = ISO_WEEKDAYS[nextDate.getDay()];
      const nextParity = weekParity(nextDate);
      
      const studentsThatDay = allStudents.filter(s => {
        if (s.archived) return false;
        // Check if it's a holiday
        // Note: We can't check async here, so we'll rely on schedule matching
        if (s.schedule && s.schedule.weekday === nextWeekday) {
          const { cadence } = s.schedule;
          if (cadence === 'weekly') return true;
          if (cadence === 'biweekly-even') return nextParity === 'even';
          if (cadence === 'biweekly-odd') return nextParity === 'odd';
        }
        return false;
      });
      
      if (studentsThatDay.length > 0) {
        return {
          date: nextDate,
          dateStr: nextDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }),
          students: studentsThatDay
        };
      }
    }
    return null;
  });

  const nextDayInfo = $derived(nextSchoolDay());
</script>

<section class="space-y-6">
  <div>
    <h2 class="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
      {DAYS[today.getDay()]}, {today.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
    </h2>
    <p class="text-sm text-outline mt-1">Unterricht heute</p>
  </div>

  {#if loading}
    <p class="text-center text-outline py-12">Laden…</p>
  {:else if todayHoliday}
    <!-- Holiday State -->
    <div class="bg-surface-container-highest p-8 rounded-2xl text-center">
      <span class="material-symbols-outlined text-outline text-4xl block mb-3">event_available</span>
      <p class="text-on-surface-variant font-headline font-bold text-lg">Ferien · {todayHoliday.name}</p>
      <p class="text-sm text-outline mt-2">Kein Unterricht heute.</p>
    </div>
  {:else if todayStudents.length === 0}
    <!-- Empty State - No lessons today -->
    <div class="bg-surface-container-highest p-8 rounded-2xl text-center">
      <span class="material-symbols-outlined text-outline text-4xl block mb-3">event_available</span>
      <p class="text-on-surface-variant font-headline font-bold text-lg">Heute kein Unterricht</p>
    </div>
    
    <!-- Next school day info -->
    {#if nextDayInfo}
      <div class="mt-6">
        <p class="text-[11px] uppercase tracking-[0.2em] text-outline font-bold mb-4">
          Nächstes Mal · {nextDayInfo.dateStr}
        </p>
        <div class="flex flex-col gap-3">
          {#each nextDayInfo.students as student (student._id)}
            <a
              href="/s/{student._id}"
              class="block bg-surface-container-highest p-5 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div class="flex items-center gap-4">
                <div class="h-11 w-11 rounded-full bg-surface-container-low flex items-center justify-center border border-outline-variant/20">
                  <span class="material-symbols-outlined text-outline">person</span>
                </div>
                <div>
                  <h3 class="font-headline font-bold text-on-surface">{student.name}</h3>
                  <p class="text-sm text-outline">
                    {student.schedule?.time || student.lessonSlot || 'Kein Termin'}
                  </p>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <!-- Students today -->
    <div class="flex flex-col gap-4">
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
              <p class="text-sm text-outline">
                {student.schedule?.time || student.lessonSlot}
                {#if student.makeupDates?.includes(todayISO)}
                  <span class="text-primary font-bold"> · Nachholtermin</span>
                {/if}
              </p>
            </div>
          </div>
          <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
        </a>
      {/each}
    </div>
  {/if}

  {#if otherStudents.length > 0 && !loading && !todayHoliday}
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
