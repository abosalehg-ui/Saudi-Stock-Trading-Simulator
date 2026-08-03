/**
 * Filtering and sorting for the stock list.
 *
 * Kept out of the renderer so the rules are unit-testable: the list is 91
 * entries long and, before this existed, the only way to narrow it was the
 * Sharia toggle — even though every stock already carried a `sector` the UI
 * never surfaced.
 */

/** @typedef {'default'|'gainers'|'losers'|'name'} StockSort */

/**
 * Distinct sectors present in the data, in first-seen order.
 *
 * Derived rather than hardcoded so a sector added to src/data/stocks.js shows
 * up in the filter without a second edit here.
 *
 * @param {Array<{sector: string}>} stocks
 * @returns {string[]}
 */
export function listSectors(stocks) {
  return [...new Set(stocks.map((s) => s.sector))];
}

/**
 * Percentage change from the base price, i.e. what the list renders.
 *
 * @param {{symbol: string, basePrice: number}} stock
 * @param {Record<string, number>} prices
 * @returns {number}
 */
function changePercent(stock, prices) {
  const price = prices[stock.symbol];
  if (typeof price !== 'number' || !stock.basePrice) return 0;
  return ((price - stock.basePrice) / stock.basePrice) * 100;
}

/**
 * Normalise for search: case-folded, and with the Arabic orthographic variants
 * that users type interchangeably collapsed. Someone typing "الاهلي" should
 * find "الأهلي", and "الرياض " with a trailing space should still match.
 *
 * @param {string} value
 * @returns {string}
 */
export function normaliseForSearch(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا') // أ إ آ ٱ -> ا
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/[ىي]/g, 'ي') // ى -> ي
    .replace(/[ً-ْـ]/g, ''); // diacritics and tatweel
}

/**
 * @param {object} options
 * @param {Array<any>} options.stocks - the full catalogue
 * @param {Record<string, number>} [options.prices] - symbol -> current price, for the change-based sorts
 * @param {boolean} [options.shariaOnly]
 * @param {string} [options.query] - free text matched against name, English name and symbol
 * @param {string} [options.sector] - '' or 'all' for no sector filter
 * @param {StockSort} [options.sort]
 * @param {'ar'|'en'} [options.lang] - which name the alphabetical sort uses
 * @returns {Array<any>} a new array; the input is never mutated
 */
export function selectStocks({
  stocks,
  prices = {},
  shariaOnly = false,
  query = '',
  sector = 'all',
  sort = 'default',
  lang = 'ar',
}) {
  const needle = normaliseForSearch(query);
  let result = stocks.filter((stock) => {
    if (shariaOnly && !stock.isShariaCompliant) return false;
    if (sector && sector !== 'all' && stock.sector !== sector) return false;
    if (!needle) return true;
    return (
      normaliseForSearch(stock.name).includes(needle) ||
      normaliseForSearch(stock.nameEn).includes(needle) ||
      normaliseForSearch(stock.symbol).includes(needle)
    );
  });

  if (sort === 'gainers' || sort === 'losers') {
    const direction = sort === 'gainers' ? -1 : 1;
    result = [...result].sort(
      (a, b) => direction * (changePercent(a, prices) - changePercent(b, prices))
    );
  } else if (sort === 'name') {
    // localeCompare with the active language, so Arabic names order by the
    // Arabic collation rather than by code point.
    const key = lang === 'en' ? 'nameEn' : 'name';
    result = [...result].sort((a, b) => a[key].localeCompare(b[key], lang));
  }

  return result;
}
