import { describe, it, expect, beforeEach } from 'vitest';
import { rebuildStaticLabels, syncThemeToggle } from '../src/ui/labels.js';
import { setLang, t } from '../src/ui/i18n.js';
import { setThemeMode } from '../src/ui/theme.js';

beforeEach(() => {
  document.body.innerHTML = `
    <button id="lang-toggle"></button>
    <button id="theme-toggle"><span id="theme-toggle-icon"></span></button>
    <div id="stat-label-cash"></div>
    <div id="panel-title-stocks"></div>
    <div id="tab-market"></div>
    <div id="nav-market-label"></div>
    <button id="reset-btn"></button>
    <button id="tour-btn"></button>
    <button class="close-modal"></button>
    <input id="stock-search" />
    <select id="stock-sector"></select>
    <select id="stock-sort"></select>
  `;
  setLang('ar');
});

describe('rebuildStaticLabels', () => {
  it('sets lang and dir on the document for Arabic and English', () => {
    rebuildStaticLabels();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    setLang('en');
    rebuildStaticLabels();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('translates chrome by id, including the buttons that were a separate run', () => {
    rebuildStaticLabels();
    expect(document.getElementById('stat-label-cash').textContent).toBe(t('cashBalance'));
    expect(document.getElementById('reset-btn').textContent).toBe(t('reset'));
    expect(document.getElementById('tour-btn').textContent).toBe(t('tourStartBtn'));
    expect(document.getElementById('lang-toggle').textContent).toBe(t('languageButton'));
  });

  it('gives the bottom nav an emoji-free label without stripping characters', () => {
    rebuildStaticLabels();
    // The tab keeps its emoji; the nav label is its own translation rather than
    // the tab string with a /^\P{L}+/u strip applied to it.
    expect(document.getElementById('tab-market').textContent).toBe(t('marketTab'));
    expect(document.getElementById('nav-market-label').textContent).toBe(t('marketTabShort'));
    expect(document.getElementById('nav-market-label').textContent).not.toMatch(/^\P{L}/u);
  });

  it('localises the close-button aria-label instead of leaving it Arabic', () => {
    setLang('en');
    rebuildStaticLabels();
    expect(document.querySelector('.close-modal').getAttribute('aria-label')).toBe(t('closeBtn'));
  });

  it('fills both selects and preserves the current choice across a rebuild', () => {
    rebuildStaticLabels();
    const sector = document.getElementById('stock-sector');
    expect(sector.options.length).toBeGreaterThan(1);

    sector.value = sector.options[2].value;
    const chosen = sector.value;
    setLang('en');
    rebuildStaticLabels();
    expect(sector.value).toBe(chosen);
  });

  it('translates the search placeholder', () => {
    rebuildStaticLabels();
    expect(document.getElementById('stock-search').placeholder).toBe(t('searchStocks'));
  });
});

describe('syncThemeToggle', () => {
  it('mirrors the mode into the icon and into an accessible label', () => {
    setThemeMode('dark');
    syncThemeToggle();
    const btn = document.getElementById('theme-toggle');
    expect(document.getElementById('theme-toggle-icon').textContent).toBe('🌙');
    expect(btn.getAttribute('aria-label')).toBe(t('themeDark'));
    expect(btn.getAttribute('title')).toBe(t('themeDark'));

    setThemeMode('light');
    syncThemeToggle();
    expect(document.getElementById('theme-toggle-icon').textContent).toBe('☀️');
    expect(btn.getAttribute('aria-label')).toBe(t('themeLight'));
  });
});
