import {
  MARKET_TIMEZONE,
  MARKET_OPEN_HOUR,
  MARKET_CLOSE_HOUR,
  MARKET_OPEN_DAYS,
} from '../config.js';

/**
 * Get the current hour and weekday in the Saudi market timezone.
 * Uses Intl.DateTimeFormat for DST/timezone-correct parsing.
 *
 * @param {Date} now
 * @returns {{ hour: number, minute: number, weekday: number }}
 */
function getRiyadhTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKET_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);

  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = parseInt(lookup.hour, 10);
  return {
    hour: hour === 24 ? 0 : hour,
    minute: parseInt(lookup.minute, 10),
    weekday: weekdayMap[lookup.weekday] ?? 0,
  };
}

/**
 * @param {Date} now
 * @returns {boolean}
 */
export function isMarketOpen(now = new Date()) {
  const { hour, weekday } = getRiyadhTime(now);
  if (!MARKET_OPEN_DAYS.includes(weekday)) return false;
  return hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR;
}

/**
 * Compute next market open time as an ISO-ish description for the UI.
 * Returns a short string in the requested language describing when the market opens next.
 *
 * @param {Date} now
 * @param {string} lang - 'ar' | 'en'
 * @returns {string}
 */
export function describeNextOpen(now = new Date(), lang = 'ar') {
  const { hour, weekday } = getRiyadhTime(now);
  const dayNames =
    lang === 'ar'
      ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (MARKET_OPEN_DAYS.includes(weekday) && hour < MARKET_OPEN_HOUR) {
    return `${lang === 'ar' ? 'اليوم' : 'Today'} ${MARKET_OPEN_HOUR}:00`;
  }

  for (let i = 1; i <= 7; i++) {
    const next = (weekday + i) % 7;
    if (MARKET_OPEN_DAYS.includes(next)) {
      return `${dayNames[next]} ${MARKET_OPEN_HOUR}:00`;
    }
  }
  return '';
}
