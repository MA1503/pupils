// src/lib/types.ts

export type Student = {
  _id: string;          // "student:<ulid>"
  _rev?: string;
  type: 'student';
  name: string;         // "Anna Müller"
  lessonSlot: string;   // Freitext: "Mo 17:00, zweiwöchentlich"
  contractStart: string; // ISO-Date: "2024-09-01"
  tariff: string;       // "30min/Woche · 90€/Monat"
  archived?: boolean;   // soft-delete
  createdAt: string;    // ISO-DateTime
  updatedAt: string;
};

export type Song = {
  _id: string;          // "song:<studentUlid>:<songUlid>"
  _rev?: string;
  type: 'song';
  studentId: string;    // "student:<ulid>"
  title: string;        // "Für Elise"
  archived?: boolean;
  createdAt: string;
};

export type Entry = {
  _id: string;          // "entry:<songUlid>:<invTimestamp>:<entryUlid>"
  _rev?: string;
  type: 'entry';
  songId: string;       // "song:<studentUlid>:<songUlid>"
  studentId: string;    // "student:<ulid>"
  entryDate: string;    // ISO-Date, default = heute
  text: string;         // Freitext-Notiz
  createdAt: string;
  updatedAt: string;
};

export type SyncStatus = 'idle' | 'active' | 'paused' | 'error' | 'denied';

export type PupilsConfig = {
  url: string;   // z.B. "https://pi.tailnet.ts.net/couchdb/pupils"
  user: string;  // "teacher"
  pass: string;
};
