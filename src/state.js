import {
  INITIAL_CAPITAL,
  STORAGE_KEY,
  PRICES_STORAGE_KEY,
  PRICE_HISTORY_MAX_POINTS,
} from './config.js';
import { stocks, findStock } from './data/stocks.js';

/**
 * @typedef {Object} GameState
 * @property {number} cash
 * @property {Record<string, {quantity: number, avgCost: number}>} portfolio
 * @property {Array<Object>} transactions
 * @property {Array<Object>} pendingOrders
 * @property {number} speed
 * @property {number} initialCapital
 * @property {boolean} challenge1Completed
 * @property {boolean} challenge2Completed
 * @property {Record<string, {value: number}>} priceImpacts
 * @property {boolean} shariaFilter
 * @property {boolean} allow24Trading
 * @property {boolean} tourCompleted
 * @property {Record<string, number>} completedLessons - lessonId -> completion timestamp
 * @property {{id: string, startedAt: number, durationMs: number}|null} activeScenario
 */

/** @returns {GameState} */
export function defaultState() {
  return {
    cash: INITIAL_CAPITAL,
    portfolio: {},
    transactions: [],
    pendingOrders: [],
    speed: 1,
    initialCapital: INITIAL_CAPITAL,
    challenge1Completed: false,
    challenge2Completed: false,
    priceImpacts: {},
    shariaFilter: false,
    allow24Trading: false,
    tourCompleted: false,
    completedLessons: {},
    activeScenario: null,
  };
}

/**
 * @typedef {Object} PersonalStats
 * @property {number} bestPnlPct
 * @property {number} bestPnlAmount
 * @property {number} bestTradeProfit
 * @property {string|null} bestTradeSymbol
 * @property {number} worstTradeLoss
 * @property {string|null} worstTradeSymbol
 * @property {number} totalTrades
 * @property {number} challengesCompleted
 * @property {number} lifetimeCommission
 * @property {number} sessionsPlayed
 */

/** @returns {PersonalStats} */
export function defaultStats() {
  return {
    bestPnlPct: 0,
    bestPnlAmount: 0,
    bestTradeProfit: 0,
    bestTradeSymbol: null,
    worstTradeLoss: 0,
    worstTradeSymbol: null,
    totalTrades: 0,
    challengesCompleted: 0,
    lifetimeCommission: 0,
    sessionsPlayed: 0,
  };
}

const STATS_KEY = 'tadawulStats';

export const personalStats = defaultStats();

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return;
    const loaded = JSON.parse(raw);
    if (loaded && typeof loaded === 'object') {
      Object.assign(personalStats, defaultStats(), loaded);
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

export function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(personalStats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export function resetStats() {
  Object.assign(personalStats, defaultStats());
  try {
    localStorage.removeItem(STATS_KEY);
  } catch (e) {
    console.error('Failed to clear stats:', e);
  }
}

export const gameState = defaultState();

export const stockPrices = {};
export const priceHistory = {};

export const session = {
  selectedStock: null,
  chart: null,
  updateInterval: null,
  newsUpdateInterval: null,
};

export const activeNews = { items: [] };

export function resetGameState() {
  Object.assign(gameState, defaultState());
  activeNews.items = [];
  session.selectedStock = null;
  stocks.forEach((stock) => {
    stockPrices[stock.symbol] = stock.basePrice;
    priceHistory[stock.symbol] = [{ time: Date.now(), price: stock.basePrice }];
  });
}

const SCHEMA_VERSION = 1;

/**
 * Validate a loaded save field by field, falling back to defaults for anything
 * corrupt (wrong type, non-finite number, unknown stock symbol). Prevents a
 * damaged save from permanently poisoning the game with NaN arithmetic.
 *
 * @param {any} loaded - parsed, untrusted JSON from storage; shape is not
 *   trusted, which is why every field below is read defensively rather than
 *   typed
 * @returns {GameState} a complete, valid game state
 */
function sanitizeLoadedState(loaded) {
  const clean = defaultState();

  if (Number.isFinite(loaded.cash) && loaded.cash >= 0) clean.cash = loaded.cash;
  if (Number.isFinite(loaded.initialCapital) && loaded.initialCapital > 0) {
    clean.initialCapital = loaded.initialCapital;
  }
  if ([1, 5, 10].includes(loaded.speed)) clean.speed = loaded.speed;

  [
    'challenge1Completed',
    'challenge2Completed',
    'shariaFilter',
    'allow24Trading',
    'tourCompleted',
  ].forEach((key) => {
    clean[key] = loaded[key] === true;
  });

  if (loaded.portfolio && typeof loaded.portfolio === 'object') {
    Object.entries(loaded.portfolio).forEach(([symbol, holding]) => {
      if (!findStock(symbol) || !holding) return;
      const quantity = Number.isFinite(holding.quantity) ? Math.floor(holding.quantity) : 0;
      if (quantity > 0 && Number.isFinite(holding.avgCost) && holding.avgCost >= 0) {
        clean.portfolio[symbol] = { quantity, avgCost: holding.avgCost };
      }
    });
  }

  if (Array.isArray(loaded.transactions)) {
    clean.transactions = loaded.transactions.filter(
      (tx) =>
        tx &&
        typeof tx.symbol === 'string' &&
        Number.isFinite(tx.price) &&
        Number.isFinite(tx.quantity)
    );
  }

  if (Array.isArray(loaded.pendingOrders)) {
    clean.pendingOrders = loaded.pendingOrders
      .filter(
        (order) =>
          order &&
          findStock(order.symbol) &&
          (order.type === 'buy' || order.type === 'sell') &&
          (order.kind === 'limit' || order.kind === 'stop-loss') &&
          Number.isFinite(order.quantity) &&
          order.quantity > 0 &&
          (order.kind !== 'limit' || Number.isFinite(order.limitPrice)) &&
          (order.kind !== 'stop-loss' || Number.isFinite(order.stopPrice))
      )
      // Saves from older versions may predate order ids; cancellation looks orders up by id.
      .map((order) => ({ ...order, id: order.id ?? Date.now() + Math.random() }));
  }

  if (loaded.priceImpacts && typeof loaded.priceImpacts === 'object') {
    Object.entries(loaded.priceImpacts).forEach(([symbol, impact]) => {
      if (findStock(symbol) && impact && Number.isFinite(impact.value)) {
        clean.priceImpacts[symbol] = { value: impact.value };
      }
    });
  }

  if (loaded.completedLessons && typeof loaded.completedLessons === 'object') {
    clean.completedLessons = { ...loaded.completedLessons };
  }

  const scenario = loaded.activeScenario;
  if (
    scenario &&
    typeof scenario.id === 'string' &&
    Number.isFinite(scenario.startedAt) &&
    Number.isFinite(scenario.durationMs)
  ) {
    clean.activeScenario = {
      id: scenario.id,
      startedAt: scenario.startedAt,
      durationMs: scenario.durationMs,
    };
  }

  return clean;
}

export function loadGameState() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.error('localStorage unavailable:', e);
    return;
  }
  if (!raw) return;

  let loaded;
  try {
    loaded = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved game; ignoring:', e);
    return;
  }

  if (!loaded || typeof loaded !== 'object') return;

  Object.assign(gameState, sanitizeLoadedState(loaded));
}

