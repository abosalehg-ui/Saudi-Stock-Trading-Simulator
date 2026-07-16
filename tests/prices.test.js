import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { decayPriceImpact, updatePrices } from '../src/engine/prices.js';
import {
  gameState,
  stockPrices,
  priceHistory,
  activeNews,
  resetGameState,
  initPriceState,
} from '../src/state.js';
import { stocks, findStock } from '../src/data/stocks.js';
import { startScenario, stopScenario } from '../src/engine/scenarios.js';
import { MIN_PRICE_RATIO, MAX_PRICE_RATIO, PRICE_HISTORY_MAX_POINTS } from '../src/config.js';
import * as marketHours from '../src/engine/market-hours.js';

describe('decayPriceImpact', () => {
  it('shrinks the outstanding impact by the given rate each call', () => {
    const impact = { value: 0.1 };
    decayPriceImpact(impact, 0.05);
    expect(impact.value).toBeCloseTo(0.095);
  });

  it('returns the reversion (negative of the shrunk amount)', () => {
    const impact = { value: 0.1 };
    const delta = decayPriceImpact(impact, 0.05);
    expect(delta).toBeCloseTo(-0.005);
  });

  it('reverses direction for a negative impact too', () => {
    const impact = { value: -0.1 };
    const delta = decayPriceImpact(impact, 0.05);
    expect(delta).toBeCloseTo(0.005);
    expect(impact.value).toBeCloseTo(-0.095);
  });

  it('the cumulative drift correction telescopes back to roughly -impact_0, not a multiple of it', () => {
    const impact = { value: 0.1 };
    let totalDrift = 0;
    for (let i = 0; i < 500; i++) {
      totalDrift += decayPriceImpact(impact, 0.05);
    }
    // As impact.value decays toward 0, the sum of all reversions telescopes
    // to -(initial value). The old buggy implementation instead summed to
    // ~20x the initial impact by re-adding the full (barely-decaying) value
    // every tick instead of only the decayed fraction.
    expect(totalDrift).toBeCloseTo(-0.1, 3);
    expect(Math.abs(totalDrift)).toBeLessThan(0.1 * 2);
    expect(impact.value).toBeCloseTo(0, 5);
  });
});

describe('updatePrices', () => {
  beforeEach(() => {
    resetGameState();
    initPriceState();
    activeNews.items = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    stopScenario();
  });

  it('does nothing when the market is closed and 24/7 is off', () => {
    gameState.allow24Trading = false;
    vi.spyOn(marketHours, 'isMarketOpen').mockReturnValue(false);
    const before = { ...stockPrices };
    updatePrices();
    expect(stockPrices).toEqual(before);
  });

  it('updates every stock price when 24/7 trading is on', () => {
    gameState.allow24Trading = true;
    const symbol = stocks[0].symbol;
    const before = stockPrices[symbol];
    updatePrices();
    expect(stockPrices[symbol]).not.toBe(before);
  });

  it('appends to price history and caps it at PRICE_HISTORY_MAX_POINTS', () => {
    gameState.allow24Trading = true;
    const symbol = stocks[0].symbol;
    for (let i = 0; i < PRICE_HISTORY_MAX_POINTS + 10; i++) {
      updatePrices();
    }
    expect(priceHistory[symbol].length).toBe(PRICE_HISTORY_MAX_POINTS);
  });

  it('keeps prices within [basePrice * MIN_PRICE_RATIO, basePrice * MAX_PRICE_RATIO] under extreme noise', () => {
    gameState.allow24Trading = true;
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // pushes randomShock to its max
    const stock = stocks[0];
    for (let i = 0; i < 50; i++) {
      updatePrices();
    }
    const price = stockPrices[stock.symbol];
    expect(price).toBeGreaterThanOrEqual(stock.basePrice * MIN_PRICE_RATIO - 1e-6);
    expect(price).toBeLessThanOrEqual(stock.basePrice * MAX_PRICE_RATIO + 1e-6);
  });

  it('distributes an active news item impact into the affected stock price, not others', () => {
    gameState.allow24Trading = true;
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // neutralizes randomShock and the 5% jump chance
    const target = stocks[0];
    const other = stocks[1];
    activeNews.items = [
      {
        symbol: target.symbol,
        templateIndex: 0,
        type: 'positive',
        impact: 0.05,
        appliedImpact: 0,
        duration: 5,
        timestamp: Date.now(),
      },
    ];
    const otherBefore = stockPrices[other.symbol];
    updatePrices();
    // Target gets its own tiny baseline drift (stock.mu * dt) PLUS the news
    // step; "other" only gets its own baseline drift. Comparing the percentage
    // moves (rather than asserting "other" is exactly unchanged) isolates the
    // news effect from that unrelated per-stock baseline.
    const targetChangePct = (stockPrices[target.symbol] - target.basePrice) / target.basePrice;
    const otherChangePct = (stockPrices[other.symbol] - otherBefore) / otherBefore;
    expect(stockPrices[target.symbol]).toBeGreaterThan(target.basePrice);
    expect(targetChangePct).toBeGreaterThan(Math.abs(otherChangePct) * 100);
  });

  it('amplifies drift for stocks affected by an active scenario', () => {
    gameState.allow24Trading = true;
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // neutralizes randomShock and the 5% jump chance
    startScenario('crash_2006'); // negative muMultiplier on banking/petrochemical/realestate/cement
    const bankStock = findStock('1120'); // banking sector, positive base mu
    const priceBefore = stockPrices[bankStock.symbol];
    updatePrices();
    // crash_2006 flips banking's mu strongly negative; price should now drift down
    expect(stockPrices[bankStock.symbol]).toBeLessThan(priceBefore);
  });
});
