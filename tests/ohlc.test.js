import { describe, it, expect } from 'vitest';
import { buildOHLC } from '../src/engine/ohlc.js';

describe('buildOHLC', () => {
  it('returns empty array for empty input', () => {
    expect(buildOHLC([])).toEqual([]);
    expect(buildOHLC(null)).toEqual([]);
  });

  it('buckets prices into candles', () => {
    const history = [
      { time: 1, price: 10 },
      { time: 2, price: 12 },
      { time: 3, price: 11 },
      { time: 4, price: 13 },
      { time: 5, price: 14 },
      { time: 6, price: 9 },
      { time: 7, price: 11 },
    ];
    const candles = buildOHLC(history, 3);
    expect(candles).toHaveLength(3);
    expect(candles[0]).toEqual({ time: 1, open: 10, high: 12, low: 10, close: 11 });
    expect(candles[1]).toEqual({ time: 4, open: 13, high: 14, low: 9, close: 9 });
    expect(candles[2]).toEqual({ time: 7, open: 11, high: 11, low: 11, close: 11 });
  });

  it('handles a single-point bucket', () => {
    const candles = buildOHLC([{ time: 1, price: 50 }], 5);
    expect(candles).toHaveLength(1);
    expect(candles[0]).toEqual({ time: 1, open: 50, high: 50, low: 50, close: 50 });
  });
});