export function saveGameState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...gameState, schemaVersion: SCHEMA_VERSION })
    );
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

export function initPriceState() {
  stocks.forEach((stock) => {
    if (!stockPrices[stock.symbol]) {
      stockPrices[stock.symbol] = stock.basePrice;
      priceHistory[stock.symbol] = [{ time: Date.now(), price: stock.basePrice }];
    }
  });
}

// Bump when the stock list changes incompatibly (renamed/removed symbols):
// stale saved prices for a reused symbol would otherwise attach to the wrong stock.
const PRICE_DATA_VERSION = 2;

const round4 = (n) => Math.round(n * 10000) / 10000;

/**
 * Persist live prices and their history so a page reload resumes the market
 * where it left off instead of snapping every stock back to its base price.
 * History is stored as [time, price] pairs to keep the payload compact.
 */
export function savePriceState() {
  try {
    const prices = {};
    const history = {};
    stocks.forEach((stock) => {
      const price = stockPrices[stock.symbol];
      if (!Number.isFinite(price)) return;
      prices[stock.symbol] = round4(price);
      history[stock.symbol] = (priceHistory[stock.symbol] || []).map((p) => [
        p.time,
        round4(p.price),
      ]);
    });
    localStorage.setItem(
      PRICES_STORAGE_KEY,
      JSON.stringify({ version: PRICE_DATA_VERSION, savedAt: Date.now(), prices, history })
    );
  } catch (e) {
    console.error('Failed to save price state:', e);
  }
}

/**
 * Restore persisted prices/history. Unknown symbols, wrong versions, and
 * non-finite values are dropped; initPriceState() fills any gaps afterwards.
 */
export function loadPriceState() {
  let raw;
  try {
    raw = localStorage.getItem(PRICES_STORAGE_KEY);
  } catch (e) {
    console.error('localStorage unavailable:', e);
    return;
  }
  if (!raw) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved prices; ignoring:', e);
    return;
  }
  if (!data || data.version !== PRICE_DATA_VERSION) return;

  stocks.forEach((stock) => {
    const price = data.prices?.[stock.symbol];
    if (!Number.isFinite(price) || price <= 0) return;
    stockPrices[stock.symbol] = price;
    const rawHistory = Array.isArray(data.history?.[stock.symbol])
      ? data.history[stock.symbol]
      : [];
    const points = rawHistory
      .filter(
        (pt) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]) && pt[1] > 0
      )
      .slice(-PRICE_HISTORY_MAX_POINTS)
      .map((pt) => ({ time: pt[0], price: pt[1] }));
    priceHistory[stock.symbol] = points.length > 0 ? points : [{ time: Date.now(), price }];
  });
}
