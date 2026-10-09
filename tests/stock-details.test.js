import { describe, it, expect, beforeEach, vi } from 'vitest';

// Both renderers touch a real 2D canvas context, which jsdom does not provide.
// They are dynamically imported by the module under test, so stubbing them here
// keeps these tests about the panel's own behaviour.
const renderChart = vi.fn();
const renderCandlestick = vi.fn();
vi.mock('../src/ui/chart.js', () => ({ renderChart, destroyChart: vi.fn() }));
vi.mock('../src/ui/candlestick.js', () => ({ renderCandlestick }));

import {
  renderStockDetails,
  patchStockDetails,
  bindStockDetailsCallbacks,
  getIndicatorState,
  getOrderFormState,
  resetOrderForm,
  showOrderError,
} from '../src/ui/stock-details.js';
import { stocks } from '../src/data/stocks.js';
import { gameState, stockPrices, session, resetGameState } from '../src/state.js';
import { setLang } from '../src/ui/i18n.js';

const symbol = stocks[0].symbol;

beforeEach(() => {
  vi.clearAllMocks();
  resetOrderForm();
  resetGameState();
  setLang('ar');
  document.body.innerHTML = '<div id="stock-details"></div>';
  session.selectedStock = symbol;
  gameState.allow24Trading = true;
});

/** Reset the module-level indicator state by unchecking whatever is on. */
function clearIndicators() {
  ['ind-candle', 'ind-sma20', 'ind-sma50', 'ind-rsi', 'ind-macd'].forEach((id) => {
    const box = document.getElementById(id);
    if (box?.checked) {
      box.checked = false;
      box.dispatchEvent(new Event('change'));
    }
  });
}

describe('renderStockDetails', () => {
  it('builds the order form with the price field hidden for a market order', () => {
    renderStockDetails(symbol);
    expect(document.getElementById('order-quantity')).toBeTruthy();
    expect(document.getElementById('order-price').hidden).toBe(true);
    expect(document.querySelector('input[name="orderType"]:checked').value).toBe('market');
  });

  it('reveals the price field for limit and stop-loss, and relabels it', () => {
    renderStockDetails(symbol);
    const priceInput = document.getElementById('order-price');
    const limit = document.querySelector('input[name="orderType"][value="limit"]');

    limit.checked = true;
    limit.dispatchEvent(new Event('change'));
    expect(priceInput.hidden).toBe(false);
    const limitPlaceholder = priceInput.placeholder;

    const stop = document.querySelector('input[name="orderType"][value="stop-loss"]');
    stop.checked = true;
    stop.dispatchEvent(new Event('change'));
    expect(priceInput.hidden).toBe(false);
    expect(priceInput.placeholder).not.toBe(limitPlaceholder);
  });

  it('escapes a stock name rather than letting it become markup', () => {
    // The panel builds its markup as a string; this is the guarantee that the
    // html`` tag is actually escaping interpolations.
    const evil = { ...stocks[0], symbol: 'XSS1', name: '<img src=x onerror=alert(1)>' };
    stocks.push(evil);
    stockPrices.XSS1 = 10;
    try {
      renderStockDetails('XSS1');
      expect(document.querySelector('#stock-details img')).toBeNull();
      expect(document.getElementById('stock-title').textContent).toContain('<img');
    } finally {
      stocks.pop();
      delete stockPrices.XSS1;
    }
  });

  it('sends the typed order through to the submit callback', () => {
    const onSubmitOrder = vi.fn();
    bindStockDetailsCallbacks({ onSubmitOrder });
    renderStockDetails(symbol);

    document.getElementById('order-quantity').value = '25';
    const limit = document.querySelector('input[name="orderType"][value="limit"]');
    limit.checked = true;
    limit.dispatchEvent(new Event('change'));
    document.getElementById('order-price').value = '88.5';
    document.getElementById('order-buy').click();

    expect(onSubmitOrder).toHaveBeenCalledWith({
      symbol,
      type: 'buy',
      kind: 'limit',
      quantityRaw: '25',
      priceRaw: '88.5',
    });
  });

  it('sends type "sell" from the sell button', () => {
    const onSubmitOrder = vi.fn();
    bindStockDetailsCallbacks({ onSubmitOrder });
    renderStockDetails(symbol);
    document.getElementById('order-quantity').value = '3';
    document.getElementById('order-sell').click();
    expect(onSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sell', kind: 'market', quantityRaw: '3' })
    );
  });

  it('shows the market-closed warning only while the market is shut', () => {
    gameState.allow24Trading = false;
    vi.setSystemTime(new Date('2026-08-21T12:00:00Z')); // Friday: Tadawul closed
    renderStockDetails(symbol);
    expect(document.getElementById('stock-detail-market-warning').hidden).toBe(false);

    gameState.allow24Trading = true;
    renderStockDetails(symbol);
    expect(document.getElementById('stock-detail-market-warning').hidden).toBe(true);
    vi.useRealTimers();
  });

  it('carries the indicator selection across a rebuild', () => {
    renderStockDetails(symbol);
    clearIndicators();

    const sma20 = document.getElementById('ind-sma20');
    sma20.checked = true;
    sma20.dispatchEvent(new Event('change'));
    expect(getIndicatorState().sma20).toBe(true);

    // A theme or language switch rebuilds the panel; the choice must survive.
    renderStockDetails(symbol);
    expect(document.getElementById('ind-sma20').checked).toBe(true);
    clearIndicators();
  });

  it('switches to the candlestick renderer when that box is ticked', async () => {
    renderStockDetails(symbol);
    clearIndicators();
    const candle = document.getElementById('ind-candle');
    candle.checked = true;
    candle.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(renderCandlestick).toHaveBeenCalled());
    clearIndicators();
  });
});

