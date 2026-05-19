import { gameState, stockPrices, saveGameState } from '../state.js';
import { stocks } from '../data/stocks.js';
import { findScenario } from '../data/scenarios.js';
import { MIN_PRICE_RATIO, MAX_PRICE_RATIO } from '../config.js';

/**
 * Apply a scenario's initial shocks to current prices.
 * @param {object} scenario
 */
function applyInitialShocks(scenario) {
  if (!scenario.initialShocks) return;
  scenario.initialShocks.forEach((shock) => {
    stocks.forEach((stock) => {
      const matchSector = shock.sector && stock.sector === shock.sector;
      const matchSymbol = shock.symbol && stock.symbol === shock.symbol;
      if (matchSector || matchSymbol) {
        let newPrice = stockPrices[stock.symbol] * (1 + shock.shock);
        newPrice = Math.max(newPrice, stock.basePrice * MIN_PRICE_RATIO);
        newPrice = Math.min(newPrice, stock.basePrice * MAX_PRICE_RATIO);
        stockPrices[stock.symbol] = newPrice;
      }
    });
  });
}

export function startScenario(scenarioId) {
  const scenario = findScenario(scenarioId);
  if (!scenario) return false;
  gameState.activeScenario = {
    id: scenarioId,
    startedAt: Date.now(),
    durationMs: scenario.durationMinutes * 60 * 1000,
  };
  applyInitialShocks(scenario);
  saveGameState();
  return true;
}

export function stopScenario() {
  gameState.activeScenario = null;
  saveGameState();
}

export function getActiveScenario() {
  if (!gameState.activeScenario) return null;
  const { startedAt, durationMs } = gameState.activeScenario;
  if (Date.now() - startedAt > durationMs) {
    gameState.activeScenario = null;
    saveGameState();
    return null;
  }
  return findScenario(gameState.activeScenario.id);
}

/**
 * Get effect multipliers for a given stock under the active scenario.
 * Returns { muMultiplier, sigmaMultiplier } or null if no effect.
 *
 * @param {{symbol: string, sector: string}} stock
 * @returns {{muMultiplier: number, sigmaMultiplier: number}|null}
 */
export function getScenarioMultipliers(stock) {
  const scenario = getActiveScenario();
  if (!scenario || !scenario.effects) return null;

  for (const effect of scenario.effects) {
    if (
      (effect.sector && stock.sector === effect.sector) ||
      (effect.symbol && stock.symbol === effect.symbol)
    ) {
      return {
        muMultiplier: effect.muMultiplier ?? 1,
        sigmaMultiplier: effect.sigmaMultiplier ?? 1,
      };
    }
  }
  return null;
}
