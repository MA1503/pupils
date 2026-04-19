// src/lib/holidays.ts
import type { Holiday, AppSettings } from './types';

export const BUNDESLAENDER: Record<string, string> = {
  'BW': 'Baden-Württemberg', 'BY': 'Bayern', 'BE': 'Berlin',
  'BB': 'Brandenburg', 'HB': 'Bremen', 'HH': 'Hamburg',
  'HE': 'Hessen', 'MV': 'Mecklenburg-Vorpommern', 'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen', 'RP': 'Rheinland-Pfalz', 'SL': 'Saarland',
  'SN': 'Sachsen', 'ST': 'Sachsen-Anhalt', 'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen'
};

const SETTINGS_ID = 'settings:app';

/**
 * Lädt Settings aus PouchDB (erstellt Doc falls nicht vorhanden)
 */
export async function loadSettings(db: PouchDB.Database): Promise<AppSettings> {
  try {
    const doc = await db.get<AppSettings>(SETTINGS_ID);
    return doc;
  } catch {
    // Create default settings
    const defaultSettings: AppSettings = {
      _id: SETTINGS_ID,
      type: 'settings'
    };
    await db.put(defaultSettings);
    return defaultSettings;
  }
}

/**
 * Speichert Settings-Änderungen
 */
export async function saveSettings(db: PouchDB.Database, changes: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings(db);
  const updated: AppSettings = {
    ...current,
    ...changes,
    _id: SETTINGS_ID
  };
  await db.put(updated);
  return updated;
}

/**
 * Fetches public holidays (openholidaysapi.org) and school holidays (schulferien-api.de)
 * Stores as holiday:* docs in PouchDB. Errors are logged but not thrown.
 */
export async function fetchAndStoreHolidays(bundesland: string, db: PouchDB.Database): Promise<void> {
  let publicCount = 0;
  let schoolCount = 0;
  let fetchOk = true;

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const fromDate = new Date(currentYear, 0, 1).toISOString().slice(0, 10);
    const toDate = new Date(currentYear + 1, 11, 31).toISOString().slice(0, 10);

    // --- Public holidays: openholidaysapi.org ---
    let publicHolidays: Array<{ date: string; name: string }> = [];
    try {
      const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${fromDate}&validTo=${toDate}&subdivisionCode=DE-${bundesland}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        publicHolidays = data.map((h: { startDate: string; name: Array<{ text: string }> }) => ({
          date: h.startDate,
          name: h.name?.[0]?.text || 'Feiertag'
        }));
      }
    } catch (e) {
      console.log('[holidays] Public API failed:', e);
      fetchOk = false;
    }

    for (const h of publicHolidays) {
      const docId = `holiday:${h.date}`;
      try {
        const existing = await db.get<Holiday>(docId);
        if (existing.source === 'manual') continue;
        await db.put({ ...existing, name: h.name, subtype: 'public', region: bundesland });
      } catch {
        await db.put({
          _id: docId, type: 'holiday', subtype: 'public',
          date: h.date, name: h.name, source: 'api', region: bundesland
        } as Holiday);
      }
      publicCount++;
    }

    // --- School holidays: schulferien-api.de ---
    for (const year of [currentYear, currentYear + 1]) {
      try {
        const url = `https://schulferien-api.de/api/v2/${year}?states=${bundesland}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data: Array<{ start: string; end: string; name_cp: string }> = await res.json();
        for (const h of data) {
          const dateFrom = h.start.slice(0, 10);
          const dateTo = h.end.slice(0, 10);
          const docId = `holiday:school:${dateFrom}:${dateTo}`;
          try {
            const existing = await db.get<Holiday>(docId);
            await db.put({ ...existing, name: h.name_cp, region: bundesland });
          } catch {
            await db.put({
              _id: docId, type: 'holiday', subtype: 'school',
              dateFrom, dateTo, name: h.name_cp, source: 'api', region: bundesland
            } as Holiday);
          }
          schoolCount++;
        }
      } catch (e) {
        console.log(`[holidays] School holidays ${year} failed:`, e);
        fetchOk = false;
      }
    }

    await saveSettings(db, {
      holidaysFetchedAt: new Date().toISOString(),
      holidaysFetchResult: fetchOk ? 'ok' : 'error',
      holidaysCount: { public: publicCount, school: schoolCount }
    });
  } catch (e) {
    console.error('[holidays] Error fetching holidays:', e);
    await saveSettings(db, { holidaysFetchResult: 'error' }).catch(() => {});
  }
}

/**
 * Returns Holiday for a given date, checking both single-day and range docs
 */
export async function getHolidayForDate(dateISO: string, db: PouchDB.Database): Promise<Holiday | null> {
  // Check single-day public holiday first
  try {
    const doc = await db.get<Holiday>(`holiday:${dateISO}`);
    return doc;
  } catch { /* not found */ }

  // Check school holiday ranges
  try {
    const result = await db.allDocs<Holiday>({
      startkey: 'holiday:school:',
      endkey: 'holiday:school:\ufff0',
      include_docs: true
    });
    const match = result.rows
      .map(r => r.doc!)
      .find(h => h.dateFrom && h.dateTo && dateISO >= h.dateFrom && dateISO <= h.dateTo);
    return match ?? null;
  } catch {
    return null;
  }
}

/**
 * Lists all holidays in a date range, including single-day and range docs
 */
export async function listHolidays(fromISO: string, toISO: string, db: PouchDB.Database): Promise<Holiday[]> {
  try {
    const result = await db.allDocs<Holiday>({
      startkey: 'holiday:',
      endkey: 'holiday:\ufff0',
      include_docs: true
    });
    return result.rows
      .map(r => r.doc!)
      .filter(h => {
        if (h.subtype === 'school' || (!h.date && h.dateFrom)) {
          // Range doc: overlaps with requested window
          return h.dateFrom! <= toISO && h.dateTo! >= fromISO;
        }
        // Single-day doc
        const d = h.date ?? '';
        return d >= fromISO && d <= toISO;
      })
      .sort((a, b) => {
        const da = a.date ?? a.dateFrom ?? '';
        const db2 = b.date ?? b.dateFrom ?? '';
        return da.localeCompare(db2);
      });
  } catch {
    return [];
  }
}

/**
 * Fügt einen manuellen Feiertag hinzu
 */
export async function addManualHoliday(dateISO: string, name: string, bundesland: string, db: PouchDB.Database): Promise<Holiday> {
  const docId = `holiday:${dateISO}`;
  
  const holiday: Holiday = {
    _id: docId,
    type: 'holiday',
    date: dateISO,
    name,
    source: 'manual',
    region: bundesland
  };
  
  try {
    const existing = await db.get<Holiday>(docId);
    await db.put({ ...holiday, _rev: existing._rev });
  } catch {
    await db.put(holiday);
  }
  
  return holiday;
}

/**
 * Entfernt einen Feiertag
 */
export async function removeHoliday(dateISO: string, db: PouchDB.Database): Promise<void> {
  try {
    const doc = await db.get<Holiday>(`holiday:${dateISO}`);
    await db.remove(doc._id, doc._rev!);
  } catch {
    // Ignore errors (already deleted or doesn't exist)
  }
}
