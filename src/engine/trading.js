import {
  COMMISSION,
  SLIPPAGE,
  VOLUME_IMPACT_FACTOR,
  MIN_ORDER_QUANTITY,
  MAX_ORDER_QUANTITY,
} from '../config.js';
import { gameState, stockPrices } from '../state.js';
import { findStock } from '../data/stocks.js';
import { safeParseNumber } from '../utils/numbers.js';

/**
 * @typedef {Object} OrderInput
 * @property {string} symbol
 * @property {'buy'|'sell'} type
 * @property {'market'|'limit'|'stop-loss'} kind
 * @property {number} quantity
 * @property {number} [limitPrice]
 * @property {number} [stopPrice]
 */

/**
 * Validate raw user inputs and return a normalized order or an error.
 *
 * @param {{ symbol: string, type: 'buy'|'sell', kind: 'market'|'limit'|'stop-loss', quantityRaw: any, priceRaw?: any }} input
 * @returns {{ ok: true, order: OrderInput } | { ok: false, error: 'NO_STOCK'|'INVALID_QUANTITY'|'QUANTITY_TOO_LARGE'|'INVALID_PRICE'|'STOP_LOSS_SELL_ONLY'|'NO_HOLDING' }}
 */
export function validateOrder(input) {
  if (!input.symbol || !findStock(input.symbol)) {
    return { ok: false, error: 'NO_STOCK' };
  }

  const quantity = safeParseNumber(input.quantityRaw, {
    min: MIN_ORDER_QUANTITY,
    max: MAX_ORDER_QUANTITY,
    integer: true,
  });
  if (quantity === null) {
    const asNum = Number.parseFloat(input.quantityRaw);
    if (Number.isFinite(asNum) && asNum > MAX_ORDER_QUANTITY) {
      return { ok: false, error: 'QUANTITY_TOO_LARGE' };
    }
    return { ok: false, error: 'INVALID_QUANTITY' };
  }

  const order = {
    symbol: input.symbol,
    type: input.type,
    kind: input.kind,
    quantity,
  };

  if (input.kind === 'limit') {
    const price = safeParseNumber(input.priceRaw, { min: 0.01, max: 100000 });
    if (price === null) return { ok: false, error: 'INVALID_PRICE' };
    order.limitPrice = price;
  } else if (input.kind === 'stop-loss') {
    if (input.type !== 'sell') return { ok: false, error: 'STOP_LOSS_SELL_ONLY' };
    const holding = gameState.portfolio[input.symbol];
    if (!holding || holding.quantity < quantity) {
      return { ok: false, error: 'NO_HOLDING' };
    }
    const price = safeParseNumber(input.priceRaw, { min: 0.01, max: 100000 });
    if (price === null) return { ok: false, error: 'INVALID_PRICE' };
    order.stopPrice = price;
  }

  return { ok: true, order };
}

/**
 * Apply a buy at the given price+quantity, updating cash and portfolio.
 * Returns { ok: true } or { ok: false, error }.
 */
function applyBuy(symbol, price, quantity) {
  const cost = price * quantity * (1 + COMMISSION);
  if (cost > gameState.cash) return { ok: false, error: 'INSUFFICIENT_FUNDS' };
  gameState.cash -= cost;
  const holding = gameState.portfolio[symbol] || { quantity: 0, avgCost: 0 };
  const newTotalCost = holding.avgCost * holding.quantity + price * quantity;
  holding.quantity += quantity;
  holding.avgCost = newTotalCost / holding.quantity;
  gameState.portfolio[symbol] = holding;
  return { ok: true, totalCost: cost };
}

function applySell(symbol, price, quantity) {
  const holding = gameState.portfolio[symbol];
  if (!holding || holding.quantity < quantity) return { ok: false, error: 'INSUFFICIENT_SHARES' };
  const revenue = price * quantity * (1 - COMMISSION);
  gameState.cash += revenue;
  holding.quantity -= quantity;
  if (holding.quantity === 0) delete gameState.portfolio[symbol];
  return { ok: true, revenue };
}

