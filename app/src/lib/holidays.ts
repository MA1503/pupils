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
 * Fetched Ferien von openholidaysapi.org, Fallback ferien-api.de
 * Speichert als holiday:* Docs in PouchDB
 * Fehler werden nur geloggt (kein Throw)
 */
export async function fetchAndStoreHolidays(bundesland: string, db: PouchDB.Database): Promise<void> {
  try {
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const toDate = new Date(now.getFullYear() + 1, 11, 31).toISOString().slice(0, 10);
    
    // Primary: openholidaysapi.org
    const primaryUrl = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${fromDate}&validTo=${toDate}&subdivisionCode=DE-${bundesland}`;
    
    let holidays: Array<{ date: string; name: string }> = [];
    
    try {
      const response = await fetch(primaryUrl);
      if (response.ok) {
        const data = await response.json();
        holidays = data.map((h: { startDate: string; name: Array<{ text: string }> }) => ({
          date: h.startDate,
          name: h.name?.[0]?.text || 'Feiertag'
        }));
      }
    } catch (e) {
      console.log('[holidays] Primary API failed, trying fallback:', e);
    }
    
    // Fallback: ferien-api.de
    if (holidays.length === 0) {
      try {
        const fallbackUrl = `https://ferien-api.de/api/v1/holidays/${bundesland}/${now.getFullYear()}`;
        const response = await fetch(fallbackUrl);
        if (response.ok) {
          const data = await response.json();
          holidays = data.map((h: { start: string; end: string; name: string }) => ({
            date: h.start,
            name: h.name
          }));
        }
      } catch (e) {
        console.log('[holidays] Fallback API also failed:', e);
      }
    }
    
    // Store holidays in PouchDB
    for (const h of holidays) {
      const docId = `holiday:${h.date}`;
      try {
        const existing = await db.get<Holiday>(docId);
        // Don't overwrite manual holidays
        if (existing.source === 'manual') continue;
        
        await db.put({
          ...existing,
          name: h.name,
          region: bundesland
        });
      } catch {
        // Doc doesn't exist, create new
        const holidayDoc: Holiday = {
          _id: docId,
          type: 'holiday',
          date: h.date,
          name: h.name,
          source: 'api',
          region: bundesland
        };
        await db.put(holidayDoc);
      }
    }
    
    // Update settings with fetch timestamp
    await saveSettings(db, { holidaysFetchedAt: new Date().toISOString() });
    
    console.log(`[holidays] Fetched and stored ${holidays.length} holidays for ${bundesland}`);
  } catch (e) {
    console.error('[holidays] Error fetching holidays:', e);
    // Errors are swallowed as per spec
  }
}

/**
 * Gibt Holiday für ein Datum zurück oder null
 */
export async function getHolidayForDate(dateISO: string, db: PouchDB.Database): Promise<Holiday | null> {
  try {
    return await db.get<Holiday>(`holiday:${dateISO}`);
  } catch {
    return null;
  }
}

/**
 * Listet alle Ferien in einem Zeitraum
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
      .filter(h => h.date >= fromISO && h.date <= toISO)
      .sort((a, b) => a.date.localeCompare(b.date));
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
