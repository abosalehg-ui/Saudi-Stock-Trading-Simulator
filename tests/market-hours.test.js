import { describe, it, expect } from 'vitest';
import { isMarketOpen, describeNextOpen } from '../src/engine/market-hours.js';

function riyadhDate(year, month, day, hour, minute = 0) {
  return new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`
  );
}

describe('isMarketOpen', () => {
  it('returns false on Friday', () => {
    const friday = riyadhDate(2026, 5, 22, 12, 0);
    expect(isMarketOpen(friday)).toBe(false);
  });

  it('returns false on Saturday', () => {
    const saturday = riyadhDate(2026, 5, 23, 12, 0);
    expect(isMarketOpen(saturday)).toBe(false);
  });

  it('returns true on Sunday at 12:00', () => {
    const sunday = riyadhDate(2026, 5, 17, 12, 0);
    expect(isMarketOpen(sunday)).toBe(true);
  });

  it('returns false on Sunday at 09:00 (before open)', () => {
    const sunday = riyadhDate(2026, 5, 17, 9, 0);
    expect(isMarketOpen(sunday)).toBe(false);
  });

  it('returns false on Sunday at 16:00 (after close)', () => {
    const sunday = riyadhDate(2026, 5, 17, 16, 0);
    expect(isMarketOpen(sunday)).toBe(false);
  });

  it('returns true on Thursday at 11:00', () => {
    const thursday = riyadhDate(2026, 5, 21, 11, 0);
    expect(isMarketOpen(thursday)).toBe(true);
  });
});

describe('describeNextOpen', () => {
  it('describes today when called before open on a trading day', () => {
    const before = riyadhDate(2026, 5, 17, 8, 0);
    expect(describeNextOpen(before, 'en')).toMatch(/Today 10:00/);
  });

  it('describes Sunday when called on a Friday', () => {
    const friday = riyadhDate(2026, 5, 22, 12, 0);
    expect(describeNextOpen(friday, 'en')).toMatch(/Sunday 10:00/);
  });
});