describe('patchStockDetails', () => {
  it('updates the price in place without destroying user input', async () => {
    renderStockDetails(symbol);
    document.getElementById('order-quantity').value = '42';
    const formNode = document.getElementById('order-quantity');

    stockPrices[symbol] = stocks[0].basePrice * 1.5;
    await patchStockDetails(symbol);

    expect(document.getElementById('stock-detail-price-value').textContent).toContain(
      (stocks[0].basePrice * 1.5).toFixed(2)
    );
    // Same node, same value: the panel was patched, not rebuilt.
    expect(document.getElementById('order-quantity')).toBe(formNode);
    expect(document.getElementById('order-quantity').value).toBe('42');
  });

  it('marks a rise and a fall with different classes', async () => {
    renderStockDetails(symbol);

    stockPrices[symbol] = stocks[0].basePrice * 1.2;
    await patchStockDetails(symbol);
    expect(document.getElementById('stock-detail-change-value').className).toBe('positive');

    stockPrices[symbol] = stocks[0].basePrice * 0.8;
    await patchStockDetails(symbol);
    expect(document.getElementById('stock-detail-change-value').className).toBe('negative');
  });

  it('does nothing when the panel is showing a different stock', async () => {
    renderStockDetails(symbol);
    const before = document.getElementById('stock-detail-price-value').textContent;
    await patchStockDetails(stocks[1].symbol);
    expect(document.getElementById('stock-detail-price-value').textContent).toBe(before);
  });

  it('is a no-op when no panel has been built', async () => {
    document.body.innerHTML = '<div id="stock-details"></div>';
    await expect(patchStockDetails(symbol)).resolves.toBeUndefined();
  });
});

describe('order form state across rebuilds', () => {
  function chooseKind(kind) {
    const radio = document.querySelector(`input[name="orderType"][value="${kind}"]`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
  }
  function type(id, value) {
    const el = document.getElementById(id);
    el.value = value;
    el.dispatchEvent(new Event('input'));
  }

  it('keeps the order kind, quantity and price when the same stock is rebuilt', () => {
    renderStockDetails(symbol);
    chooseKind('stop-loss');
    type('order-quantity', '7');
    type('order-price', '12.5');

    // A language/theme/layout change rebuilds the panel for the same stock.
    renderStockDetails(symbol);

    expect(document.querySelector('input[name="orderType"]:checked').value).toBe('stop-loss');
    expect(document.getElementById('order-price').hidden).toBe(false);
    expect(document.getElementById('order-quantity').value).toBe('7');
    expect(document.getElementById('order-price').value).toBe('12.5');
  });

  it('a rebuilt stop-loss form still submits a stop-loss, not a market order', () => {
    const onSubmitOrder = vi.fn();
    bindStockDetailsCallbacks({ onSubmitOrder });
    renderStockDetails(symbol);
    chooseKind('stop-loss');
    type('order-quantity', '2');
    type('order-price', '10');
    renderStockDetails(symbol);
    document.getElementById('order-sell').click();
    expect(onSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'stop-loss', quantityRaw: '2', priceRaw: '10' })
    );
  });

  it('starts from a fresh market order when a different stock is picked', () => {
    renderStockDetails(symbol);
    chooseKind('limit');
    type('order-quantity', '9');
    session.selectedStock = stocks[1].symbol;
    renderStockDetails(stocks[1].symbol);
    expect(document.querySelector('input[name="orderType"]:checked').value).toBe('market');
    expect(document.getElementById('order-quantity').value).toBe('');
    expect(getOrderFormState().symbol).toBe(stocks[1].symbol);
  });

  it('labels the order-type group as a whole, not as one of its options', () => {
    renderStockDetails(symbol);
    expect(document.querySelector('[role="radiogroup"]').getAttribute('aria-label')).toBe(
      'نوع الأمر'
    );
  });

  it('describes the chart with the current price for assistive tech', () => {
    renderStockDetails(symbol);
    const label = document.getElementById('price-chart').getAttribute('aria-label');
    expect(label).toContain(stockPrices[symbol].toFixed(2));
  });

  it('shows an inline error, and clears it when the user edits the field', () => {
    renderStockDetails(symbol);
    const error = document.getElementById('order-error');
    expect(showOrderError('خطأ')).toBe(true);
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('خطأ');
    type('order-quantity', '1');
    expect(error.hidden).toBe(true);
  });

  it('reports that there is nowhere to show an inline error without the panel', () => {
    document.body.innerHTML = '';
    expect(showOrderError('x')).toBe(false);
  });
});
