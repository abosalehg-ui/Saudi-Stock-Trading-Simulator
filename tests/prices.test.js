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
    // 1e-8 drives Box-Muller to a ~6-sigma draw every single tick, and is also
    // below SHOCK_PROBABILITY so the rare extra jump fires on every tick too —
    // far past anything the real distribution produces. If the clamp holds
    // here it holds anywhere.
    vi.spyOn(Math, 'random').mockReturnValue(1e-8);
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
    // 0.25 is the value that zeroes the Box-Muller draw: its cos(2*pi*0.25)
    // factor is 0, so standardNormal() returns ~1e-16. (0.5 zeroed the *old*
    // uniform shock; under a normal draw it is a -1.18 sigma move, which is
    // not what this test wants to hold still.) It also sits above
    // SHOCK_PROBABILITY, so the extra jump stays off.
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
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

  it('caps a news step when a re-phased tick lands just before the item expires', () => {
    gameState.allow24Trading = true;
    vi.spyOn(Math, 'random').mockReturnValue(0.25); // hold the random shock at ~0
    const target = stocks[0];
    // A speed change tears down and rebuilds the price interval, so ticks do
    // not stay on whole-minute offsets. This is a tick landing at elapsed 4.97
    // of a 5-minute item with its impact still unapplied: the divisor
    // (duration - elapsed) is 0.03, which without the clamp turns a 3% story
    // into a >100% move in one tick.
    activeNews.items = [
      {
        symbol: target.symbol,
        templateIndex: 0,
        type: 'positive',
        impact: 0.03,
        appliedImpact: 0,
        duration: 5,
        timestamp: Date.now() - 4.97 * 60000,
      },
    ];
    const before = stockPrices[target.symbol];
    updatePrices();
    const movePct = (stockPrices[target.symbol] - before) / before;
    // The whole remaining impact lands in this tick (ticksLeft clamps to 1),
    // which is the intended worst case — and nothing beyond it.
    expect(movePct).toBeGreaterThan(0);
    expect(movePct).toBeLessThanOrEqual(0.031);
  });

  it('amplifies drift for stocks affected by an active scenario', () => {
    gameState.allow24Trading = true;
    // 0.25 is the value that zeroes the Box-Muller draw: its cos(2*pi*0.25)
    // factor is 0, so standardNormal() returns ~1e-16. (0.5 zeroed the *old*
    // uniform shock; under a normal draw it is a -1.18 sigma move, which is
    // not what this test wants to hold still.) It also sits above
    // SHOCK_PROBABILITY, so the extra jump stays off.
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    startScenario('crash_2006'); // negative muMultiplier on banking/petrochemical/realestate/cement
    const bankStock = findStock('1120'); // banking sector, positive base mu
    const priceBefore = stockPrices[bankStock.symbol];
    updatePrices();
    // crash_2006 flips banking's mu strongly negative; price should now drift down
    expect(stockPrices[bankStock.symbol]).toBeLessThan(priceBefore);
  });
});
