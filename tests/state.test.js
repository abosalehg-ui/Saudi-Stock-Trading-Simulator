import { describe, it, expect, beforeEach } from 'vitest';
import {
  gameState,
  resetGameState,
  loadGameState,
  saveGameState,
  stockPrices,
  priceHistory,
  savePriceState,
  loadPriceState,
  loadStats,
  resetStats,
  personalStats,
} from '../src/state.js';
import { STORAGE_KEY, PRICES_STORAGE_KEY } from '../src/config.js';

beforeEach(() => {
  resetGameState();
});

describe('loadGameState', () => {
  it('does nothing when storage is empty', () => {
    loadGameState();
    expect(gameState.cash).toBe(50000);
  });

  it('recovers from malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    loadGameState();
    expect(gameState.cash).toBe(50000);
    expect(Array.isArray(gameState.pendingOrders)).toBe(true);
  });

  it('merges a saved game over defaults', () => {
    saveGameState();
    gameState.cash = 12345;
    gameState.shariaFilter = true;
    saveGameState();
    resetGameState();
    loadGameState();
    expect(gameState.cash).toBe(12345);
    expect(gameState.shariaFilter).toBe(true);
  });

  it('repairs missing arrays/objects', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cash: 100 }));
    loadGameState();
    expect(gameState.cash).toBe(100);
    expect(gameState.pendingOrders).toEqual([]);
    expect(gameState.portfolio).toEqual({});
    expect(gameState.priceImpacts).toEqual({});
  });

  it('backfills ids on pending orders from older saves', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pendingOrders: [
          { symbol: '1180', type: 'buy', kind: 'limit', quantity: 5, limitPrice: 80 },
        ],
      })
    );
    loadGameState();
    expect(gameState.pendingOrders).toHaveLength(1);
    expect(gameState.pendingOrders[0].id).toBeDefined();
  });
});

describe('sanitizeLoadedState (via loadGameState)', () => {
  it('falls back to defaults for corrupt numeric fields', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cash: 'abc', initialCapital: null, speed: 7 })
    );
    loadGameState();
    expect(gameState.cash).toBe(50000);
    expect(gameState.initialCapital).toBe(50000);
    expect(gameState.speed).toBe(1);
  });

  it('drops corrupt or unknown-symbol portfolio entries', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        portfolio: {
          1120: { quantity: 10, avgCost: 80 },
          9999: { quantity: 5, avgCost: 20 },
          2222: { quantity: 'abc', avgCost: 30 },
          2010: { quantity: -3, avgCost: 30 },
        },
      })
    );
    loadGameState();
    expect(gameState.portfolio).toEqual({ 1120: { quantity: 10, avgCost: 80 } });
  });

  it('drops pending orders with invalid prices or unknown symbols', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pendingOrders: [
          { symbol: '1120', type: 'buy', kind: 'limit', quantity: 5, limitPrice: 80 },
          { symbol: '1120', type: 'buy', kind: 'limit', quantity: 5, limitPrice: 'x' },
          { symbol: '9999', type: 'buy', kind: 'limit', quantity: 5, limitPrice: 80 },
          { symbol: '1120', type: 'hack', kind: 'limit', quantity: 5, limitPrice: 80 },
        ],
      })
    );
    loadGameState();
    expect(gameState.pendingOrders).toHaveLength(1);
    expect(gameState.pendingOrders[0].limitPrice).toBe(80);
  });

  it('ignores unknown extra keys instead of merging them', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cash: 100, injected: 'evil' }));
    loadGameState();
    expect(gameState.injected).toBeUndefined();
  });
});

