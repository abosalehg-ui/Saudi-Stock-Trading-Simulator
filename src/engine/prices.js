import { IMPACT_DECAY_RATE, MIN_PRICE_RATIO, MAX_PRICE_RATIO, PRICE_HISTORY_MAX_POINTS } from '../config.js';
import { stocks } from '../data/stocks.js';
import { gameState, stockPrices, priceHistory, activeNews } from '../state.js';
import { isMarketOpen } from './market-hours.js';

/**
 * Simulate a single Geometric Brownian Motion step for one stock.
 * @param {object} stock - Stock definition
 * @param {number} currentPrice - The previous price
 * @returns {number} Next price (bounded)
 */
function gbmStep(stock, currentPrice) {
  const dt = 1 / 252;
  let drift = stock.mu * dt;
  let randomShock = stock.sigma * Math.sqrt(dt) * (Math.random() * 2 - 1);

  const relevantNews = activeNews.items.filter((n) => n.symbol === stock.symbol);
  relevantNews.forEach((news) => {
    const elapsed = (Date.now() - news.timestamp) / 60000;
    if (elapsed < news.duration) {
      const remaining = news.impact - news.appliedImpact;
      const step = remaining / (news.duration - elapsed);
      drift += step;
      news.appliedImpact += step;
    }
  });

  const impact = gameState.priceImpacts[stock.symbol];
  if (impact) {
    drift += impact.value;
    impact.value *= 1 - IMPACT_DECAY_RATE;
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
