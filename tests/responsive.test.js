import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initResponsiveLayout,
  isDesktopLayout,
  applyLayout,
  toggleMoreSheet,
  isMoreSheetOpen,
  syncBottomNav,
} from '../src/ui/responsive.js';

/** Minimal matchMedia stand-in: jsdom ships no real one. */
function stubMatchMedia(matches) {
  const listeners = [];
  window.matchMedia = () => ({
    matches,
    addEventListener: (_type, fn) => listeners.push(fn),
    removeEventListener: () => {},
  });
  return {
    fire(next) {
      window.matchMedia = () => ({
        matches: next,
        addEventListener: () => {},
        removeEventListener: () => {},
      });
      listeners.forEach((fn) => fn({ matches: next }));
    },
  };
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  document.body.innerHTML = `
    <div id="action-bar-slot"><div class="action-bar" id="action-bar"><button id="glossary-btn"></button></div></div>
    <section id="stock-panel"><div id="stock-panel-body"></div></section>
    <div id="stock-modal"><div class="modal-content"><div id="stock-details"></div></div></div>
    <nav class="bottom-nav">
      <button class="bottom-nav-btn" data-tab="market"></button>
      <button class="bottom-nav-btn" data-tab="portfolio"></button>
      <button class="bottom-nav-btn" id="nav-more" aria-expanded="false"></button>
    </nav>
    <div class="sheet" id="more-sheet"><div class="sheet-body" id="more-sheet-body"></div></div>
  `;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('initResponsiveLayout', () => {
  it('keeps the action bar in its slot and the details in the modal on a phone', () => {
    stubMatchMedia(false);
    initResponsiveLayout();
    expect(isDesktopLayout()).toBe(false);
    expect(document.getElementById('action-bar').parentElement.id).toBe('more-sheet-body');
    expect(document.getElementById('stock-details').parentElement.className).toBe('modal-content');
  });

  it('moves both nodes to their desktop hosts above the breakpoint', () => {
    stubMatchMedia(true);
    initResponsiveLayout();
    expect(isDesktopLayout()).toBe(true);
    expect(document.getElementById('action-bar').parentElement.id).toBe('action-bar-slot');
    expect(document.getElementById('stock-details').parentElement.id).toBe('stock-panel-body');
  });

  it('moves the nodes and notifies when the breakpoint is crossed', () => {
    const mq = stubMatchMedia(false);
    const seen = [];
    initResponsiveLayout({ onChange: (desktop) => seen.push(desktop) });
    expect(document.getElementById('stock-details').parentElement.className).toBe('modal-content');

    mq.fire(true);

    expect(seen).toEqual([true]);
    expect(document.getElementById('stock-details').parentElement.id).toBe('stock-panel-body');
    expect(document.getElementById('action-bar').parentElement.id).toBe('action-bar-slot');
  });

  it('falls back to the phone layout when matchMedia is unavailable', () => {
    // @ts-expect-error deliberately removing the API to exercise the guard
    window.matchMedia = undefined;
    initResponsiveLayout();
    expect(isDesktopLayout()).toBe(false);
    expect(document.getElementById('stock-details').parentElement.className).toBe('modal-content');
  });

  it('is idempotent — re-applying does not detach or re-append a settled node', () => {
    stubMatchMedia(true);
    initResponsiveLayout();
    const node = document.getElementById('stock-details');
    applyLayout();
    expect(document.getElementById('stock-details')).toBe(node);
    expect(document.getElementById('stock-panel-body').children).toHaveLength(1);
  });
});

describe('toggleMoreSheet', () => {
  it('opens and closes the sheet, keeping aria-expanded in sync', () => {
    stubMatchMedia(false);
    initResponsiveLayout();
    const sheet = document.getElementById('more-sheet');
    const btn = document.getElementById('nav-more');

    toggleMoreSheet(true);
    expect(sheet.classList.contains('open')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(isMoreSheetOpen()).toBe(true);

    toggleMoreSheet(false);
    expect(sheet.classList.contains('open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(isMoreSheetOpen()).toBe(false);
  });
});

describe('syncBottomNav', () => {
  it('marks only the active tab, and exposes it via aria-current', () => {
    syncBottomNav('portfolio');
    const [market, portfolio] = document.querySelectorAll('.bottom-nav-btn[data-tab]');
    expect(market.classList.contains('active')).toBe(false);
    expect(market.getAttribute('aria-current')).toBe('false');
    expect(portfolio.classList.contains('active')).toBe(true);
    expect(portfolio.getAttribute('aria-current')).toBe('page');
  });

  it('ignores the button that opens the sheet, which is not a tab', () => {
    syncBottomNav('market');
    expect(document.getElementById('nav-more').classList.contains('active')).toBe(false);
  });
});
