import { describe, it, expect } from 'vitest';
import { safeParseNumber, formatCurrency } from '../src/utils/numbers.js';

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
