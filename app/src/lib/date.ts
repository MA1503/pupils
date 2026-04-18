// src/lib/date.ts

export type Schedule = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;   // ISO: Mo=1 … So=7
  time: string;                            // "HH:MM"
  cadence: 'weekly' | 'biweekly-even' | 'biweekly-odd';
};

const WEEKDAY_MAP: Record<string, number> = {
  'mo': 1, 'mo.': 1, 'montag': 1,
  'di': 2, 'di.': 2, 'dienstag': 2,
  'mi': 3, 'mi.': 3, 'mittwoch': 3,
  'do': 4, 'do.': 4, 'donnerstag': 4,
  'fr': 5, 'fr.': 5, 'freitag': 5,
  'sa': 6, 'sa.': 6, 'samstag': 6,
  'so': 7, 'so.': 7, 'sonntag': 7,
  'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7,
  'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7
};

/**
 * Parst lessonSlot-Freitext → strukturiertes Schedule oder null
 * - Wochentag: erkennt "Mo", "Mo.", "Montag", "di", "DI" etc. → ISO-Zahl 1–7
 * - Uhrzeit: "17", "17:00", "17 Uhr", "1700", "17.00" → "HH:MM"
 * - Cadence: sucht im gesamten String nach "zweiwöchentlich", "14-tägig", "alle zwei Wochen"
 *   → prüft dann auf "gerade"/"ungerade" für even/odd; default: "weekly"
 * - Gibt null zurück wenn kein Wochentag erkennbar
 */
export function parseSlotToSchedule(slot: string): Schedule | null {
  if (!slot || !slot.trim()) return null;
  
  const normalized = slot.toLowerCase();
  
  // Find weekday - look for patterns at the start or embedded
  let weekday: number | null = null;
  
  // First, try to match at the start (most common format)
  const startMatch = normalized.match(/^([a-zäöü]+)[\.\s,]*/i);
  if (startMatch) {
    const dayCandidate = startMatch[1].toLowerCase();
    if (WEEKDAY_MAP[dayCandidate] !== undefined) {
      weekday = WEEKDAY_MAP[dayCandidate];
    }
  }
  
  // If no weekday found at start, search anywhere in the string
  if (!weekday) {
    for (const [key, value] of Object.entries(WEEKDAY_MAP)) {
      if (normalized.includes(key)) {
        weekday = value;
        break;
      }
    }
  }
  
  if (!weekday) return null;
  
  // Find time - various formats
  let time = '';
  
  // Match "HH:MM" or "H:MM"
  const timeMatch = normalized.match(/(\d{1,2})[:\.]?(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    if (hours >= 0 && hours <= 23) {
      time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  }
  
  // Also try to match just "17" or "17 Uhr"
  if (!time) {
    const simpleTimeMatch = normalized.match(/(\d{1,2})(?:\s*uhr|\s*h)?/i);
    if (simpleTimeMatch) {
      const hours = parseInt(simpleTimeMatch[1], 10);
      if (hours >= 0 && hours <= 23) {
        time = `${hours.toString().padStart(2, '0')}:00`;
      }
    }
  }
  
  // Default to empty time if not found
  if (!time) time = '';
  
  // Determine cadence
  let cadence: Schedule['cadence'] = 'weekly';
  
  const biweeklyPatterns = /zweiwöchentlich|14-tägig|14tägig|alle\s+2\s*wochen|alle\s+zwei\s*wochen|bi-?weekly/;
  if (biweeklyPatterns.test(normalized)) {
    if (normalized.includes('gerade') || normalized.includes('even')) {
      cadence = 'biweekly-even';
    } else if (normalized.includes('ungerade') || normalized.includes('odd')) {
      cadence = 'biweekly-odd';
    } else {
      // Default to even if not specified (could be improved with date context)
      cadence = 'biweekly-even';
    }
  }
  
  return {
    weekday: weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    time,
    cadence
  };
}

/**
 * ISO-Wochennummer (keine externe Dependency)
 * Algorithmus nach ISO 8601
 */
export function getISOWeek(date: Date): number {
  const tmpDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmpDate.getUTCDay() || 7;
  tmpDate.setUTCDate(tmpDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmpDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmpDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 'even' wenn KW gerade, 'odd' wenn ungerade
 */
export function weekParity(date: Date): 'even' | 'odd' {
  return getISOWeek(date) % 2 === 0 ? 'even' : 'odd';
}
