import {
  IMPACT_DECAY_RATE,
  TICK_VOLATILITY_SCALE,
  MIN_PRICE_RATIO,
  MAX_PRICE_RATIO,
  PRICE_HISTORY_MAX_POINTS,
  SHOCK_PROBABILITY,
  SHOCK_MAGNITUDE,
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
 * Only the reverted fraction goes into drift. Re-adding the whole outstanding
 * impact each tick would sum a geometric series (~20x the impact at a 5% rate)
 * instead of fading it out.
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
 * One draw from a standard normal distribution (Box-Muller transform), which
 * is what GBM's shock term is defined over: unlike a uniform draw it has tails,
 * and its standard deviation is 1, so sigma means what it says.
 *
 * @returns {number} a sample with mean 0 and standard deviation 1
 */
function standardNormal() {
  // Math.random() can return exactly 0, and log(0) is -Infinity.
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
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
  const sigma = stock.sigma * sigmaMult * TICK_VOLATILITY_SCALE;
  // The -sigma^2/2 Ito correction: without it the expected price drifts upward
  // by that amount per step purely as an artefact of compounding, so every
  // stock trended up regardless of its mu.
  let drift = (stock.mu * muMult - (sigma * sigma) / 2) * dt;
  let randomShock = sigma * Math.sqrt(dt) * standardNormal();

  const relevantNews = activeNews.items.filter((n) => n.symbol === stock.symbol);
  relevantNews.forEach((news) => {
    const elapsed = simElapsedMs(news.timestamp, gameState.speed) / 60000;
    if (elapsed < news.duration) {
      const remaining = news.impact - news.appliedImpact;
      // Clamp to >=1: the divisor is "ticks left", and a speed change re-phases
      // the interval, so a tick can land just before expiry and would otherwise
      // apply the whole remaining impact at once.
      const ticksLeft = Math.max(1, news.duration - elapsed);
      const step = remaining / ticksLeft;
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

  if (Math.random() < SHOCK_PROBABILITY) {
    randomShock += (Math.random() - 0.5) * SHOCK_MAGNITUDE;
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
