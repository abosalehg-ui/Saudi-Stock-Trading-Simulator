import './styles/main.css';
import {
  PRICE_UPDATE_INTERVAL_MS,
  NEWS_UPDATE_INTERVAL_MS,
  STORAGE_KEY,
  PRICES_STORAGE_KEY,
} from './config.js';
import {
  gameState,
  session,
  loadGameState,
  saveGameState,
  resetGameState,
  initPriceState,
  loadPriceState,
  savePriceState,
  loadStats,
} from './state.js';
import { updatePrices } from './engine/prices.js';
import { generateNews } from './engine/news.js';
import {
  validateOrder,
  executeMarketOrder,
  addPendingOrder,
  checkPendingOrders,
  cancelPendingOrder,
} from './engine/trading.js';
import { isMarketOpen } from './engine/market-hours.js';
import {
  bindRenderCallbacks,
  renderStocks,
  updateStockPrices,
  bindStockListEvents,
  renderPortfolio,
  renderPendingOrders,
  updateStats,
  updateChallenges,
  updateTicker,
  updateNewsTicker,
  displayRandomTips,
  updateMarketStatusBadge,
  updateHijriDate,
} from './ui/render.js';
import { bindStockDetailsCallbacks, renderStockDetails } from './ui/stock-details.js';
import {
  showAlert,
  showConfirm,
  openStockModal,
  closeStockModal,
  closeModal,
  isModalOpen,
} from './ui/modal.js';
import { downloadTransactionsCsv } from './ui/csv-export.js';
import { getLang, initLang, toggleLang, t } from './ui/i18n.js';
import { openGlossary, attachGlossaryListeners } from './ui/glossary.js';
import { openStatsModal, closeStatsModal } from './ui/stats.js';
import { openLearningModal, closeLearningModal } from './ui/learning.js';
import { openScenariosModal, closeScenariosModal, bindScenariosCallbacks } from './ui/scenarios.js';
import { startTour, attachTourListeners, maybeAutoStart } from './ui/tour.js';
import { recordPnlSnapshot, recordChallengeCompleted, recordSessionStart } from './engine/stats.js';

function refreshAll() {
  // Incremental update (patches existing DOM nodes) instead of rebuilding
  // the whole list every tick; renderStocks() is only needed when the set
  // of displayed stocks or their labels change (filter, language).
  updateStockPrices();
  renderPortfolio();
  renderPendingOrders();
  const { pnlPercent, totalValue } = updateStats();
  const { challenge1JustCompleted, challenge2JustCompleted } = updateChallenges({
    pnlPercent,
    totalValue,
    showAlertFn: showAlert,
  });
  if (challenge1JustCompleted) recordChallengeCompleted();
  if (challenge2JustCompleted) recordChallengeCompleted();
  const pnlAmount = totalValue - gameState.initialCapital;
  recordPnlSnapshot(pnlPercent, pnlAmount);
  updateTicker();
  updateNewsTicker();
  updateMarketStatusBadge();
  updateHijriDate();
}

function startPriceUpdates() {
  if (session.updateInterval) clearInterval(session.updateInterval);
  session.updateInterval = setInterval(() => {
    updatePrices();
    // Pending orders match against the same live market as a market order:
    // while the market is closed, prices are frozen (updatePrices returns
    // early) and market orders are refused, so filling a limit/stop order
    // here would contradict the block in handleSubmitOrder.
    const marketLive = gameState.allow24Trading || isMarketOpen();
    const { cancelled } = marketLive ? checkPendingOrders() : { cancelled: [] };
    refreshAll();
    saveGameState();
    savePriceState();
    // Orders whose trigger fired but couldn't execute (e.g. two orders
    // competing for the same shares) are dropped rather than retried forever;
    // let the user know instead of a pending order silently vanishing.
    if (cancelled.length > 0) {
      showAlert(t('pendingOrdersAutoCancelled'));
    }
  }, PRICE_UPDATE_INTERVAL_MS / gameState.speed);
}

function startNewsUpdates() {
  if (session.newsUpdateInterval) clearInterval(session.newsUpdateInterval);
  generateNews();
  updateNewsTicker();
  // Scaled by speed to match price ticks, so news appears proportionally
  // more often in real time the faster the simulation runs.
  session.newsUpdateInterval = setInterval(() => {
    generateNews();
    updateNewsTicker();
  }, NEWS_UPDATE_INTERVAL_MS / gameState.speed);
}

function selectStock(symbol) {
  session.selectedStock = symbol;
  updateStockPrices(); // toggles the .selected highlight without a full rebuild
  renderStockDetails(symbol);
  openStockModal();
}

