import { INITIAL_CAPITAL, STORAGE_KEY } from './config.js';
import { stocks } from './data/stocks.js';

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
 */

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
  };
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

  Object.assign(gameState, loaded);

  if (!gameState.pendingOrders || !Array.isArray(gameState.pendingOrders)) {
    gameState.pendingOrders = [];
  }
  if (!gameState.priceImpacts || typeof gameState.priceImpacts !== 'object') {
    gameState.priceImpacts = {};
  }
  if (!gameState.portfolio || typeof gameState.portfolio !== 'object') {
    gameState.portfolio = {};
  }
  if (!Array.isArray(gameState.transactions)) {
    gameState.transactions = [];
  }
}

export function saveGameState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
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
