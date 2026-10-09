import { describe, it, expect } from 'vitest';
import {
  safeParseNumber,
  formatCurrency,
  normalizeDigits,
  formatPrice,
  formatChange,
} from '../src/utils/numbers.js';

describe('safeParseNumber', () => {
  it('returns null for empty or nullish inputs', () => {
    expect(safeParseNumber('')).toBeNull();
    expect(safeParseNumber(null)).toBeNull();
    expect(safeParseNumber(undefined)).toBeNull();
  });

  it('rejects non-numeric strings strictly', () => {
    expect(safeParseNumber('abc')).toBeNull();
    expect(safeParseNumber('12abc', { integer: true })).toBeNull();
  });

  it('rejects NaN and Infinity', () => {
    expect(safeParseNumber(NaN)).toBeNull();
    expect(safeParseNumber(Infinity)).toBeNull();
    expect(safeParseNumber('Infinity')).toBeNull();
  });

  it('honors min/max bounds', () => {
    expect(safeParseNumber('5', { min: 1, max: 10 })).toBe(5);
    expect(safeParseNumber('0', { min: 1, max: 10 })).toBeNull();
    expect(safeParseNumber('11', { min: 1, max: 10 })).toBeNull();
    expect(safeParseNumber('-5', { min: 1 })).toBeNull();
  });

  it('floors integer parsing', () => {
    expect(safeParseNumber('3.7', { integer: true })).toBe(3);
    expect(safeParseNumber('1.99', { integer: true, min: 1 })).toBe(1);
  });

  it('rejects extremely large values when bounded', () => {
    expect(safeParseNumber('1e20', { max: 1_000_000 })).toBeNull();
  });
});

describe('formatCurrency', () => {
  it('formats in English with default 2 digits', () => {
    expect(formatCurrency(1234.5, 'en', 'SAR')).toMatch(/1,234\.50 SAR/);
  });

  it('formats in Arabic locale', () => {
    const out = formatCurrency(1234.5, 'ar', 'ريال');
    expect(out).toContain('ريال');
  });
});

describe('formatCurrency digit style', () => {
  it('uses Western digits in Arabic so it matches toFixed elsewhere in the UI', () => {
    const out = formatCurrency(12345.67, 'ar', 'ريال');
    expect(out).toContain('12');
    expect(out).toContain('345');
    expect(out).toContain('ريال');
    // No Arabic-Indic digits (U+0660-U+0669).
    expect(/[٠-٩]/.test(out)).toBe(false);
  });

  it('renders the same numeric value in both languages', () => {
    const ar = formatCurrency(1000, 'ar', 'ريال').replace(/[^\d.,]/g, '');
    const en = formatCurrency(1000, 'en', 'SAR').replace(/[^\d.,]/g, '');
    expect(ar).toBe(en);
  });
});

describe('normalizeDigits', () => {
  it('rewrites Arabic-Indic and Eastern Arabic-Indic digits as ASCII', () => {
    expect(normalizeDigits('١٢٣')).toBe('123');
    expect(normalizeDigits('۴۵۶')).toBe('456');
  });

  it('maps the Arabic decimal separator and drops grouping separators', () => {
    expect(normalizeDigits('١٢٫٥')).toBe('12.5');
    expect(normalizeDigits('١٬٠٠٠')).toBe('1000');
    expect(normalizeDigits(' 1,000 ')).toBe('1000');
  });
});

describe('safeParseNumber with Arabic input', () => {
  it('parses a quantity typed on an Arabic keyboard', () => {
    expect(safeParseNumber('١٠٠', { min: 1, integer: true })).toBe(100);
    expect(safeParseNumber('٣٢٫٧٥', { min: 0.01 })).toBe(32.75);
  });

  it('still rejects whitespace-only input', () => {
    expect(safeParseNumber('   ')).toBeNull();
  });
});

describe('formatPrice / formatChange', () => {
  it('formats a price with two decimals and its currency label', () => {
    expect(formatPrice(32.4, 'ريال')).toBe('32.40 ريال');
  });

  it('formats a change as a direction glyph plus magnitude', () => {
    expect(formatChange(1.234)).toBe('▲ 1.23%');
    expect(formatChange(-0.5)).toBe('▼ 0.50%');
  });
});
