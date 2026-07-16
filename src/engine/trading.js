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
import { recordTrade } from './stats.js';

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

/**
 * Log an executed trade in the transaction history and the personal stats.
 * Single recording point for both market and pending-order executions.
 */
function recordExecution(order, executedPrice, avgCostBefore) {
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
  recordTrade({
    symbol: order.symbol,
    type: order.type,
    quantity: order.quantity,
    price: executedPrice,
    commission,
    avgCostBefore,
  });
}

/**
 * Execute a validated market order immediately.
 * Returns { ok: true } or { ok: false, error }.
 */
export function executeMarketOrder(order) {
  const avgCostBefore = gameState.portfolio[order.symbol]?.avgCost;
  const price = applyMarketImpact(order.symbol, order.type, order.quantity);
  const result = order.type === 'buy'
    ? applyBuy(order.symbol, price, order.quantity)
    : applySell(order.symbol, price, order.quantity);
  if (!result.ok) return result;
  recordExecution(order, price, avgCostBefore);
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
 *
 * An order whose trigger condition is met but whose execution then fails
 * (e.g. two pending orders competing for the same unreserved cash or shares)
 * is dropped rather than re-queued: retrying it every tick forever would
 * leave a "pending" order the user believes is live but that can never
 * actually fill. The caller is expected to surface `cancelled` to the user.
 *
 * @returns {{ executed: number, cancelled: Array<object> }}
 */
export function checkPendingOrders() {
  if (!gameState.pendingOrders || gameState.pendingOrders.length === 0) {
    return { executed: 0, cancelled: [] };
  }
  const remaining = [];
  const cancelled = [];
  let executed = 0;

  for (const order of gameState.pendingOrders) {
    const currentPrice = stockPrices[order.symbol];
    let shouldExecute = false;

    if (order.kind === 'stop-loss' && currentPrice <= order.stopPrice) {
      shouldExecute = true;
    } else if (order.kind === 'limit') {
      if (order.type === 'buy' && currentPrice <= order.limitPrice) shouldExecute = true;
      else if (order.type === 'sell' && currentPrice >= order.limitPrice) shouldExecute = true;
    }

    if (shouldExecute) {
      // Fill at the market price, as a real broker would: for a limit buy the
      // current price is at or below the limit (never worse), and vice versa.
      const avgCostBefore = gameState.portfolio[order.symbol]?.avgCost;
      const op = order.type === 'buy'
        ? applyBuy(order.symbol, currentPrice, order.quantity)
        : applySell(order.symbol, currentPrice, order.quantity);
      if (op.ok) {
        recordExecution({ ...order, kind: order.kind || 'limit' }, currentPrice, avgCostBefore);
        executed += 1;
        continue;
      }
      cancelled.push(order);
      continue;
    }
    remaining.push(order);
  }

  gameState.pendingOrders = remaining;
  return { executed, cancelled };
}

/**
 * Cancel a pending order by its stable id (not its position, which can shift
 * whenever another order executes between render and confirmation).
 * @param {number} id
 * @returns {boolean} true if an order was removed
 */
export function cancelPendingOrder(id) {
  const index = gameState.pendingOrders.findIndex((o) => o.id === id);
  if (index === -1) return false;
  gameState.pendingOrders.splice(index, 1);
  return true;
}
