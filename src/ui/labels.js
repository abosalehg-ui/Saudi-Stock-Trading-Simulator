/**
 * Static-label translation and the two selects that depend on it.
 *
 * Split out of main.js, which had grown to four jobs (bootstrap, event wiring,
 * tab routing, and this). Everything here answers one question: what text does
 * the chrome show in the current language?
 */

import { stocks } from '../data/stocks.js';
import { listSectors } from '../engine/stock-filter.js';
import { getLang, t, sectorName } from './i18n.js';
import { getThemeMode } from './theme.js';

const THEME_ICONS = { system: '🌓', light: '☀️', dark: '🌙' };
const THEME_LABEL_KEYS = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' };

/**
 * Mirror the current theme mode onto the toggle. The icon alone would leave
 * the state unreadable to a screen reader, so the label carries it too.
 */
export function syncThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const mode = getThemeMode();
  const label = t(THEME_LABEL_KEYS[mode]);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = THEME_ICONS[mode];
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
}

/**
 * (Re)fill the sector and sort selects, preserving the current choice. Called
 * on load and on every language switch, since the option labels are localised.
 */
function buildListFilterOptions() {
  const sectorEl = /** @type {HTMLSelectElement | null} */ (
    document.getElementById('stock-sector')
  );
  const sortEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('stock-sort'));
  if (!sectorEl || !sortEl) return;

  const fill = (select, options) => {
    const previous = select.value;
    select.replaceChildren(
      ...options.map(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        return option;
      })
    );
    if (previous && options.some(([value]) => value === previous)) select.value = previous;
  };

  fill(sectorEl, [
    ['all', t('allSectors')],
    ...listSectors(stocks).map((sector) => [sector, sectorName(sector)]),
  ]);
  fill(sortEl, [
    ['default', t('sortDefault')],
    ['gainers', t('sortTopGainers')],
    ['losers', t('sortTopLosers')],
    ['name', t('sortName')],
  ]);
}

/**
 * Every id whose text is a plain translated string.
 *
 * Keyed by element id rather than by querySelectorAll order: the previous
 * positional mapping silently mislabelled everything if a card, panel or tab
 * were ever reordered.
 *
 * @returns {Record<string, string>}
 */
function staticTextById() {
  return {
    'stat-label-cash': t('cashBalance'),
    'stat-label-portfolio': t('portfolioValue'),
    'stat-label-total': t('totalAssets'),
    'stat-label-pnl': t('profitLoss'),
    'panel-title-stocks': t('stockList'),
    'panel-title-portfolio': t('myPortfolio'),
    'panel-title-orders': t('pendingOrders'),
    'panel-title-tips': t('financialTips'),
    'panel-title-challenges': t('challenges'),
    'tab-market': t('marketTab'),
    'tab-portfolio': t('portfolioTab'),
    'tab-orders': t('ordersTab'),
    'challenge1-title': t('challenge1Title'),
    'challenge1-goal': t('challenge1Goal'),
    'challenge1-reward': t('challenge1Reward'),
    'challenge2-title': t('challenge2Title'),
    'challenge2-goal': t('challenge2Goal'),
    'challenge2-reward': t('challenge2Reward'),
    'glossary-title': t('glossaryTitle'),
    'stats-title': t('statsTitle'),
    'learning-title': t('learningTitle'),
    'scenarios-title': t('scenariosTitle'),
    'nav-market-label': t('marketTabShort'),
    'nav-portfolio-label': t('portfolioTabShort'),
    'nav-orders-label': t('ordersTabShort'),
    'nav-more-label': t('moreTitle'),
    'more-sheet-title': t('moreTitle'),
    'stock-search-label': t('searchStocksLabel'),
    'stock-sector-label': t('sectorLabel'),
    'stock-sort-label': t('sortLabel'),
    'stock-panel-hint': t('selectStockHint'),
    // These nine were a separate run of getElementById(...).textContent = t(...)
    // lines immediately below the map, in exactly this shape.
    'reset-btn': t('reset'),
    'export-csv-btn': t('exportCsv'),
    'sharia-filter-label-text': t('showShariaOnly'),
    'allow-24-7-label-text': t('enable24Trading'),
    'glossary-btn': t('glossaryBtn'),
    'stats-btn': t('statsBtn'),
    'learning-btn': t('learningPathsBtn'),
    'scenarios-btn': t('scenariosBtn'),
    'tour-btn': t('tourStartBtn'),
    'lang-toggle': t('languageButton'),
  };
}

/**
 * Re-translate all static chrome, and set the document's language/direction.
 */
export function rebuildStaticLabels() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  Object.entries(staticTextById()).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });

  // Close buttons carried a hardcoded Arabic aria-label even in English mode.
  document.querySelectorAll('.close-modal').forEach((el) => {
    el.setAttribute('aria-label', t('closeBtn'));
  });

  const search = /** @type {HTMLInputElement | null} */ (document.getElementById('stock-search'));
  if (search) search.placeholder = t('searchStocks');

  syncThemeToggle();
  buildListFilterOptions();
}
