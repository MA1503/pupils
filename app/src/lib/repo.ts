// src/lib/repo.ts
import { getLocal } from './db';
import { ulid } from 'ulid';
import { studentId, songId, entryId, now, today, ulidOf } from './ids';
import type { Student, Song, Entry, Billing, GeneralEntry } from './types';

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

// ---- Billing ----

/**
 * Bucht eine reguläre Stunde auf das Abrechnungsmodell
 * Nur bei card oder contract
 */
export async function chargeLesson(student: Student): Promise<Student> {
  if (!student.billing || student.billing.type === 'free') {
    return student;
  }
  
  const charge = { date: today(), source: 'regular' as const };
  
  const updatedBilling: Billing = {
    ...student.billing,
    charges: [...(student.billing.charges || []), charge]
  };
  
  return updateStudent(student, { billing: updatedBilling });
}

/**
 * Fügt ein Nachholtermin-Datum hinzu
 */
export async function addMakeupDate(student: Student, slot: { date: string; time?: string }): Promise<Student> {
  const entry: import('./types').MakeupSlot | string = slot.time ? slot : slot.date;
  const updatedMakeupDates = [...(student.makeupDates || []), entry];
  return updateStudent(student, { makeupDates: updatedMakeupDates });
}

/**
 * Wechselt das Abrechnungsmodell
 * Schiebt altes billing in billingHistory
 */
export async function switchBilling(student: Student, newBilling: Billing): Promise<Student> {
  const updatedHistory = [...(student.billingHistory || [])];
  if (student.billing && student.billing.type !== 'free') {
    updatedHistory.push({ ...student.billing, endedAt: today() });
  }

  return updateStudent(student, {
    billing: newBilling,
    billingHistory: updatedHistory
  });
}

/** Zählt Songs und Notizen eines Schülers (inkl. archivierter) — für den Lösch-Dialog */
export async function countStudentData(sid: string): Promise<{ songs: number; entries: number }> {
  const db = getLocal();
  const ulidPart = ulidOf(sid);
  const songs = await db.allDocs({ startkey: `song:${ulidPart}:`, endkey: `song:${ulidPart}:\ufff0` });
  let entries = 0;
  for (const row of songs.rows) {
    const songUlid = ulidOf(row.id);
    const e = await db.allDocs({ startkey: `entry:${songUlid}:`, endkey: `entry:${songUlid}:\ufff0` });
    entries += e.rows.length;
  }
  return { songs: songs.rows.length, entries };
}

/**
 * Löscht einen Schüler endgültig, samt aller Songs und Notizen (Kaskade).
 * Die Löschungen replizieren als Tombstones zur CouchDB und auf andere Geräte.
 */
export async function deleteStudentCascade(student: Student): Promise<void> {
  const db = getLocal();
  const ulidPart = ulidOf(student._id);
  const toDelete: Array<{ _id: string; _rev: string; _deleted: true }> = [];

  const songs = await db.allDocs({ startkey: `song:${ulidPart}:`, endkey: `song:${ulidPart}:\ufff0` });
  for (const row of songs.rows) {
    const songUlid = ulidOf(row.id);
    const e = await db.allDocs({ startkey: `entry:${songUlid}:`, endkey: `entry:${songUlid}:\ufff0` });
    for (const er of e.rows) toDelete.push({ _id: er.id, _rev: er.value.rev, _deleted: true });
    toDelete.push({ _id: row.id, _rev: row.value.rev, _deleted: true });
  }

  const latest = await db.get(student._id);
  toDelete.push({ _id: latest._id, _rev: latest._rev, _deleted: true });
  await db.bulkDocs(toDelete);
}

// ---- General Entries (embedded in Student) ----

export async function addGeneralEntry(student: Student, text: string, remark?: string): Promise<Student> {
  const entry: GeneralEntry = {
    id: ulid(),
    entryDate: today(),
    text,
    remark,
    createdAt: now(),
    updatedAt: now()
  };
  
  const updatedNotes = [...(student.generalNotes || []), entry];
  return updateStudent(student, { generalNotes: updatedNotes });
}

export async function updateGeneralEntry(student: Student, entryId: string, text: string, remark?: string): Promise<Student> {
  const updatedNotes = (student.generalNotes || []).map(e => 
    e.id === entryId 
      ? { ...e, text, remark, updatedAt: now() }
      : e
  );
  return updateStudent(student, { generalNotes: updatedNotes });
}

export async function deleteGeneralEntry(student: Student, entryId: string): Promise<Student> {
  const updatedNotes = (student.generalNotes || []).filter(e => e.id !== entryId);
  return updateStudent(student, { generalNotes: updatedNotes });
}
