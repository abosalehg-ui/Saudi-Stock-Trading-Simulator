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
import { showAlert, showConfirm, openStockModal, closeStockModal } from './ui/modal.js';
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
    const { cancelled } = checkPendingOrders();
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
  selectStock(symbol);
  if (type === 'sell' && gameState.portfolio[symbol]) {
    setTimeout(() => {
      const qty = document.getElementById('order-quantity');
      if (qty) qty.value = gameState.portfolio[symbol].quantity;
    }, 100);
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
    showAlert(msg);
    setTimeout(() => closeStockModal(), 100);
  } else {
    addPendingOrder(order);
    renderPendingOrders();
    saveGameState();
    showAlert(order.kind === 'stop-loss' ? t('stopLossAdded') : t('orderAdded'));
    setTimeout(() => closeStockModal(), 100);
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

  const labels = [t('cashBalance'), t('portfolioValue'), t('totalAssets'), t('profitLoss')];
  document.querySelectorAll('.stat-label').forEach((el, i) => {
    if (i < labels.length) el.textContent = labels[i];
  });
  const panelTitles = [
    t('stockList'),
    t('myPortfolio'),
    t('pendingOrders'),
    t('financialTips'),
    t('challenges'),
  ];
  document.querySelectorAll('.panel-title').forEach((el, i) => {
    if (i < panelTitles.length) el.textContent = panelTitles[i];
  });
  const tabLabels = [t('marketTab'), t('portfolioTab'), t('ordersTab')];
  document.querySelectorAll('.tab').forEach((el, i) => {
    if (i < tabLabels.length) el.textContent = tabLabels[i];
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

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
  if (tab === 'market') {
    document.querySelector('.tab:nth-child(1)').classList.add('active');
    document.getElementById('market-tab').classList.add('active');
  } else if (tab === 'portfolio') {
    document.querySelector('.tab:nth-child(2)').classList.add('active');
    document.getElementById('portfolio-tab').classList.add('active');
  } else if (tab === 'orders') {
    document.querySelector('.tab:nth-child(3)').classList.add('active');
    document.getElementById('orders-tab').classList.add('active');
    renderPendingOrders();
  }
}

function attachEventListeners() {
  bindStockListEvents();
  document.getElementById('lang-toggle').addEventListener('click', handleToggleLanguage);
  document.getElementById('reset-btn').addEventListener('click', resetGame);
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    if (gameState.transactions.length === 0) {
      showAlert(getLang() === 'ar' ? 'لا توجد معاملات للتصدير' : 'No transactions to export');
      return;
    }
    downloadTransactionsCsv();
  });
  document.getElementById('speed-1').addEventListener('click', () => setSpeed(1));
  document.getElementById('speed-5').addEventListener('click', () => setSpeed(5));
  document.getElementById('speed-10').addEventListener('click', () => setSpeed(10));
  document.getElementById('tab-market').addEventListener('click', () => switchTab('market'));
  document.getElementById('tab-portfolio').addEventListener('click', () => switchTab('portfolio'));
  document.getElementById('tab-orders').addEventListener('click', () => switchTab('orders'));

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
    const stockModal = document.getElementById('stock-modal');
    if (event.target === stockModal) closeStockModal();
    ['glossary-modal', 'stats-modal', 'learning-modal', 'scenarios-modal'].forEach((id) => {
      const m = document.getElementById(id);
      if (event.target === m) m.style.display = 'none';
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const stockModal = document.getElementById('stock-modal');
      if (stockModal.style.display === 'block') closeStockModal();
      ['glossary-modal', 'stats-modal', 'learning-modal', 'scenarios-modal'].forEach((id) => {
        const m = document.getElementById(id);
        if (m && m.style.display === 'block') m.style.display = 'none';
      });
    }
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
