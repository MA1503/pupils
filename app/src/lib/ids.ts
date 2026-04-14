// src/lib/ids.ts
import { ulid } from 'ulid';

/** Extrahiert den ULID-Teil aus einer prefixed ID */
export function ulidOf(prefixedId: string): string {
  const parts = prefixedId.split(':');
  return parts[parts.length - 1];
}

/** "student:01HX..." */
export function studentId(): string {
  return `student:${ulid()}`;
}

/** "song:<studentUlid>:<songUlid>" */
export function songId(studentId: string): string {
  return `song:${ulidOf(studentId)}:${ulid()}`;
}

/**
 * "entry:<songUlid>:<invTimestamp>:<entryUlid>"
 * invTimestamp = (9999999999999 - Date.now()).toString().padStart(13,'0')
 * → ASC-Sort in allDocs liefert neueste Einträge ZUERST
 */
export function entryId(songId: string): string {
  const inv = (9999999999999 - Date.now()).toString().padStart(13, '0');
  return `entry:${ulidOf(songId)}:${inv}:${ulid()}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