function handleQuickTrade(symbol, type) {
  // selectStock() -> renderStockDetails() builds the form synchronously, so the
  // quantity field already exists here; the old setTimeout(100) was guarding
  // against nothing.
  selectStock(symbol);
  if (type === 'sell' && gameState.portfolio[symbol]) {
    const qty = document.getElementById('order-quantity');
    if (qty) qty.value = String(gameState.portfolio[symbol].quantity);
  }
}

function handleCancelOrder(orderId) {
  showConfirm(t('confirmCancelOrder')).then((ok) => {
    if (!ok) return;
    if (cancelPendingOrder(orderId)) {
      renderPendingOrders();
      saveGameState();
    }
  });
}

function errorMessageFor(error) {
  switch (error) {
    case 'NO_STOCK':
      return t('selectStock');
    case 'INVALID_QUANTITY':
      return t('enterValidQuantity');
    case 'QUANTITY_TOO_LARGE':
      return t('quantityTooLarge');
    case 'INVALID_PRICE':
      return t('enterLimitPrice');
    case 'STOP_LOSS_SELL_ONLY':
    case 'NO_HOLDING':
      return t('stopLossSellOnly');
    case 'INSUFFICIENT_FUNDS':
      return t('insufficientFunds');
    case 'INSUFFICIENT_SHARES':
      return t('insufficientShares');
    default:
      return t('invalidNumber');
  }
}

function handleSubmitOrder(input) {
  const validation = validateOrder(input);
  if (!validation.ok) {
    // @ts-expect-error tsc doesn't narrow this OrderValidationResult union in
    // this call context; the discriminant check above makes it safe at runtime.
    showAlert(errorMessageFor(validation.error));
    return;
  }
  const { order } = validation;

  if (order.kind === 'market') {
    if (!isMarketOpen() && !gameState.allow24Trading) {
      showAlert(t('marketClosedMessage'));
      return;
    }
    const result = executeMarketOrder(order);
    if (!result.ok) {
      showAlert(errorMessageFor(result.error));
      return;
    }
    const msg = order.type === 'buy' ? t('purchaseSuccess') : t('sellSuccess');
    refreshAll();
    saveGameState();
    // A market order shifts stockPrices immediately (applyMarketImpact); persist that
    // now instead of waiting for the next interval tick, or a reload right after a
    // trade would show the price snapping back.
    savePriceState();
    closeStockModal();
    showAlert(msg);
  } else {
    addPendingOrder(order);
    renderPendingOrders();
    saveGameState();
    closeStockModal();
    showAlert(order.kind === 'stop-loss' ? t('stopLossAdded') : t('orderAdded'));
  }
}

function setSpeed(speed) {
  gameState.speed = speed;
  startPriceUpdates();
  startNewsUpdates();
  saveGameState();
}

function resetGame() {
  showConfirm(t('confirmReset')).then((ok) => {
    if (!ok) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PRICES_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
    resetGameState();
    // resetGameState() puts speed back to 1, but the running intervals were
    // built with the *old* divisor — rebuild them or the sim keeps ticking at
    // the previous speed while the UI reports 1x.
    startPriceUpdates();
    startNewsUpdates();
    refreshAll();
    closeStockModal();
    displayRandomTips();
  });
}

function rebuildStaticLabels() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('lang-toggle').textContent = t('languageButton');

  // Keyed by element id rather than by querySelectorAll order: the previous
  // positional mapping silently mislabelled everything if a card, panel or tab
  // were ever reordered, and it depended on the modal .panel-title nodes
  // happening to sort after the in-page ones.
  const textById = {
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
  };
  Object.entries(textById).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });

  // Close buttons carried a hardcoded Arabic aria-label even in English mode.
  document.querySelectorAll('.close-modal').forEach((el) => {
    el.setAttribute('aria-label', t('closeBtn'));
  });

  document.getElementById('reset-btn').textContent = t('reset');
  document.getElementById('export-csv-btn').textContent = t('exportCsv');
  document.getElementById('sharia-filter-label-text').textContent = t('showShariaOnly');
  document.getElementById('allow-24-7-label-text').textContent = t('enable24Trading');
  document.getElementById('glossary-btn').textContent = t('glossaryBtn');
  document.getElementById('stats-btn').textContent = t('statsBtn');
  document.getElementById('learning-btn').textContent = t('learningPathsBtn');
  document.getElementById('scenarios-btn').textContent = t('scenariosBtn');
  document.getElementById('tour-btn').textContent = t('tourStartBtn');
}

