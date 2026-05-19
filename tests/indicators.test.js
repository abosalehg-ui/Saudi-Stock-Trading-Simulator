import { describe, it, expect } from 'vitest';
import { sma, ema, rsi, macd } from '../src/engine/indicators.js';

describe('sma', () => {
  it('returns nulls before period is reached', () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
    expect(out[4]).toBeCloseTo(4);
  });

  it('returns all nulls when length < period', () => {
    expect(sma([1, 2], 3)).toEqual([null, null]);
  });
});

describe('ema', () => {
  it('seeds with SMA and then applies the EMA formula', () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
    expect(out[4]).toBeCloseTo(4);
  });
});

describe('rsi', () => {
  it('reaches 100 on continuously rising prices', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
    const out = rsi(prices, 14);
    expect(out[29]).toBe(100);
  });

  it('reaches 0 on continuously falling prices', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 - i);
    const out = rsi(prices, 14);
    expect(out[29]).toBeCloseTo(0);
  });
});

describe('macd', () => {
  it('produces non-null values once enough data exists', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 10);
    const { macd: line, signal, histogram } = macd(prices);
    expect(line[59]).not.toBeNull();
    expect(signal[59]).not.toBeNull();
    expect(histogram[59]).not.toBeNull();
  });
});
