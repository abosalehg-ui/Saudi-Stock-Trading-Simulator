import { describe, it, expect } from 'vitest';
import { stocks, findStock } from '../src/data/stocks.js';

describe('stock data integrity', () => {
  it('has no duplicate symbols', () => {
    const symbols = stocks.map((s) => s.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('has no duplicate English names', () => {
    const names = stocks.map((s) => s.nameEn);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every stock has valid simulation parameters', () => {
    stocks.forEach((stock) => {
      expect(typeof stock.symbol, stock.symbol).toBe('string');
      expect(stock.name.length, stock.symbol).toBeGreaterThan(0);
      expect(stock.nameEn.length, stock.symbol).toBeGreaterThan(0);
      expect(typeof stock.sector, stock.symbol).toBe('string');
      expect(Number.isFinite(stock.basePrice) && stock.basePrice > 0, stock.symbol).toBe(true);
      expect(Number.isFinite(stock.mu), stock.symbol).toBe(true);
      expect(Number.isFinite(stock.sigma) && stock.sigma > 0, stock.symbol).toBe(true);
      expect(typeof stock.isShariaCompliant, stock.symbol).toBe('boolean');
    });
  });

  it('uses the correct Tadawul symbols for flagship stocks', () => {
    expect(findStock('1120').nameEn).toBe('Al Rajhi');
    expect(findStock('1180').nameEn).toBe('SNB (Al Ahli)');
    expect(findStock('2222').nameEn).toBe('Aramco');
    expect(findStock('5110').nameEn).toBe('Saudi Electricity');
    expect(findStock('1211').nameEn).toBe('Maaden');
  });
});
