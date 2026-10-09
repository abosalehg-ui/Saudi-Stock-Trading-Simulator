import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/ui/chart.js', () => ({ renderChart: vi.fn(), destroyChart: vi.fn() }));
vi.mock('../src/ui/candlestick.js', () => ({ renderCandlestick: vi.fn() }));

import {
  bindActionCallbacks,
  errorMessageFor,
  handleSubmitOrder,
  handleCancelOrder,
  describeCancelledOrders,
  resetGame,
} from '../src/ui/actions.js';
import { renderStockDetails, resetOrderForm, getOrderFormState } from '../src/ui/stock-details.js';
import {
  gameState,
  stockPrices,
  session,
  resetGameState,
  initPriceState,
  saveGameState,
} from '../src/state.js';
import { addPendingOrder } from '../src/engine/trading.js';
import { setLang, t } from '../src/ui/i18n.js';
import { STORAGE_KEY } from '../src/config.js';

const SYMBOL = '1180';

const refreshAll = vi.fn();
const restartTimers = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  resetGameState();
  initPriceState();
  resetOrderForm();
  setLang('ar');
  gameState.allow24Trading = true;
  session.selectedStock = SYMBOL;
  bindActionCallbacks({ refreshAll, restartTimers });
  document.body.innerHTML = `
    <div id="stock-modal" class="modal" style="display: none"><div id="stock-details"></div></div>
    <div id="alert-modal" class="modal" style="display: none">
      <div id="alert-modal-body"></div><button id="alert-modal-ok">ok</button>
    </div>
    <div id="confirm-modal" class="modal" style="display: none">
      <div id="confirm-modal-body"></div>
      <button id="confirm-modal-yes">yes</button><button id="confirm-modal-no">no</button>
    </div>
    <div id="pending-orders"></div>
    <div id="tips-list"></div>
  `;
  renderStockDetails(SYMBOL);
});

const errorText = () => document.getElementById('order-error');
const alertText = () => document.getElementById('alert-modal-body').textContent;
const market = (overrides = {}) => ({
  symbol: SYMBOL,
  type: 'buy',
  kind: 'market',
  quantityRaw: '10',
  ...overrides,
});

describe('errorMessageFor', () => {
  it('maps every engine error code to its own message', () => {
    const codes = {
      NO_STOCK: 'selectStock',
      INVALID_QUANTITY: 'enterValidQuantity',
      QUANTITY_TOO_LARGE: 'quantityTooLarge',
      INVALID_PRICE: 'enterLimitPrice',
      STOP_LOSS_SELL_ONLY: 'stopLossSellOnly',
      NO_HOLDING: 'noHoldingToSell',
      INSUFFICIENT_FUNDS: 'insufficientFunds',
      INSUFFICIENT_SHARES: 'insufficientShares',
      MARKET_CLOSED: 'marketClosedMessage',
    };
    Object.entries(codes).forEach(([code, key]) => {
      expect(errorMessageFor(code)).toBe(t(key));
    });
    expect(errorMessageFor('SOMETHING_ELSE')).toBe(t('invalidNumber'));
  });
});

