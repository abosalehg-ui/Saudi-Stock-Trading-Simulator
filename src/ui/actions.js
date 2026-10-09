/**
 * User actions that change the game: placing and cancelling orders, and
 * resetting. They lived in main.js, outside the test suite; here they take
 * their side effects on the app shell (refresh, timers) as bound callbacks.
 */
import { STORAGE_KEY, PRICES_STORAGE_KEY } from '../config.js';
import { gameState, saveGameState, resetGameState, flushPriceState } from '../state.js';
import { findStock } from '../data/stocks.js';
import {
  validateOrder,
  executeMarketOrder,
  addPendingOrder,
  cancelPendingOrder,
} from '../engine/trading.js';
import { isMarketOpen } from '../engine/market-hours.js';
import { renderPendingOrders, displayRandomTips } from './render.js';
import { showOrderError, resetOrderForm } from './stock-details.js';
import { showAlert, showConfirm, closeStockModal } from './modal.js';
import { showToast } from './toast.js';
import { getLang, t } from './i18n.js';

let refreshAll = () => {};
let restartTimers = () => {};

/**
 * @param {{refreshAll?: () => void, restartTimers?: () => void}} callbacks
 */
export function bindActionCallbacks(callbacks) {
  refreshAll = callbacks.refreshAll ?? refreshAll;
  restartTimers = callbacks.restartTimers ?? restartTimers;
}

/**
 * @param {string} error - an error code from validateOrder() or executeMarketOrder()
 * @returns {string} the message to show the user
 */
export function errorMessageFor(error) {
  switch (error) {
    case 'NO_STOCK':
      return t('selectStock');
    case 'INVALID_QUANTITY':
      return t('enterValidQuantity');
    case 'QUANTITY_TOO_LARGE':
      return t('quantityTooLarge');
    case 'INVALID_PRICE':
      return t('enterLimitPrice');
    case 'STOP_LOSS_SELL_ONLY':
      return t('stopLossSellOnly');
    case 'NO_HOLDING':
      return t('noHoldingToSell');
    case 'INSUFFICIENT_FUNDS':
      return t('insufficientFunds');
    case 'INSUFFICIENT_SHARES':
      return t('insufficientShares');
    case 'MARKET_CLOSED':
      return t('marketClosedMessage');
    default:
      return t('invalidNumber');
  }
}

/** Show a rejection under the order form, falling back to a dialog. */
function reject(error) {
  const message = errorMessageFor(error);
  if (!showOrderError(message)) showAlert(message);
}

/**
 * Validate and place an order from the details panel's raw inputs.
 *
 * @param {{symbol: string, type: 'buy'|'sell', kind: 'market'|'limit'|'stop-loss', quantityRaw: any, priceRaw?: any}} input
 * @returns {boolean} true if the order was executed or queued
 */
export function handleSubmitOrder(input) {
  const validation = validateOrder(input);
  if (validation.ok === false) {
    reject(validation.error);
    return false;
  }
  const { order } = validation;

  if (order.kind === 'market') {
    if (!isMarketOpen() && !gameState.allow24Trading) {
      reject('MARKET_CLOSED');
      return false;
    }
    const result = executeMarketOrder(order);
    if (result.ok === false) {
      reject(result.error);
      return false;
    }
    resetOrderForm();
    refreshAll();
    saveGameState();
    // A market order moves the price immediately; persist that now, or a
    // reload right after the trade would show the price snapping back.
    flushPriceState();
    closeStockModal();
    showToast(order.type === 'buy' ? t('purchaseSuccess') : t('sellSuccess'));
    return true;
  }

  addPendingOrder(order);
  resetOrderForm();
  renderPendingOrders();
  saveGameState();
  closeStockModal();
  showToast(order.kind === 'stop-loss' ? t('stopLossAdded') : t('orderAdded'));
  return true;
}

/**
 * Ask for confirmation, then cancel a pending order by id.
 * @param {number} orderId
 * @returns {Promise<boolean>} true if an order was removed
 */
export async function handleCancelOrder(orderId) {
  if (!(await showConfirm(t('confirmCancelOrder')))) return false;
  if (!cancelPendingOrder(orderId)) return false;
  renderPendingOrders();
  saveGameState();
  return true;
}

/**
 * The alert for pending orders that triggered but could not execute, naming
 * each one rather than leaving the user to work out which vanished.
 *
 * @param {Array<{symbol: string, type: 'buy'|'sell', quantity: number}>} cancelled
 * @returns {string}
 */
export function describeCancelledOrders(cancelled) {
  const lang = getLang();
  const lines = cancelled.map((order) => {
    const stock = findStock(order.symbol);
    const name = stock ? (lang === 'ar' ? stock.name : stock.nameEn) : order.symbol;
    const side = order.type === 'buy' ? t('buy') : t('sell');
    return `• ${side} ${order.quantity} ${t('shares')} — ${name} (${order.symbol})`;
  });
  return [t('pendingOrdersAutoCancelled'), ...lines].join('\n');
}

/**
 * Ask for confirmation, then wipe the saved game and start over.
 * @returns {Promise<boolean>} true if the game was reset
 */
export async function resetGame() {
  if (!(await showConfirm(t('confirmReset')))) return false;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PRICES_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
  resetGameState();
  resetOrderForm();
  // resetGameState() puts speed back to 1; the running intervals were built
  // with the old divisor and must be rebuilt.
  restartTimers();
  refreshAll();
  closeStockModal();
  displayRandomTips();
  return true;
}
