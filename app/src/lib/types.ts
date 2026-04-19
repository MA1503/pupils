// src/lib/types.ts

export type Schedule = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;   // ISO: Mo=1 … So=7
  time: string;                            // "HH:MM"
  cadence: 'weekly' | 'biweekly-even' | 'biweekly-odd';
};

export type BillingCard = {
  type: 'card';
  size: number;           // z.B. 10
  charges: Array<{ date: string; source: 'regular' | 'makeup' }>;
};

export type BillingContract = {
  type: 'contract';
  startDate: string;      // ISO-Date
  monthlyRate?: number;
  charges: Array<{ date: string; source: 'regular' | 'makeup' }>;
};

export type BillingFree = {
  type: 'free';
};

export type Billing = BillingCard | BillingContract | BillingFree;

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
  // v1.2.0 additions
  schedule?: Schedule;
  billing?: Billing;
  billingHistory?: Billing[];   // vorherige Modelle bei Wechsel
  makeupDates?: string[];       // ISO-Dates für Nachholtermine
  generalNotes?: GeneralEntry[]; // Allgemeine Einträge (embedded)
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
  remark?: string;      // optionaler Hinweis
  createdAt: string;
  updatedAt: string;
};

// Eintrag ohne songId — für generalNotes (embedded in Student)
export type GeneralEntry = {
  id: string;           // einfache ULID
  entryDate: string;    // ISO-Date
  text: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
};

export type SyncStatus = 'idle' | 'active' | 'paused' | 'error' | 'denied';

export type PupilsConfig = {
  url: string;   // z.B. "https://pi.tailnet.ts.net/couchdb/pupils"
  user: string;  // "teacher"
  pass: string;
};

export type Holiday = {
  _id: string;
  _rev?: string;
  type: 'holiday';
  subtype?: 'public' | 'school';  // undefined = legacy public holidays
  date?: string;       // ISO-Date, single-day public holidays
  dateFrom?: string;   // ISO-Date, school holiday range start
  dateTo?: string;     // ISO-Date, school holiday range end
  name: string;
  source: 'api' | 'manual';
  region: string;
};

export type AppSettings = {
  _id: 'settings:app';
  _rev?: string;
  type: 'settings';
  bundesland?: string;
  holidaysFetchedAt?: string;
  holidaysFetchResult?: 'ok' | 'error';
  holidaysCount?: { public: number; school: number };
};
