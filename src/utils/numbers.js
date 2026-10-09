/**
 * Rewrite Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits as ASCII,
 * map the Arabic decimal separator (٫) to '.', and drop grouping separators.
 *
 * Arabic keyboards type these digits by default, and `Number('١٠٠')` is NaN,
 * so without this a correct quantity was rejected as invalid.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeDigits(text) {
  return String(text)
    .trim()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066b/g, '.')
    .replace(/[\u066c,]/g, '');
}

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

  if (raw === null || raw === undefined) return null;
  const text = typeof raw === 'number' ? String(raw) : normalizeDigits(raw);
  if (text === '') return null;

  const parsed = Number(text);
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

/**
 * Direction glyph + CSS class for a signed value.
 *
 * The arrow rather than a bare sign is deliberate: direction must not depend on
 * colour alone. Centralised because the list, the ticker, the portfolio, the
 * pending orders and the P&L card each rebuilt the same ternary pair.
 *
 * @param {number} value
 * @returns {{glyph: string, className: 'positive'|'negative'}}
 */
export function direction(value) {
  return value >= 0 ? { glyph: '▲', className: 'positive' } : { glyph: '▼', className: 'negative' };
}

/**
 * A price as shown in the stock list, the details panel and the portfolio.
 * @param {number} price
 * @param {string} suffix - the localised currency label, t('sar')
 * @returns {string}
 */
export function formatPrice(price, suffix) {
  return `${price.toFixed(2)} ${suffix}`;
}

/**
 * A signed percentage as a direction glyph plus magnitude, e.g. "▲ 1.25%".
 * @param {number} percent
 * @returns {string}
 */
export function formatChange(percent) {
  return `${direction(percent).glyph} ${Math.abs(percent).toFixed(2)}%`;
}
