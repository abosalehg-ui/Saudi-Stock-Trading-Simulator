/**
 * Safely parse a numeric input with strict bounds.
 * Returns null if the value isn't a finite number within the [min, max] range.
 *
 * @param {string|number} raw
 * @param {{ min?: number, max?: number, integer?: boolean }} opts
 * @returns {number|null}
 */
export function safeParseNumber(raw, opts = {}) {
  const { min = -Infinity, max = Infinity, integer = false } = opts;

  if (raw === null || raw === undefined || raw === '') return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  const num = integer ? Math.floor(parsed) : parsed;

  if (num < min || num > max) return null;
  return num;
}

/**
 * Format a number as SAR currency in the current locale.
 * @param {number} value
 * @param {string} lang - 'ar' | 'en'
 * @param {string} suffix - 'ريال' | 'SAR'
 * @param {number} digits - decimal places, default 2
 * @returns {string}
 */
export function formatCurrency(value, lang, suffix, digits = 2) {
  // -u-nu-latn keeps Arabic grouping/decimal separators but forces Western
  // digits. Plain 'ar-SA' resolves to the `arab` numbering system, which put
  // ١٢٬٣٤٥٫٦٧ in three stat cards while the adjacent P&L card, built with
  // toFixed, showed 12345.67.
  const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
  const formatted = Number(value).toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${formatted} ${suffix}`;
}
