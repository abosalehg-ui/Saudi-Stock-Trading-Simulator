import { describe, it, expect, beforeEach } from 'vitest';
import { startScenario, stopScenario, getActiveScenario, getScenarioMultipliers } from '../src/engine/scenarios.js';
import { gameState, stockPrices, resetGameState, initPriceState } from '../src/state.js';
import { findStock } from '../src/data/stocks.js';

beforeEach(() => {
  resetGameState();
  initPriceState();
});

describe('scenarios', () => {
  it('startScenario marks the scenario active and applies initial shocks', () => {
    const aramcoBefore = stockPrices['2222'];
    expect(startScenario('aramco_ipo')).toBe(true);
    expect(getActiveScenario()).not.toBeNull();
    expect(stockPrices['2222']).toBeGreaterThan(aramcoBefore);
  });

  it('returns null for unknown scenarios', () => {
    expect(startScenario('does-not-exist')).toBe(false);
  });

  it('stopScenario clears state', () => {
    startScenario('aramco_ipo');
    stopScenario();
    expect(getActiveScenario()).toBeNull();
    expect(gameState.activeScenario).toBeNull();
  });

  it('getScenarioMultipliers returns matching effect for a sector', () => {
    startScenario('crash_2006');
    const bankStock = findStock('1180');
    const mult = getScenarioMultipliers(bankStock);
    expect(mult).not.toBeNull();
    expect(mult.muMultiplier).toBeLessThan(0);
    expect(mult.sigmaMultiplier).toBeGreaterThan(1);
  });

  it('returns null when no scenario is active', () => {
    const bankStock = findStock('1180');
    expect(getScenarioMultipliers(bankStock)).toBeNull();
  });

  it('expires after the configured duration', () => {
    startScenario('oil_shock');
    expect(getActiveScenario()).not.toBeNull();
    gameState.activeScenario.startedAt = Date.now() - 100 * 60 * 1000;
    expect(getActiveScenario()).toBeNull();
  });

  it('expiry scales with sim speed: same elapsed real time expires sooner at higher speed', () => {
    // oil_shock runs 8 minutes. 2 real minutes in: still active at 1x,
    // but 20 sim-minutes have passed at 10x, so it should already be over.
    startScenario('oil_shock');
    const startedAt = Date.now() - 2 * 60 * 1000;

    gameState.speed = 1;
    gameState.activeScenario.startedAt = startedAt;
    expect(getActiveScenario()).not.toBeNull();

    startScenario('oil_shock');
    gameState.speed = 10;
    gameState.activeScenario.startedAt = startedAt;
    expect(getActiveScenario()).toBeNull();
  });
});
