// src/lib/stores.ts
import { writable, derived } from 'svelte/store';
import type { Student, SyncStatus } from './types';

export const students = writable<Student[]>([]);
export const syncStatus = writable<SyncStatus>('idle');
export const sortKey = writable<'name' | 'contractStart' | 'week'>('name');

const DAY_ORDER: Record<string, number> = {
  Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4, Sa: 5, So: 6
};

function lessonSortKey(slot: string | undefined): number {
  if (!slot) return 9999;
  const parts = slot.trim().split(/\s+/);
  const day = DAY_ORDER[parts[0]] ?? 9;
  const timeParts = (parts[1] ?? '').split(':');
  const minutes = parseInt(timeParts[0] ?? '0') * 60 + parseInt(timeParts[1] ?? '0');
  return day * 10000 + minutes;
}

export const sortedStudents = derived(
  [students, sortKey],
  ([$students, $sortKey]) => {
    return [...$students].sort((a, b) => {
      if ($sortKey === 'name') return a.name.localeCompare(b.name, 'de');
      if ($sortKey === 'contractStart') return a.contractStart.localeCompare(b.contractStart);
      return lessonSortKey(a.lessonSlot) - lessonSortKey(b.lessonSlot);
    });
  }
);
