// src/lib/stores.ts
import { writable, derived } from 'svelte/store';
import type { Student, SyncStatus } from './types';

export const students = writable<Student[]>([]);
export const syncStatus = writable<SyncStatus>('idle');
export const sortKey = writable<'name' | 'contractStart'>('name');

export const sortedStudents = derived(
  [students, sortKey],
  ([$students, $sortKey]) => {
    return [...$students].sort((a, b) => {
      if ($sortKey === 'name') return a.name.localeCompare(b.name, 'de');
      return a.contractStart.localeCompare(b.contractStart);
    });
  }
);
