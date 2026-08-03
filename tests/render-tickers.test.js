import { describe, it, expect, beforeEach } from 'vitest';
import { updateTicker, updateNewsTicker } from '../src/ui/render.js';
import { stockPrices, activeNews, resetGameState, initPriceState } from '../src/state.js';
import { stocks } from '../src/data/stocks.js';
import { setLang } from '../src/ui/i18n.js';

beforeEach(() => {
  resetGameState();
  initPriceState();
  activeNews.items = [];
  setLang('ar');
  document.body.innerHTML = `
    <div class="ticker"><div class="ticker-content" id="ticker"></div></div>
    <div class="news-ticker"><div class="news-ticker-content" id="news-ticker"></div></div>
    <div id="news-live"></div>
  `;
});

describe('updateTicker', () => {
  it('renders two copies of the list so the marquee can loop seamlessly', () => {
    updateTicker();
    expect(document.querySelectorAll('.ticker-item').length).toBe(stocks.length * 2);
  });

  it('patches text in place rather than replacing nodes, so the animation is not restarted', () => {
    updateTicker();
    const firstNode = document.querySelector('.ticker-item');
    const priceBefore = firstNode.querySelector('.ticker-price').textContent;

    stockPrices[stocks[0].symbol] = stocks[0].basePrice * 1.5;
    updateTicker();

    expect(document.querySelector('.ticker-item')).toBe(firstNode);
    expect(firstNode.querySelector('.ticker-price').textContent).not.toBe(priceBefore);
  });

  it('rebuilds when the language changes, so names are translated', () => {
    updateTicker();
    const arabicName = document.querySelector('.ticker-item strong').textContent;
    setLang('en');
    updateTicker();
    const englishName = document.querySelector('.ticker-item strong').textContent;
    expect(arabicName).toBe(stocks[0].name);
    expect(englishName).toBe(stocks[0].nameEn);
  });

  it('marks gains positive and losses negative', () => {
    stockPrices[stocks[0].symbol] = stocks[0].basePrice * 1.1;
    updateTicker();
    const change = document.querySelector('.ticker-item span:last-child');
    expect(change.className).toBe('positive');

    stockPrices[stocks[0].symbol] = stocks[0].basePrice * 0.9;
    updateTicker();
    expect(document.querySelector('.ticker-item span:last-child').className).toBe('negative');
  });
});

describe('updateNewsTicker', () => {
  it('shows a placeholder when there is no news', () => {
    updateNewsTicker();
    const items = document.querySelectorAll('.news-item');
    expect(items.length).toBe(6);
    expect(items[0].textContent).toContain('لا توجد أخبار');
  });

  it('renders headline text as text, never as markup', () => {
    activeNews.items = [
      { symbol: stocks[0].symbol, templateIndex: 0, type: 'positive', timestamp: 1 },
    ];
    updateNewsTicker();
    const item = document.querySelector('.news-item');
    expect(item.textContent).toContain(stocks[0].name);
    expect(item.querySelector('script')).toBeNull();
  });

  it('skips the rebuild when the headline set is unchanged', () => {
    activeNews.items = [
      { symbol: stocks[0].symbol, templateIndex: 0, type: 'positive', timestamp: 1 },
    ];
    updateNewsTicker();
    const nodeBefore = document.querySelector('.news-item');
    updateNewsTicker();
    expect(document.querySelector('.news-item')).toBe(nodeBefore);
  });

  it('rebuilds once a new headline arrives', () => {
    activeNews.items = [
      { symbol: stocks[0].symbol, templateIndex: 0, type: 'positive', timestamp: 1 },
    ];
    updateNewsTicker();
    activeNews.items.push({
      symbol: stocks[1].symbol,
      templateIndex: 1,
      type: 'negative',
      timestamp: 2,
    });
    updateNewsTicker();
    expect(document.querySelectorAll('.news-item').length).toBe(4);
  });

  it('mirrors the newest headline into the live region the marquee hides', () => {
    activeNews.items = [
      { symbol: stocks[0].symbol, templateIndex: 0, type: 'positive', timestamp: 1 },
    ];
    updateNewsTicker();
    const live = document.getElementById('news-live');
    expect(live.textContent).toContain(stocks[0].name);
  });

  it('clears the live region when news expires', () => {
    activeNews.items = [
      { symbol: stocks[0].symbol, templateIndex: 0, type: 'positive', timestamp: 1 },
    ];
    updateNewsTicker();
    activeNews.items = [];
    updateNewsTicker();
    expect(document.getElementById('news-live').textContent).toBe('');
  });
});
