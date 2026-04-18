<script lang="ts">
  import type { Schedule } from '$lib/date';
  
  interface Props {
    value: Schedule | null;
    onchange: (s: Schedule | null) => void;
  }
  
  let { value, onchange }: Props = $props();
  
  const WEEKDAYS = [
    { key: 'Mo', label: 'Mo', value: 1 },
    { key: 'Di', label: 'Di', value: 2 },
    { key: 'Mi', label: 'Mi', value: 3 },
    { key: 'Do', label: 'Do', value: 4 },
    { key: 'Fr', label: 'Fr', value: 5 },
    { key: 'Sa', label: 'Sa', value: 6 },
    { key: 'So', label: 'So', value: 7 }
  ];
  
  const CADENCES = [
    { key: 'weekly', label: 'wöchentlich' },
    { key: 'biweekly-even', label: '2-wöchig gerade KW' },
    { key: 'biweekly-odd', label: '2-wöchig ungerade KW' }
  ];
  
  let weekdayInput = $state('');
  let timeInput = $state('');
  let cadence = $state<Schedule['cadence']>('weekly');
  let showWeekdayDropdown = $state(false);
  let filteredWeekdays = $state(WEEKDAYS);
  
  // Initialize from value prop
  $effect(() => {
    if (value) {
      const day = WEEKDAYS.find(w => w.value === value.weekday);
      weekdayInput = day?.key ?? '';
      timeInput = value.time;
      cadence = value.cadence;
    }
  });
  
  function updateFilteredWeekdays() {
    const input = weekdayInput.toLowerCase();
    filteredWeekdays = WEEKDAYS.filter(w => 
      w.key.toLowerCase().startsWith(input) || 
      w.label.toLowerCase().startsWith(input)
    );
    showWeekdayDropdown = filteredWeekdays.length > 0 && input.length > 0;
  }
  
  function selectWeekday(day: typeof WEEKDAYS[0]) {
    weekdayInput = day.key;
    showWeekdayDropdown = false;
    emitChange();
  }
  
  function parseTime(input: string): string {
    // Try to parse various time formats
    // "17", "17:00", "17.00", "1700", "17 Uhr"
    const cleaned = input.replace(/\s*uhr/gi, '').trim();
    
    // Match HH:MM or HH.MM
    const match = cleaned.match(/^(\d{1,2})[:\.]?(\d{2})$/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = match[2];
      if (hours >= 0 && hours <= 23) {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
    
    // Match just hours
    const hourMatch = cleaned.match(/^(\d{1,2})$/);
    if (hourMatch) {
      const hours = parseInt(hourMatch[1], 10);
      if (hours >= 0 && hours <= 23) {
        return `${hours.toString().padStart(2, '0')}:00`;
      }
    }
    
    return cleaned;
  }
  
  function emitChange() {
    const day = WEEKDAYS.find(w => w.key.toLowerCase() === weekdayInput.toLowerCase());
    if (!day) {
      onchange(null);
      return;
    }
    
    const parsedTime = parseTime(timeInput);
    
    onchange({
      weekday: day.value as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      time: parsedTime,
      cadence
    });
  }
  
  function onWeekdayInput() {
    updateFilteredWeekdays();
    emitChange();
  }
  
  function onTimeInput() {
    emitChange();
  }
  
  function onCadenceChange(newCadence: Schedule['cadence']) {
    cadence = newCadence;
    emitChange();
  }
  
  function handleWeekdayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && filteredWeekdays.length > 0) {
      selectWeekday(filteredWeekdays[0]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      showWeekdayDropdown = false;
    }
  }
</script>

<div class="space-y-3">
  <div class="flex gap-3">
    <!-- Weekday Input -->
    <div class="relative flex-1">
      <input
        bind:value={weekdayInput}
        oninput={onWeekdayInput}
        onkeydown={handleWeekdayKeydown}
        placeholder="Wochentag"
        class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface"
      />
      {#if showWeekdayDropdown}
        <div class="absolute top-full left-0 right-0 mt-1 bg-surface-container-highest rounded-lg shadow-lg z-10 overflow-hidden">
          {#each filteredWeekdays as day}
            <button
              onclick={() => selectWeekday(day)}
              class="w-full px-4 py-2 text-left text-on-surface hover:bg-surface-container-low transition-colors"
            >
              {day.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Time Input -->
    <input
      bind:value={timeInput}
      oninput={onTimeInput}
      placeholder="Uhrzeit"
      class="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface"
    />
  </div>
  
  <!-- Cadence Selector -->
  <div class="flex flex-wrap gap-2">
    {#each CADENCES as c}
      <button
        onclick={() => onCadenceChange(c.key as Schedule['cadence'])}
        class="px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all {cadence === c.key ? 'bg-primary text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}"
      >
        {c.label}
      </button>
    {/each}
  </div>
</div>
