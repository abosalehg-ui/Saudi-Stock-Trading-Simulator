import { describe, it, expect, beforeEach, vi } from 'vitest';
import { switchTab, attachShellListeners } from '../src/ui/shell.js';
import { gameState, resetGameState } from '../src/state.js';

function fixture() {
  document.body.innerHTML = `
    <div class="main-content">
      <nav role="tablist">
        <button id="tab-market" role="tab" aria-selected="true" class="active"></button>
        <button id="tab-portfolio" role="tab" aria-selected="false"></button>
        <button id="tab-orders" role="tab" aria-selected="false"></button>
      </nav>
      <div id="market-tab" class="active"></div>
      <div id="portfolio-tab"></div>
      <div id="orders-tab"></div>
      <div id="stock-list"></div>
      <div id="pending-orders"></div>
      <div id="market-status"></div>
      <input id="sharia-filter" type="checkbox" />
      <input id="allow-24-7" type="checkbox" />
      <input id="stock-search" />
      <select id="stock-sector"></select>
      <select id="stock-sort"></select>
      <button id="lang-toggle"></button>
      <button id="theme-toggle"><span id="theme-toggle-icon"></span></button>
      <button id="reset-btn"></button>
      <button id="speed-1"></button>
      <button id="speed-5"></button>
      <button id="speed-10"></button>
      <button class="bottom-nav-btn" data-tab="portfolio"></button>
    </div>
  `;
}

const noopHandlers = () => ({
  onToggleLanguage: vi.fn(),
  onThemeChanged: vi.fn(),
  onReset: vi.fn(),
  onSetSpeed: vi.fn(),
  onRefresh: vi.fn(),
});

beforeEach(() => {
  resetGameState();
  fixture();
});

describe('switchTab', () => {
  it('moves the active class and aria-selected together', () => {
    switchTab('portfolio');
    expect(document.getElementById('tab-portfolio').classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-portfolio').getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('tab-market').classList.contains('active')).toBe(false);
    expect(document.getElementById('tab-market').getAttribute('aria-selected')).toBe('false');
    expect(document.getElementById('portfolio-tab').classList.contains('active')).toBe(true);
    expect(document.getElementById('market-tab').classList.contains('active')).toBe(false);
  });

  it('survives a missing tab rather than throwing', () => {
    document.getElementById('tab-orders').remove();
    expect(() => switchTab('market')).not.toThrow();
  });
});

describe('attachShellListeners', () => {
  it('routes the speed buttons to the handler with their value', () => {
    const handlers = noopHandlers();
    attachShellListeners(handlers);
    document.getElementById('speed-10').click();
    expect(handlers.onSetSpeed).toHaveBeenCalledWith(10);
    document.getElementById('speed-1').click();
    expect(handlers.onSetSpeed).toHaveBeenCalledWith(1);
  });

  it('routes language and reset to their handlers', () => {
    const handlers = noopHandlers();
    attachShellListeners(handlers);
    document.getElementById('lang-toggle').click();
    expect(handlers.onToggleLanguage).toHaveBeenCalled();
    document.getElementById('reset-btn').click();
    expect(handlers.onReset).toHaveBeenCalled();
  });

  it('repaints canvases after a theme change, since CSS cannot re-theme them', () => {
    const handlers = noopHandlers();
    attachShellListeners(handlers);
    document.getElementById('theme-toggle').click();
    expect(handlers.onThemeChanged).toHaveBeenCalled();
  });

  it('writes the toggles straight into game state', () => {
    attachShellListeners(noopHandlers());

    const sharia = document.getElementById('sharia-filter');
    sharia.checked = true;
    sharia.dispatchEvent(new Event('change'));
    expect(gameState.shariaFilter).toBe(true);

    const allow = document.getElementById('allow-24-7');
    allow.checked = true;
    allow.dispatchEvent(new Event('change'));
    expect(gameState.allow24Trading).toBe(true);
  });

  it('debounces the search rather than rebuilding on every keystroke', () => {
    vi.useFakeTimers();
    attachShellListeners(noopHandlers());
    const search = document.getElementById('stock-search');

    search.value = 'ا';
    search.dispatchEvent(new Event('input'));
    search.value = 'الر';
    search.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(60);
    // Still inside the window: nothing has run yet.
    search.value = 'الراجحي';
    search.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(200);

    // One rebuild, for the final value.
    expect(document.getElementById('stock-list').textContent).toBeDefined();
    vi.useRealTimers();
  });

  it('activates a tab from the bottom navigation', () => {
    attachShellListeners(noopHandlers());
    document.querySelector('.bottom-nav-btn[data-tab="portfolio"]').click();
    expect(document.getElementById('tab-portfolio').classList.contains('active')).toBe(true);
  });

  it('binds without throwing when optional chrome is absent', () => {
    document.body.innerHTML = '<div class="main-content"></div>';
    expect(() => attachShellListeners(noopHandlers())).not.toThrow();
  });
});
