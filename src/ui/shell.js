/**
 * Chrome wiring: the tab bar, the toolbar, the bottom navigation, and every
 * listener that only shuttles a DOM event to a module that already exists.
 *
 * Split out of main.js, which was carrying this on top of bootstrapping and
 * the trading flow. Almost all of it reaches its collaborator directly; the
 * handful of behaviours main.js genuinely owns (the simulation clock, the
 * language rebuild, the reset flow) arrive through one `handlers` object, the
 * same shape bindRenderCallbacks/bindScenariosCallbacks already use.
 */

import { gameState, saveGameState } from '../state.js';
import { t } from './i18n.js';
import {
  bindStockListEvents,
  renderStocks,
  setStockListFilters,
  renderPendingOrders,
  updateMarketStatusBadge,
} from './render.js';
import { downloadTransactionsCsv } from './csv-export.js';
import { showAlert, closeStockModal, closeModal, isModalOpen } from './modal.js';
import { toggleMoreSheet, isMoreSheetOpen, syncBottomNav } from './responsive.js';
import { cycleThemeMode } from './theme.js';
import { syncThemeToggle } from './labels.js';
import { openGlossary, attachGlossaryListeners } from './glossary.js';
import { openStatsModal, closeStatsModal } from './stats.js';
import { openLearningModal, closeLearningModal } from './learning.js';
import { openScenariosModal, closeScenariosModal, bindScenariosCallbacks } from './scenarios.js';
import { startTour, attachTourListeners } from './tour.js';

const TABS = ['market', 'portfolio', 'orders'];

// Backdrop-click and Escape both need this list; declared once so the two
// handlers can't drift apart.
const SECONDARY_MODAL_IDS = ['glossary-modal', 'stats-modal', 'learning-modal', 'scenarios-modal'];

/** Debounce window for the stock search, in ms. */
const SEARCH_DEBOUNCE_MS = 120;

/**
 * Activate a tab by id rather than by DOM position: the old
 * `.tab:nth-child(n)` lookups broke silently if anything was inserted into the
 * tab bar. Also keeps aria-selected in sync, without which the declared
 * role="tab" told screen readers nothing about which tab was current.
 *
 * @param {'market'|'portfolio'|'orders'} tab
 */
export function switchTab(tab) {
  TABS.forEach((name) => {
    const isActive = name === tab;
    const tabEl = document.getElementById(`tab-${name}`);
    const panelEl = document.getElementById(`${name}-tab`);
    if (!tabEl || !panelEl) return;
    tabEl.classList.toggle('active', isActive);
    tabEl.setAttribute('aria-selected', String(isActive));
    panelEl.classList.toggle('active', isActive);
  });
  syncBottomNav(tab);
  if (tab === 'orders') renderPendingOrders();
}

/** @param {string} id @param {string} event @param {EventListener} handler */
function on(id, event, handler) {
  document.getElementById(id)?.addEventListener(event, handler);
}

/**
 * @param {object} handlers
 * @param {() => void} handlers.onToggleLanguage
 * @param {() => void} handlers.onThemeChanged - redraw canvas content, which does not re-theme from CSS
 * @param {() => void} handlers.onReset
 * @param {(speed: number) => void} handlers.onSetSpeed
 * @param {() => void} handlers.onRefresh
 */
export function attachShellListeners({
  onToggleLanguage,
  onThemeChanged,
  onReset,
  onSetSpeed,
  onRefresh,
}) {
  bindStockListEvents();

  on('lang-toggle', 'click', onToggleLanguage);
  on('theme-toggle', 'click', () => {
    cycleThemeMode();
    syncThemeToggle();
    onThemeChanged();
  });
  on('reset-btn', 'click', onReset);
  on('export-csv-btn', 'click', () => {
    if (gameState.transactions.length === 0) {
      showAlert(t('noTransactionsToExport'));
      return;
    }
    downloadTransactionsCsv();
  });

  [1, 5, 10].forEach((speed) => on(`speed-${speed}`, 'click', () => onSetSpeed(speed)));
  TABS.forEach((name) => on(`tab-${name}`, 'click', () => switchTab(name)));

  on('sharia-filter', 'change', (e) => {
    gameState.shariaFilter = e.target.checked;
    renderStocks();
    saveGameState();
  });
  on('allow-24-7', 'change', (e) => {
    gameState.allow24Trading = e.target.checked;
    updateMarketStatusBadge();
    saveGameState();
  });

  on('close-stock-modal', 'click', () => closeStockModal());

  // Stock list toolbar. The search is debounced so a rebuild of up to 91 rows
  // doesn't run on every keystroke.
  let searchTimer = null;
  on('stock-search', 'input', (e) => {
    const value = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setStockListFilters({ query: value }), SEARCH_DEBOUNCE_MS);
  });
  on('stock-sector', 'change', (e) => setStockListFilters({ sector: e.target.value }));
  on('stock-sort', 'change', (e) => setStockListFilters({ sort: e.target.value }));

  // Bottom navigation (phones).
  document.querySelectorAll('.bottom-nav-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      toggleMoreSheet(false);
      document.querySelector('.main-content')?.scrollIntoView({ block: 'start' });
    });
  });
  on('nav-more', 'click', () => toggleMoreSheet(!isMoreSheetOpen()));
  on('close-more-sheet', 'click', () => toggleMoreSheet(false));
  on('more-sheet', 'click', (event) => {
    // Backdrop only: clicks on the panel itself must not dismiss it.
    if (event.target === event.currentTarget) toggleMoreSheet(false);
  });

  on('glossary-btn', 'click', openGlossary);
  on('stats-btn', 'click', openStatsModal);
  on('learning-btn', 'click', openLearningModal);
  on('scenarios-btn', 'click', openScenariosModal);
  on('tour-btn', 'click', startTour);

  on('close-stats-modal', 'click', closeStatsModal);
  on('close-learning-modal', 'click', closeLearningModal);
  on('close-scenarios-modal', 'click', closeScenariosModal);

  attachGlossaryListeners();
  attachTourListeners();
  bindScenariosCallbacks({ onChange: onRefresh });

  window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('stock-modal')) closeStockModal();
    SECONDARY_MODAL_IDS.forEach((id) => {
      if (event.target === document.getElementById(id)) closeModal(id);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (isMoreSheetOpen()) toggleMoreSheet(false);
    if (isModalOpen('stock-modal')) closeStockModal();
    SECONDARY_MODAL_IDS.filter(isModalOpen).forEach((id) => closeModal(id));
  });
}