describe('price persistence', () => {
  it('round-trips prices and history across a reload', () => {
    stockPrices['2222'] = 91.25;
    priceHistory['2222'] = [
      { time: 1000, price: 90 },
      { time: 2000, price: 91.25 },
    ];
    savePriceState();

    resetGameState(); // simulates a fresh page load: back to base prices
    expect(stockPrices['2222']).not.toBe(91.25);

    loadPriceState();
    expect(stockPrices['2222']).toBe(91.25);
    expect(priceHistory['2222']).toEqual([
      { time: 1000, price: 90 },
      { time: 2000, price: 91.25 },
    ]);
  });

  it('ignores corrupt payloads and wrong versions', () => {
    localStorage.setItem(PRICES_STORAGE_KEY, '{broken');
    loadPriceState();
    expect(stockPrices['2222']).toBeGreaterThan(0);

    localStorage.setItem(
      PRICES_STORAGE_KEY,
      JSON.stringify({ version: -1, prices: { 2222: 999 } })
    );
    loadPriceState();
    expect(stockPrices['2222']).not.toBe(999);
  });

  it('drops non-finite prices and keeps defaults', () => {
    savePriceState();
    const data = JSON.parse(localStorage.getItem(PRICES_STORAGE_KEY));
    data.prices['2222'] = 'NaN-ish';
    data.prices['1120'] = -5;
    localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(data));

    const before2222 = stockPrices['2222'];
    const before1120 = stockPrices['1120'];
    loadPriceState();
    expect(stockPrices['2222']).toBe(before2222);
    expect(stockPrices['1120']).toBe(before1120);
  });
});

describe('loadStats sanitisation', () => {
  beforeEach(() => {
    resetStats();
  });

  it('keeps valid values', () => {
    localStorage.setItem(
      'tadawulStats',
      JSON.stringify({ totalTrades: 7, bestPnlPct: 12.5, bestTradeSymbol: '1180' })
    );
    loadStats();
    expect(personalStats.totalTrades).toBe(7);
    expect(personalStats.bestPnlPct).toBe(12.5);
    expect(personalStats.bestTradeSymbol).toBe('1180');
  });

  it('falls back to defaults for non-finite numbers instead of poisoning the UI', () => {
    // Written as raw JSON: an overflowing literal parses to Infinity, which is
    // exactly the value that used to reach personalStats and render as "∞".
    localStorage.setItem(
      'tadawulStats',
      '{"bestPnlPct": null, "totalTrades": "many", "lifetimeCommission": 1e999}'
    );
    loadStats();
    expect(personalStats.bestPnlPct).toBe(0);
    expect(personalStats.totalTrades).toBe(0);
    expect(Number.isFinite(personalStats.lifetimeCommission)).toBe(true);
    // The stats modal calls .toFixed() on every one of these.
    expect(() => personalStats.bestPnlPct.toFixed(2)).not.toThrow();
  });

  it('rejects negative counters', () => {
    localStorage.setItem(
      'tadawulStats',
      JSON.stringify({ totalTrades: -5, sessionsPlayed: -1, challengesCompleted: -3 })
    );
    loadStats();
    expect(personalStats.totalTrades).toBe(0);
    expect(personalStats.sessionsPlayed).toBe(0);
    expect(personalStats.challengesCompleted).toBe(0);
  });

  it('drops symbols that are not real stocks', () => {
    localStorage.setItem(
      'tadawulStats',
      JSON.stringify({ bestTradeSymbol: 'NOPE', worstTradeSymbol: 42 })
    );
    loadStats();
    expect(personalStats.bestTradeSymbol).toBeNull();
    expect(personalStats.worstTradeSymbol).toBeNull();
  });

  it('ignores unknown keys rather than copying them onto the stats object', () => {
    localStorage.setItem('tadawulStats', JSON.stringify({ totalTrades: 2, injected: 'x' }));
    loadStats();
    expect(personalStats.totalTrades).toBe(2);
    expect('injected' in personalStats).toBe(false);
  });

  it('survives malformed JSON', () => {
    localStorage.setItem('tadawulStats', '{broken');
    expect(() => loadStats()).not.toThrow();
    expect(personalStats.totalTrades).toBe(0);
  });
});

describe('completedLessons sanitisation', () => {
  it('keeps only string ids mapped to finite timestamps', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedLessons: { 'lesson-a': 1234, 'lesson-b': 'yesterday', 'lesson-c': null },
      })
    );
    loadGameState();
    expect(gameState.completedLessons).toEqual({ 'lesson-a': 1234 });
  });
});
