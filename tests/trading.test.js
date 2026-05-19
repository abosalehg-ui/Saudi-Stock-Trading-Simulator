import { describe, it, expect, beforeEach } from 'vitest';
import { validateOrder, executeMarketOrder, addPendingOrder, checkPendingOrders, cancelPendingOrder } from '../src/engine/trading.js';
import { gameState, stockPrices, resetGameState, initPriceState } from '../src/state.js';

beforeEach(() => {
  resetGameState();
  initPriceState();
  gameState.allow24Trading = true;
});

describe('validateOrder', () => {
  it('rejects unknown stock', () => {
    const r = validateOrder({ symbol: 'XXXX', type: 'buy', kind: 'market', quantityRaw: '10' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('NO_STOCK');
  });

  it('rejects NaN/garbage quantity', () => {
    const r = validateOrder({ symbol: '1180', type: 'buy', kind: 'market', quantityRaw: 'abc' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INVALID_QUANTITY');
  });

  it('rejects negative quantity', () => {
    const r = validateOrder({ symbol: '1180', type: 'buy', kind: 'market', quantityRaw: '-5' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INVALID_QUANTITY');
  });

  it('rejects quantity over the cap', () => {
    const r = validateOrder({ symbol: '1180', type: 'buy', kind: 'market', quantityRaw: '1e10' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('QUANTITY_TOO_LARGE');
  });

  it('accepts a valid market order', () => {
    const r = validateOrder({ symbol: '1180', type: 'buy', kind: 'market', quantityRaw: '10' });
    expect(r.ok).toBe(true);
    expect(r.order.quantity).toBe(10);
  });

  it('rejects limit order without a valid price', () => {
    const r = validateOrder({ symbol: '1180', type: 'buy', kind: 'limit', quantityRaw: '10', priceRaw: '-1' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INVALID_PRICE');
  });

  it('accepts a valid limit order', () => {
    const r = validateOrder({ symbol: '1180', type: 'buy', kind: 'limit', quantityRaw: '10', priceRaw: '80' });
    expect(r.ok).toBe(true);
    expect(r.order.limitPrice).toBe(80);
  });

  it('blocks stop-loss for buy orders', () => {
    const r = validateOrder({ symbol: '1180', type: 'buy', kind: 'stop-loss', quantityRaw: '10', priceRaw: '70' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('STOP_LOSS_SELL_ONLY');
  });

  it('blocks stop-loss when user has no holding', () => {
    const r = validateOrder({ symbol: '1180', type: 'sell', kind: 'stop-loss', quantityRaw: '10', priceRaw: '70' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('NO_HOLDING');
  });
});

describe('executeMarketOrder', () => {
  it('debits cash and adds shares on buy', () => {
    const startCash = gameState.cash;
    const r = executeMarketOrder({ symbol: '1180', type: 'buy', kind: 'market', quantity: 10 });
    expect(r.ok).toBe(true);
    expect(gameState.cash).toBeLessThan(startCash);
    expect(gameState.portfolio['1180'].quantity).toBe(10);
  });

  it('rejects buy when funds are insufficient', () => {
    gameState.cash = 1;
    const r = executeMarketOrder({ symbol: '1180', type: 'buy', kind: 'market', quantity: 100 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INSUFFICIENT_FUNDS');
  });

  it('rejects sell without shares', () => {
    const r = executeMarketOrder({ symbol: '1180', type: 'sell', kind: 'market', quantity: 5 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('INSUFFICIENT_SHARES');
  });

  it('records the transaction', () => {
    executeMarketOrder({ symbol: '1180', type: 'buy', kind: 'market', quantity: 10 });
    expect(gameState.transactions).toHaveLength(1);
    expect(gameState.transactions[0].symbol).toBe('1180');
  });
});

describe('pending orders', () => {
  it('addPendingOrder adds to the queue', () => {
    addPendingOrder({ symbol: '1180', type: 'buy', kind: 'limit', quantity: 5, limitPrice: 50 });
    expect(gameState.pendingOrders).toHaveLength(1);
    expect(gameState.pendingOrders[0].limitPrice).toBe(50);
  });

  it('cancelPendingOrder removes by index', () => {
    addPendingOrder({ symbol: '1180', type: 'buy', kind: 'limit', quantity: 5, limitPrice: 50 });
    expect(cancelPendingOrder(0)).toBe(true);
    expect(gameState.pendingOrders).toHaveLength(0);
  });

  it('limit buy executes when price falls to limit', () => {
    addPendingOrder({ symbol: '1180', type: 'buy', kind: 'limit', quantity: 5, limitPrice: 80 });
    stockPrices['1180'] = 70;
    const executed = checkPendingOrders();
    expect(executed).toBe(1);
    expect(gameState.portfolio['1180'].quantity).toBe(5);
    expect(gameState.pendingOrders).toHaveLength(0);
  });

  it('stop-loss triggers when price drops below stopPrice', () => {
    executeMarketOrder({ symbol: '1180', type: 'buy', kind: 'market', quantity: 10 });
    const holding = gameState.portfolio['1180'];
    expect(holding.quantity).toBe(10);
    addPendingOrder({ symbol: '1180', type: 'sell', kind: 'stop-loss', quantity: 5, stopPrice: 80 });
    stockPrices['1180'] = 75;
    const executed = checkPendingOrders();
    expect(executed).toBe(1);
    expect(gameState.portfolio['1180'].quantity).toBe(5);
  });

  it('stop-loss does not fire when price is above stopPrice', () => {
    executeMarketOrder({ symbol: '1180', type: 'buy', kind: 'market', quantity: 10 });
    addPendingOrder({ symbol: '1180', type: 'sell', kind: 'stop-loss', quantity: 5, stopPrice: 50 });
    stockPrices['1180'] = 90;
    const executed = checkPendingOrders();
    expect(executed).toBe(0);
    expect(gameState.pendingOrders).toHaveLength(1);
  });
});
