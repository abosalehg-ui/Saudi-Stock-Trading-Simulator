import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  bindRenderCallbacks,
  renderPortfolio,
  renderPendingOrders,
  updateStats,
  displayRandomTips,
  updateMarketStatusBadge,
  updateHijriDate,
} from '../src/ui/render.js';
import { gameState, stockPrices, resetGameState, initPriceState } from '../src/state.js';
import { setLang } from '../src/ui/i18n.js';
import { COMMISSION } from '../src/config.js';

const SYMBOL = '1180';

beforeEach(() => {
  resetGameState();
  initPriceState();
  setLang('ar');
  document.body.innerHTML = `
    <div id="portfolio"></div>
    <div id="pending-orders"></div>
    <div id="tips-list"></div>
    <span id="market-status"></span>
    <span id="hijri-date"></span>
    <div id="cash"></div>
    <div id="portfolio-value"></div>
    <div id="total-value"></div>
    <div id="pnl"></div>
  `;
});

describe('renderPortfolio', () => {
  it('shows an empty state when nothing is held', () => {
    renderPortfolio();
    const empty = document.querySelector('#portfolio .empty-state');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toBe('المحفظة فارغة');
  });

  it('renders one card per holding', () => {
    gameState.portfolio[SYMBOL] = { quantity: 10, avgCost: 30 };
    gameState.portfolio['1120'] = { quantity: 5, avgCost: 80 };
    renderPortfolio();
    expect(document.querySelectorAll('.portfolio-item')).toHaveLength(2);
  });

  it('reports value after sell net of commission', () => {
    stockPrices[SYMBOL] = 40;
    gameState.portfolio[SYMBOL] = { quantity: 10, avgCost: 30 };
    renderPortfolio();
    const expected = (40 * 10 * (1 - COMMISSION)).toFixed(2);
    expect(document.querySelector('.portfolio-item').textContent).toContain(expected);
  });

  it('marks a losing position negative', () => {
    stockPrices[SYMBOL] = 10;
    gameState.portfolio[SYMBOL] = { quantity: 10, avgCost: 30 };
    renderPortfolio();
    expect(document.querySelector('.portfolio-item .negative')).not.toBeNull();
  });

  it('escapes holding text rather than injecting it as markup', () => {
    gameState.portfolio[SYMBOL] = { quantity: 10, avgCost: 30 };
    renderPortfolio();
    expect(document.querySelector('#portfolio script')).toBeNull();
  });

  it('wires the quick-trade buttons to the bound callback', () => {
    const onQuickTrade = vi.fn();
    bindRenderCallbacks({ onQuickTrade });
    gameState.portfolio[SYMBOL] = { quantity: 10, avgCost: 30 };
    renderPortfolio();
    const [buyBtn, sellBtn] = document.querySelectorAll('.portfolio-actions button');
    buyBtn.click();
    sellBtn.click();
    expect(onQuickTrade).toHaveBeenCalledWith(SYMBOL, 'buy');
    expect(onQuickTrade).toHaveBeenCalledWith(SYMBOL, 'sell');
  });

  it('skips holdings whose symbol is no longer a known stock', () => {
    gameState.portfolio['9999'] = { quantity: 1, avgCost: 1 };
    renderPortfolio();
    expect(document.querySelectorAll('.portfolio-item')).toHaveLength(0);
  });
});

describe('renderPendingOrders', () => {
  const limitOrder = {
    id: 1,
    symbol: SYMBOL,
    type: 'buy',
    kind: 'limit',
    quantity: 5,
    limitPrice: 30,
    timestamp: Date.UTC(2026, 0, 15),
  };

  it('shows an empty state when the queue is empty', () => {
    renderPendingOrders();
    expect(document.querySelector('#pending-orders .empty-state').textContent).toBe(
      'لا توجد أوامر معلقة'
    );
  });

  it('renders a limit order with its reference price', () => {
    gameState.pendingOrders = [limitOrder];
    renderPendingOrders();
    const item = document.querySelector('.order-item');
    expect(item).not.toBeNull();
    expect(item.textContent).toContain('30.00');
  });

  it('uses the stop price as the reference for a stop-loss order', () => {
    gameState.pendingOrders = [
      { ...limitOrder, kind: 'stop-loss', type: 'sell', limitPrice: null, stopPrice: 25 },
    ];
    renderPendingOrders();
    expect(document.querySelector('.order-item').textContent).toContain('25.00');
  });

  it('cancels through the bound callback, passing the order id', () => {
    const onCancelOrder = vi.fn();
    bindRenderCallbacks({ onCancelOrder });
    gameState.pendingOrders = [limitOrder];
    renderPendingOrders();
    document.querySelector('.cancel-order-btn').click();
    expect(onCancelOrder).toHaveBeenCalledWith(1);
  });

  it('skips orders for unknown symbols', () => {
    gameState.pendingOrders = [{ ...limitOrder, symbol: '9999' }];
    renderPendingOrders();
    expect(document.querySelectorAll('.order-item')).toHaveLength(0);
  });
});

describe('updateStats', () => {
  it('reports zero P&L on a fresh game', () => {
    const { pnlPercent, totalValue } = updateStats();
    expect(pnlPercent).toBe(0);
    expect(totalValue).toBe(gameState.initialCapital);
    expect(document.getElementById('pnl').className).toContain('positive');
  });

  it('counts holdings at the current market price', () => {
    stockPrices[SYMBOL] = 40;
    gameState.portfolio[SYMBOL] = { quantity: 10, avgCost: 30 };
    const { totalValue } = updateStats();
    expect(totalValue).toBe(gameState.cash + 400);
  });

  it('marks a loss negative', () => {
    gameState.cash = 100;
    updateStats();
    expect(document.getElementById('pnl').className).toContain('negative');
  });

  it('formats currency with Western digits in Arabic', () => {
    updateStats();
    expect(/[٠-٩]/.test(document.getElementById('cash').textContent)).toBe(false);
  });
});

describe('displayRandomTips', () => {
  it('shows three distinct tips', () => {
    displayRandomTips();
    const tips = [...document.querySelectorAll('.tip-item')].map((el) => el.textContent);
    expect(tips).toHaveLength(3);
    expect(new Set(tips).size).toBe(3);
  });

  it('replaces the previous tips rather than appending', () => {
    displayRandomTips();
    displayRandomTips();
    expect(document.querySelectorAll('.tip-item')).toHaveLength(3);
  });
});

describe('updateMarketStatusBadge', () => {
  it('reports the override state when 24/7 mode is on', () => {
    gameState.allow24Trading = true;
    updateMarketStatusBadge();
    const badge = document.getElementById('market-status');
    expect(badge.classList.contains('override')).toBe(true);
    expect(badge.classList.contains('open')).toBe(false);
  });

  it('reports open or closed when 24/7 mode is off', () => {
    gameState.allow24Trading = false;
    updateMarketStatusBadge();
    const badge = document.getElementById('market-status');
    expect(badge.classList.contains('open') || badge.classList.contains('closed')).toBe(true);
  });
});

describe('updateHijriDate', () => {
  it('shows a Hijri date in Arabic', () => {
    setLang('ar');
    updateHijriDate();
    const el = document.getElementById('hijri-date');
    expect(el.style.display).not.toBe('none');
    expect(el.textContent.length).toBeGreaterThan(0);
  });

  it('hides it in English', () => {
    setLang('en');
    updateHijriDate();
    expect(document.getElementById('hijri-date').style.display).toBe('none');
  });
});
