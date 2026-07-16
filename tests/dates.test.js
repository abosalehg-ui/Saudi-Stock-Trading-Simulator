import { describe, it, expect } from 'vitest';
import { formatDateBilingual, formatTimeShort, formatHijriToday } from '../src/utils/dates.js';

const SAMPLE = new Date('2024-03-15T14:30:00Z');

describe('formatDateBilingual', () => {
  it('includes a Hijri date alongside the Gregorian one for Arabic', () => {
    const result = formatDateBilingual(SAMPLE, 'ar');
    expect(result).toContain('(');
    expect(result).toContain(')');
  });

  it('returns Gregorian-only for English, no parenthetical', () => {
    const result = formatDateBilingual(SAMPLE, 'en');
    expect(result).not.toContain('(');
  });

  it('accepts a timestamp number as well as a Date', () => {
    const fromDate = formatDateBilingual(SAMPLE, 'en');
    const fromTimestamp = formatDateBilingual(SAMPLE.getTime(), 'en');
    expect(fromTimestamp).toBe(fromDate);
  });
});

describe('formatTimeShort', () => {
  it('formats a time string with hour and minute', () => {
    const result = formatTimeShort(SAMPLE, 'en');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('accepts a timestamp number as well as a Date', () => {
    const fromDate = formatTimeShort(SAMPLE, 'en');
    const fromTimestamp = formatTimeShort(SAMPLE.getTime(), 'en');
    expect(fromTimestamp).toBe(fromDate);
  });
});

describe('formatHijriToday', () => {
  it('returns empty string for non-Arabic languages', () => {
    expect(formatHijriToday('en')).toBe('');
  });

  it('returns a non-empty Hijri date string for Arabic', () => {
    const result = formatHijriToday('ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
