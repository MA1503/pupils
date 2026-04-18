// src/lib/stores.ts
import { writable, derived } from 'svelte/store';
import type { Student, SyncStatus } from './types';

export const students = writable<Student[]>([]);
export const syncStatus = writable<SyncStatus>('idle');
export const sortKey = writable<'name' | 'contractStart' | 'week'>('name');

const DAY_ORDER: Record<string, number> = {
  Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4, Sa: 5, So: 6
};

function timeToMinutes(time: string): number {
  const parts = time.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);
  return hours * 60 + minutes;
}

/**
 * Sort key for lesson slots
 * Uses schedule.weekday and schedule.time if available, falls back to legacy string parsing
 */
export function lessonSortKey(student: Student): number {
  // Prefer structured schedule if available
  if (student.schedule) {
    const weekday = student.schedule.weekday - 1; // Convert ISO (1-7) to 0-6
    const minutes = timeToMinutes(student.schedule.time);
    return weekday * 10000 + minutes;
  }
  
  // Fallback to legacy lessonSlot parsing
  const slot = student.lessonSlot;
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
      return lessonSortKey(a) - lessonSortKey(b);
    });
  }
);
