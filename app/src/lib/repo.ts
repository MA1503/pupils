// src/lib/repo.ts
import { getLocal } from './db';
import { studentId, songId, entryId, now, today, ulidOf } from './ids';
import type { Student, Song, Entry } from './types';

async function putLatest<T extends { _id: string; _rev?: string }>(
  db: PouchDB.Database,
  doc: T
): Promise<PouchDB.Core.Response> {
  const latest = await db.get(doc._id);
  return db.put({ ...doc, _rev: latest._rev });
}

// ---- Students ----

export async function listStudents(includeArchived = false): Promise<Student[]> {
  const result = await getLocal().allDocs<Student>({
    startkey: 'student:',
    endkey: 'student:\ufff0',
    include_docs: true
  });
  return result.rows
    .map(r => r.doc!)
    .filter(d => includeArchived || !d.archived);
}

export async function getStudent(id: string): Promise<Student> {
  return getLocal().get<Student>(id);
}

export async function createStudent(data: Omit<Student, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const doc: Student = {
    _id: studentId(),
    type: 'student',
    createdAt: now(),
    updatedAt: now(),
    ...data
  };
  await getLocal().put(doc);
  return doc;
}

export async function updateStudent(student: Student, changes: Partial<Student>): Promise<Student> {
  const updated = { ...student, ...changes, updatedAt: now() };
  const result = await putLatest(getLocal(), updated);
  return { ...updated, _rev: result.rev };
}

export async function archiveStudent(student: Student): Promise<void> {
  await putLatest(getLocal(), { ...student, archived: true, updatedAt: now() });
}

// ---- Songs ----

export async function listSongs(sid: string): Promise<Song[]> {
  const ulidPart = ulidOf(sid);
  const result = await getLocal().allDocs<Song>({
    startkey: `song:${ulidPart}:`,
    endkey: `song:${ulidPart}:\ufff0`,
    include_docs: true
  });
  return result.rows
    .map(r => r.doc!)
    .filter(d => !d.archived)
    .reverse();
}

export async function createSong(sid: string, title: string): Promise<Song> {
  const doc: Song = {
    _id: songId(sid),
    type: 'song',
    studentId: sid,
    title,
    createdAt: now()
  };
  await getLocal().put(doc);
  return doc;
}

export async function updateSong(song: Song, changes: Partial<Song>): Promise<Song> {
  const updated = { ...song, ...changes };
  const result = await putLatest(getLocal(), updated);
  return { ...updated, _rev: result.rev };
}

export async function archiveSong(song: Song): Promise<void> {
  await putLatest(getLocal(), { ...song, archived: true });
}

// ---- Entries ----

export async function listEntries(sId: string): Promise<Entry[]> {
  // sId ist die Song._id, z.B. "song:01HX...:01HY..."
  // Entry-Prefix nutzt nur den ULID-Teil des Song-IDs (letzter Part)
  const ulidPart = ulidOf(sId);
  const result = await getLocal().allDocs<Entry>({
    startkey: `entry:${ulidPart}:`,
    endkey: `entry:${ulidPart}:\ufff0`,
    include_docs: true
  });
  // Bereits neueste zuerst durch inverted Timestamp in der ID
  return result.rows.map(r => r.doc!);
}

export async function createEntry(sId: string, studentId: string): Promise<Entry> {
  const doc: Entry = {
    _id: entryId(sId),
    type: 'entry',
    songId: sId,
    studentId,
    entryDate: today(),
    text: '',
    createdAt: now(),
    updatedAt: now()
  };
  await getLocal().put(doc);
  return doc;
}

export async function updateEntry(entry: Entry, text: string, remark?: string, entryDate?: string): Promise<Entry> {
  const updated: Entry = {
    ...entry,
    text,
    remark: remark !== undefined ? remark : entry.remark,
    entryDate: entryDate ?? entry.entryDate,
    updatedAt: now()
  };
  const result = await putLatest(getLocal(), updated);
  return { ...updated, _rev: result.rev };
}

export async function deleteEntry(entry: Entry): Promise<void> {
  const db = getLocal();
  const latest = await db.get(entry._id);
  await db.remove(entry._id, latest._rev);
}

// ---- Bibliothek ----

export async function listAllSongs(): Promise<Song[]> {
  const result = await getLocal().allDocs<Song>({
    startkey: 'song:',
    endkey: 'song:\ufff0',
    include_docs: true
  });
  return result.rows
    .map(r => r.doc!)
    .filter(d => d && !d.archived)
    .sort((a, b) => a.title.localeCompare(b.title, 'de'));
}

// ---- Suche ----

export function searchStudents(students: Student[], query: string): Student[] {
  const q = query.toLowerCase().trim();
  if (!q) return students;
  return students.filter(s => s.name.toLowerCase().includes(q));
}