/**
 * Apply temporary price impact from a market trade and update spot price.
 * Mutates state. Returns final executed price.
 */
function applyMarketImpact(symbol, type, quantity) {
  const stock = findStock(symbol);
  let price = stockPrices[symbol];
  price *= 1 + (Math.random() - 0.5) * SLIPPAGE;

  const avgDailyVolume = stock.basePrice * 1000000;
  const orderValue = price * quantity;
  const volumePercentage = (orderValue / avgDailyVolume) * 100;
  const priceImpact = (volumePercentage * VOLUME_IMPACT_FACTOR) / 100;

  if (!gameState.priceImpacts[symbol]) gameState.priceImpacts[symbol] = { value: 0 };
  if (type === 'buy') {
    price *= 1 + priceImpact;
    gameState.priceImpacts[symbol].value += priceImpact;
  } else {
    price *= 1 - priceImpact;
    gameState.priceImpacts[symbol].value -= priceImpact;
  }
  stockPrices[symbol] = price;
  return price;
}

function recordTransaction(order, executedPrice) {
  const commission = executedPrice * order.quantity * COMMISSION;
  gameState.transactions.push({
    symbol: order.symbol,
    type: order.type,
    kind: order.kind,
    quantity: order.quantity,
    price: executedPrice,
    commission,
    time: Date.now(),
  });
}

/**
 * Execute a validated market order immediately.
 * Returns { ok: true } or { ok: false, error }.
 */
export function executeMarketOrder(order) {
  const price = applyMarketImpact(order.symbol, order.type, order.quantity);
  const result = order.type === 'buy'
    ? applyBuy(order.symbol, price, order.quantity)
    : applySell(order.symbol, price, order.quantity);
  if (!result.ok) return result;
  recordTransaction(order, price);
  return { ok: true, executedPrice: price };
}

/**
 * Add a pending order (limit or stop-loss) to the queue.
 */
export function addPendingOrder(order) {
  const pending = {
    id: Date.now() + Math.random(),
    symbol: order.symbol,
    type: order.type,
    kind: order.kind,
    quantity: order.quantity,
    limitPrice: order.limitPrice ?? null,
    stopPrice: order.stopPrice ?? null,
    timestamp: Date.now(),
  };
  gameState.pendingOrders.push(pending);
  return pending;
}

/**
 * Check pending orders against current prices and execute matches.
 * @returns {number} count of executed orders
 */
export function checkPendingOrders() {
  if (!gameState.pendingOrders || gameState.pendingOrders.length === 0) return 0;
  const remaining = [];
  let executed = 0;

  for (const order of gameState.pendingOrders) {
    const currentPrice = stockPrices[order.symbol];
    let shouldExecute = false;
    let executionPrice = order.limitPrice;

    if (order.kind === 'stop-loss' && currentPrice <= order.stopPrice) {
      shouldExecute = true;
      executionPrice = currentPrice;
    } else if (order.kind === 'limit') {
      if (order.type === 'buy' && currentPrice <= order.limitPrice) shouldExecute = true;
      else if (order.type === 'sell' && currentPrice >= order.limitPrice) shouldExecute = true;
    }

    if (shouldExecute) {
      const op = order.type === 'buy'
        ? applyBuy(order.symbol, executionPrice, order.quantity)
        : applySell(order.symbol, executionPrice, order.quantity);
      if (op.ok) {
        recordTransaction({ ...order, kind: order.kind || 'limit' }, executionPrice);
        executed += 1;
        continue;
      }
    }
    remaining.push(order);
  }

  gameState.pendingOrders = remaining;
  return executed;
}

export function cancelPendingOrder(index) {
  if (index < 0 || index >= gameState.pendingOrders.length) return false;
  gameState.pendingOrders.splice(index, 1);
  return true;
}
