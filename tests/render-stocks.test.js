import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  bindRenderCallbacks,
  renderStocks,
  updateStockPrices,
  bindStockListEvents,
} from '../src/ui/render.js';
import { gameState, stockPrices, session, resetGameState, initPriceState } from '../src/state.js';
import { stocks } from '../src/data/stocks.js';

beforeEach(() => {
  resetGameState();
  initPriceState();
  document.body.innerHTML = '<div id="stock-list"></div>';
});

describe('renderStocks', () => {
  it('builds one item per stock (or per filtered stock) with a data-symbol attribute', () => {
    renderStocks();
    const items = document.querySelectorAll('.stock-item');
    expect(items.length).toBe(stocks.length);
    expect(items[0].dataset.symbol).toBe(stocks[0].symbol);
  });

  it('respects the Sharia filter', () => {
    gameState.shariaFilter = true;
    renderStocks();
    const shownCount = document.querySelectorAll('.stock-item').length;
    const expectedCount = stocks.filter((s) => s.isShariaCompliant).length;
    expect(shownCount).toBe(expectedCount);
    expect(shownCount).toBeLessThan(stocks.length);
  });
});

describe('updateStockPrices', () => {
  it('patches price text on the existing node instead of recreating it', () => {
    renderStocks();
    const symbol = stocks[0].symbol;
    const nodeBefore = document.querySelector(`.stock-item[data-symbol="${symbol}"]`);

    stockPrices[symbol] = stocks[0].basePrice * 1.5;
    updateStockPrices();

    const nodeAfter = document.querySelector(`.stock-item[data-symbol="${symbol}"]`);
    expect(nodeAfter).toBe(nodeBefore); // same DOM node, not rebuilt
    expect(nodeAfter.querySelector('.stock-price').textContent).toMatch(/^\d/);
    // Direction is carried by an arrow rather than a +/- sign, matching the
    // ticker, so it survives being read without colour.
    expect(nodeAfter.querySelector('.stock-change').textContent).toContain('▲ 50.00%');
    expect(nodeAfter.querySelector('.stock-change').className).toContain('positive');
  });

  it('toggles the selected class based on session.selectedStock', () => {
    renderStocks();
    const symbol = stocks[0].symbol;
    session.selectedStock = symbol;
    updateStockPrices();
    expect(
      document.querySelector(`.stock-item[data-symbol="${symbol}"]`).classList.contains('selected')
    ).toBe(true);

    session.selectedStock = null;
    updateStockPrices();
    expect(
      document.querySelector(`.stock-item[data-symbol="${symbol}"]`).classList.contains('selected')
    ).toBe(false);
  });

  it('is a no-op for stocks not currently rendered (filtered out)', () => {
    gameState.shariaFilter = true;
    renderStocks();
    // Should not throw even though most symbols aren't in stockItemRefs
    expect(() => updateStockPrices()).not.toThrow();
  });
});

describe('bindStockListEvents (event delegation)', () => {
  it('dispatches the clicked stock symbol to onSelectStock', () => {
    const onSelectStock = vi.fn();
    bindRenderCallbacks({ onSelectStock });
    renderStocks();
    bindStockListEvents();

    const symbol = stocks[1].symbol;
    document.querySelector(`.stock-item[data-symbol="${symbol}"] .stock-name`).click();
    expect(onSelectStock).toHaveBeenCalledWith(symbol);
  });

  it('dispatches on Enter/Space keydown targeting a stock item', () => {
    const onSelectStock = vi.fn();
    bindRenderCallbacks({ onSelectStock });
    renderStocks();
    bindStockListEvents();

    const symbol = stocks[2].symbol;
    const item = document.querySelector(`.stock-item[data-symbol="${symbol}"]`);
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelectStock).toHaveBeenCalledWith(symbol);
  });

  it('ignores clicks outside any stock item', () => {
    const onSelectStock = vi.fn();
    bindRenderCallbacks({ onSelectStock });
    renderStocks();
    bindStockListEvents();

    document.getElementById('stock-list').click();
    expect(onSelectStock).not.toHaveBeenCalled();
  });
});
