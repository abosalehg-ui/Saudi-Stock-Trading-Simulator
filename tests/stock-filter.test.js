import { describe, it, expect } from 'vitest';
import { selectStocks, listSectors, normaliseForSearch } from '../src/engine/stock-filter.js';

const CATALOGUE = [
  {
    symbol: '1120',
    name: 'الراجحي',
    nameEn: 'Al Rajhi',
    sector: 'banking',
    basePrice: 100,
    isShariaCompliant: true,
  },
  {
    symbol: '1180',
    name: 'الأهلي',
    nameEn: 'SNB',
    sector: 'banking',
    basePrice: 100,
    isShariaCompliant: false,
  },
  {
    symbol: '2010',
    name: 'سابك',
    nameEn: 'SABIC',
    sector: 'petrochemical',
    basePrice: 100,
    isShariaCompliant: true,
  },
];

/** 1120 up 10%, 1180 down 5%, 2010 flat. */
const PRICES = { 1120: 110, 1180: 95, 2010: 100 };

const select = (options) => selectStocks({ stocks: CATALOGUE, prices: PRICES, ...options });
const symbols = (result) => result.map((s) => s.symbol);

describe('listSectors', () => {
  it('returns each sector once, in first-seen order', () => {
    expect(listSectors(CATALOGUE)).toEqual(['banking', 'petrochemical']);
  });
});

describe('normaliseForSearch', () => {
  it('folds the Arabic alef variants users type interchangeably', () => {
    expect(normaliseForSearch('الأهلي')).toBe(normaliseForSearch('الاهلي'));
  });

  it('folds taa marbuta to haa', () => {
    expect(normaliseForSearch('شركة')).toBe(normaliseForSearch('شركه'));
  });

  it('strips diacritics and tatweel', () => {
    expect(normaliseForSearch('سـابِك')).toBe('سابك');
  });

  it('is case-insensitive for Latin input', () => {
    expect(normaliseForSearch('  SABIC ')).toBe('sabic');
  });
});

describe('selectStocks', () => {
  it('returns everything by default', () => {
    expect(symbols(select({}))).toEqual(['1120', '1180', '2010']);
  });

  it('never mutates the input array', () => {
    const before = [...CATALOGUE];
    select({ sort: 'gainers' });
    expect(CATALOGUE).toEqual(before);
  });

  it('applies the Sharia filter', () => {
    expect(symbols(select({ shariaOnly: true }))).toEqual(['1120', '2010']);
  });

  it('filters by sector', () => {
    expect(symbols(select({ sector: 'banking' }))).toEqual(['1120', '1180']);
  });

  it('treats "all" as no sector filter', () => {
    expect(select({ sector: 'all' })).toHaveLength(3);
  });

  it('matches the Arabic name', () => {
    expect(symbols(select({ query: 'راجح' }))).toEqual(['1120']);
  });

  it('matches the English name regardless of case', () => {
    expect(symbols(select({ query: 'sabic' }))).toEqual(['2010']);
  });

  it('matches the symbol', () => {
    expect(symbols(select({ query: '1180' }))).toEqual(['1180']);
  });

  it('finds a hamza-spelled name typed without the hamza', () => {
    expect(symbols(select({ query: 'الاهلي' }))).toEqual(['1180']);
  });

  it('returns nothing when the query matches no stock', () => {
    expect(select({ query: 'zzzz' })).toEqual([]);
  });

  it('combines the filters', () => {
    expect(symbols(select({ shariaOnly: true, sector: 'banking' }))).toEqual(['1120']);
  });

  it('sorts gainers first', () => {
    expect(symbols(select({ sort: 'gainers' }))).toEqual(['1120', '2010', '1180']);
  });

  it('sorts losers first', () => {
    expect(symbols(select({ sort: 'losers' }))).toEqual(['1180', '2010', '1120']);
  });

  it('sorts alphabetically by the active language name', () => {
    expect(symbols(select({ sort: 'name', lang: 'en' }))).toEqual(['1120', '2010', '1180']);
  });

  it('treats a missing price as no change rather than throwing', () => {
    const result = selectStocks({ stocks: CATALOGUE, prices: {}, sort: 'gainers' });
    expect(result).toHaveLength(3);
  });
});
