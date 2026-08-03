/**
 * Format a Date in both Gregorian and Hijri calendars (Arabic) or Gregorian only (English).
 *
 * @param {Date|number} input - Date or timestamp
 * @param {string} lang - 'ar' | 'en'
 * @returns {string}
 */
export function formatDateBilingual(input, lang) {
  const date = input instanceof Date ? input : new Date(input);
  if (lang === 'ar') {
    const gregorian = date.toLocaleString('ar-SA-u-nu-latn', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    try {
      const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
      return `${gregorian} (${hijri})`;
    } catch {
      return gregorian;
    }
  }
  return date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatTimeShort(input, lang) {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleTimeString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHijriToday(lang) {
  if (lang !== 'ar') return '';
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return '';
  }
}