function handleToggleLanguage() {
  toggleLang();
  rebuildStaticLabels();
  renderStocks(); // full rebuild: stock names are language-dependent, unlike refreshAll()'s incremental price patch
  refreshAll();
  if (session.selectedStock) {
    renderStockDetails(session.selectedStock);
  }
  displayRandomTips();
  saveGameState();
}

const TABS = ['market', 'portfolio', 'orders'];

/**
 * Activate a tab by id rather than by DOM position: the old
 * `.tab:nth-child(n)` lookups broke silently if anything was inserted into the
 * tab bar. Also keeps aria-selected in sync, without which the declared
 * role="tab" told screen readers nothing about which tab was current.
 *
 * @param {'market'|'portfolio'|'orders'} tab
 */
function switchTab(tab) {
  TABS.forEach((name) => {
    const isActive = name === tab;
    const tabEl = document.getElementById(`tab-${name}`);
    const panelEl = document.getElementById(`${name}-tab`);
    tabEl.classList.toggle('active', isActive);
    tabEl.setAttribute('aria-selected', String(isActive));
    panelEl.classList.toggle('active', isActive);
  });
  if (tab === 'orders') renderPendingOrders();
}

// Backdrop-click and Escape both need this list; declared once so the two
// handlers can't drift apart.
const SECONDARY_MODAL_IDS = ['glossary-modal', 'stats-modal', 'learning-modal', 'scenarios-modal'];

function attachEventListeners() {
  bindStockListEvents();
  document.getElementById('lang-toggle').addEventListener('click', handleToggleLanguage);
  document.getElementById('reset-btn').addEventListener('click', resetGame);
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    if (gameState.transactions.length === 0) {
      showAlert(t('noTransactionsToExport'));
      return;
    }
    downloadTransactionsCsv();
  });
  document.getElementById('speed-1').addEventListener('click', () => setSpeed(1));
  document.getElementById('speed-5').addEventListener('click', () => setSpeed(5));
  document.getElementById('speed-10').addEventListener('click', () => setSpeed(10));
  TABS.forEach((name) => {
    document.getElementById(`tab-${name}`).addEventListener('click', () => switchTab(name));
  });

  document.getElementById('sharia-filter').addEventListener('change', (e) => {
    gameState.shariaFilter = e.target.checked;
    renderStocks();
    saveGameState();
  });
  document.getElementById('allow-24-7').addEventListener('change', (e) => {
    gameState.allow24Trading = e.target.checked;
    updateMarketStatusBadge();
    saveGameState();
  });

  document.getElementById('close-stock-modal').addEventListener('click', () => closeStockModal());

  document.getElementById('glossary-btn').addEventListener('click', openGlossary);
  document.getElementById('stats-btn').addEventListener('click', openStatsModal);
  document.getElementById('learning-btn').addEventListener('click', openLearningModal);
  document.getElementById('scenarios-btn').addEventListener('click', openScenariosModal);
  document.getElementById('tour-btn').addEventListener('click', startTour);

  document.getElementById('close-stats-modal').addEventListener('click', closeStatsModal);
  document.getElementById('close-learning-modal').addEventListener('click', closeLearningModal);
  document.getElementById('close-scenarios-modal').addEventListener('click', closeScenariosModal);

  attachGlossaryListeners();
  attachTourListeners();
  bindScenariosCallbacks({ onChange: refreshAll });

  window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('stock-modal')) closeStockModal();
    SECONDARY_MODAL_IDS.forEach((id) => {
      if (event.target === document.getElementById(id)) closeModal(id);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (isModalOpen('stock-modal')) closeStockModal();
    SECONDARY_MODAL_IDS.filter(isModalOpen).forEach((id) => closeModal(id));
  });
}

function init() {
  initLang();
  loadGameState();
  loadStats();
  loadPriceState();
  initPriceState();
  recordSessionStart();

  bindRenderCallbacks({
    onSelectStock: selectStock,
    onCancelOrder: handleCancelOrder,
    onQuickTrade: handleQuickTrade,
  });
  bindStockDetailsCallbacks({ onSubmitOrder: handleSubmitOrder });

  attachEventListeners();

  document.getElementById('sharia-filter').checked = !!gameState.shariaFilter;
  document.getElementById('allow-24-7').checked = !!gameState.allow24Trading;

  rebuildStaticLabels();
  renderStocks(); // full build; refreshAll()'s incremental update needs these nodes to exist
  refreshAll();
  startPriceUpdates();
  startNewsUpdates();
  displayRandomTips();
  maybeAutoStart();

  setInterval(() => {
    updateMarketStatusBadge();
  }, 30000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