describe('handleSubmitOrder', () => {
  it('executes a market buy, refreshes and clears the form', () => {
    const cashBefore = gameState.cash;
    expect(handleSubmitOrder(market())).toBe(true);
    expect(gameState.portfolio[SYMBOL].quantity).toBe(10);
    expect(gameState.cash).toBeLessThan(cashBefore);
    expect(refreshAll).toHaveBeenCalled();
    expect(getOrderFormState()).toMatchObject({ kind: 'market', quantity: '', price: '' });
    expect(document.getElementById('order-quantity').value).toBe('');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).portfolio[SYMBOL].quantity).toBe(10);
  });

  it('shows a validation error inline, under the form, not in a dialog', () => {
    expect(handleSubmitOrder(market({ quantityRaw: 'abc' }))).toBe(false);
    expect(errorText().hidden).toBe(false);
    expect(errorText().textContent).toBe(t('enterValidQuantity'));
    expect(document.getElementById('alert-modal').style.display).toBe('none');
  });

  it('accepts a quantity typed in Arabic-Indic digits', () => {
    expect(handleSubmitOrder(market({ quantityRaw: '١٢' }))).toBe(true);
    expect(gameState.portfolio[SYMBOL].quantity).toBe(12);
  });

  it('refuses a market order while the market is closed', () => {
    gameState.allow24Trading = false;
    vi.setSystemTime(new Date('2026-08-21T12:00:00Z')); // Friday: Tadawul closed
    try {
      expect(handleSubmitOrder(market())).toBe(false);
      expect(errorText().textContent).toBe(t('marketClosedMessage'));
      expect(gameState.portfolio[SYMBOL]).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports insufficient funds and leaves the price where it was', () => {
    gameState.cash = 1;
    const before = stockPrices[SYMBOL];
    expect(handleSubmitOrder(market())).toBe(false);
    expect(errorText().textContent).toBe(t('insufficientFunds'));
    expect(stockPrices[SYMBOL]).toBe(before);
  });

  it('queues a limit order, renders it as pending and resets the visible form', () => {
    const limit = document.querySelector('input[name="orderType"][value="limit"]');
    limit.checked = true;
    limit.dispatchEvent(new Event('change'));
    expect(handleSubmitOrder(market({ kind: 'limit', priceRaw: '1' }))).toBe(true);
    expect(document.querySelector('input[name="orderType"]:checked').value).toBe('market');
    expect(document.getElementById('order-price').hidden).toBe(true);
    expect(gameState.pendingOrders).toHaveLength(1);
    expect(document.querySelectorAll('#pending-orders .order-item')).toHaveLength(1);
  });

  it('rejects a pending sell for shares the user does not hold', () => {
    expect(handleSubmitOrder(market({ type: 'sell', kind: 'limit', priceRaw: '999' }))).toBe(false);
    expect(errorText().textContent).toBe(t('noHoldingToSell'));
    expect(gameState.pendingOrders).toHaveLength(0);
  });

  it('falls back to a dialog when there is no order form on screen', () => {
    document.getElementById('stock-details').innerHTML = '';
    handleSubmitOrder(market({ quantityRaw: '' }));
    expect(alertText()).toBe(t('enterValidQuantity'));
  });
});

describe('handleCancelOrder', () => {
  it('cancels only after the user confirms', async () => {
    const order = addPendingOrder({
      symbol: SYMBOL,
      type: 'buy',
      kind: 'limit',
      quantity: 1,
      limitPrice: 1,
    });

    const declined = handleCancelOrder(order.id);
    document.getElementById('confirm-modal-no').click();
    expect(await declined).toBe(false);
    expect(gameState.pendingOrders).toHaveLength(1);

    const accepted = handleCancelOrder(order.id);
    document.getElementById('confirm-modal-yes').click();
    expect(await accepted).toBe(true);
    expect(gameState.pendingOrders).toHaveLength(0);
  });
});

describe('describeCancelledOrders', () => {
  it('names each order that was dropped', () => {
    const text = describeCancelledOrders([
      { symbol: SYMBOL, type: 'sell', quantity: 5 },
      { symbol: 'NOPE', type: 'buy', quantity: 2 },
    ]);
    const lines = text.split('\n');
    expect(lines[0]).toBe(t('pendingOrdersAutoCancelled'));
    expect(lines[1]).toContain(SYMBOL);
    expect(lines[1]).toContain('5');
    expect(lines[1]).toContain(t('sell'));
    expect(lines[2]).toContain('NOPE');
  });
});

describe('resetGame', () => {
  it('wipes the save and restarts the timers once confirmed', async () => {
    gameState.cash = 1;
    gameState.speed = 10;
    saveGameState();
    const reset = resetGame();
    document.getElementById('confirm-modal-yes').click();
    expect(await reset).toBe(true);
    expect(gameState.speed).toBe(1);
    expect(gameState.cash).toBe(gameState.initialCapital);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(restartTimers).toHaveBeenCalledOnce();
    expect(refreshAll).toHaveBeenCalled();
  });

  it('does nothing when the user backs out', async () => {
    gameState.cash = 1;
    const reset = resetGame();
    document.getElementById('confirm-modal-no').click();
    expect(await reset).toBe(false);
    expect(gameState.cash).toBe(1);
    expect(restartTimers).not.toHaveBeenCalled();
  });
});
