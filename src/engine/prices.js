import {
  IMPACT_DECAY_RATE,
  MIN_PRICE_RATIO,
  MAX_PRICE_RATIO,
  PRICE_HISTORY_MAX_POINTS,
} from '../config.js';
import { stocks } from '../data/stocks.js';
import { gameState, stockPrices, priceHistory, activeNews } from '../state.js';
import { isMarketOpen } from './market-hours.js';
import { getScenarioMultipliers } from './scenarios.js';
import { simElapsedMs } from './sim-time.js';

/**
 * One decay step for a temporary trade price-impact displacement.
 * Reverts a `rate` fraction of the outstanding impact back toward neutral
 * and shrinks `impact.value` by the same amount, mutating it in place.
 *
 * This must NOT re-add the full `impact.value` to drift every tick (the
 * previous implementation did): since impact.value only shrinks 5%/tick,
 * doing so summed a geometric series to ~20x the original impact instead of
 * fading it out. Reverting a fraction each tick telescopes the total drift
 * contribution back to roughly -impact.value as it decays to ~0.
 *
 * @param {{value: number}} impact
 * @param {number} rate - fraction reverted per call, e.g. IMPACT_DECAY_RATE
 * @returns {number} the drift correction to apply this tick
 */
export function decayPriceImpact(impact, rate) {
  const reversion = impact.value * rate;
  impact.value -= reversion;
  return -reversion;
}

/**
 * Simulate a single Geometric Brownian Motion step for one stock.
 * @param {import('../data/stocks.js').Stock} stock - Stock definition
 * @param {number} currentPrice - The previous price
 * @returns {number} Next price (bounded)
 */
function gbmStep(stock, currentPrice) {
  const dt = 1 / 252;
  const scenarioFx = getScenarioMultipliers(stock);
  const muMult = scenarioFx ? scenarioFx.muMultiplier : 1;
  const sigmaMult = scenarioFx ? scenarioFx.sigmaMultiplier : 1;
  let drift = stock.mu * muMult * dt;
  let randomShock = stock.sigma * sigmaMult * Math.sqrt(dt) * (Math.random() * 2 - 1);

  const relevantNews = activeNews.items.filter((n) => n.symbol === stock.symbol);
  relevantNews.forEach((news) => {
    const elapsed = simElapsedMs(news.timestamp, gameState.speed) / 60000;
    if (elapsed < news.duration) {
      const remaining = news.impact - news.appliedImpact;
      const step = remaining / (news.duration - elapsed);
      drift += step;
      news.appliedImpact += step;
    }
  });

  const impact = gameState.priceImpacts[stock.symbol];
  if (impact) {
    drift += decayPriceImpact(impact, IMPACT_DECAY_RATE);
    if (Math.abs(impact.value) < 0.0001) {
      delete gameState.priceImpacts[stock.symbol];
    }
  }

  if (Math.random() < 0.05 && Math.random() < 0.3) {
    randomShock += (Math.random() - 0.5) * 0.05;
  }

  let newPrice = currentPrice * (1 + drift + randomShock);
  newPrice = Math.max(newPrice, stock.basePrice * MIN_PRICE_RATIO);
  newPrice = Math.min(newPrice, stock.basePrice * MAX_PRICE_RATIO);
  return newPrice;
}

export function updatePrices() {
  if (!gameState.allow24Trading && !isMarketOpen()) {
    return;
  }

  stocks.forEach((stock) => {
    const current = stockPrices[stock.symbol];
    const next = gbmStep(stock, current);
    stockPrices[stock.symbol] = next;
    priceHistory[stock.symbol].push({ time: Date.now(), price: next });
    if (priceHistory[stock.symbol].length > PRICE_HISTORY_MAX_POINTS) {
      priceHistory[stock.symbol].shift();
    }
  });
}
