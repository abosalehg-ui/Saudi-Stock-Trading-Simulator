// Self-hosted so the strict CSP (font-src 'self') holds and the UI looks the
// same on every OS. The previous stack fell back to Tahoma on Windows and to
// whatever the system Arabic face was elsewhere. Only the three weights the
// design actually uses are loaded; latin covers the digits and English mode.
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-600.css';
import '@fontsource/ibm-plex-sans-arabic/latin-700.css';
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
  savePriceStateThrottled,
  flushPriceState,
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
import {
  bindStockDetailsCallbacks,
  renderStockDetails,
  patchStockDetails,
} from './ui/stock-details.js';
import {
  showAlert,
  showConfirm,
  openStockModal,
  closeStockModal,
  isModalOpen,
} from './ui/modal.js';
import { initLang, toggleLang, t } from './ui/i18n.js';
import { rebuildStaticLabels } from './ui/labels.js';
import { showToast } from './ui/toast.js';
import { initResponsiveLayout, isDesktopLayout } from './ui/responsive.js';
import { attachShellListeners } from './ui/shell.js';
import { initTheme } from './ui/theme.js';
import { evaluateChallenges } from './engine/challenges.js';
import { maybeAutoStart } from './ui/tour.js';
import { recordPnlSnapshot, recordChallengeCompleted, recordSessionStart } from './engine/stats.js';

function refreshAll() {
  // Incremental update (patches existing DOM nodes) instead of rebuilding
  // the whole list every tick; renderStocks() is only needed when the set
  // of displayed stocks or their labels change (filter, language).
  updateStockPrices();
  renderPortfolio();
  renderPendingOrders();
  const { pnlPercent, totalValue } = updateStats();

  // Granting the rewards lives here rather than inside the renderer: it moves
  // cash and resets initialCapital, and a repaint should never do that.
  const { challenge1JustCompleted, challenge2JustCompleted } = evaluateChallenges({
    pnlPercent,
    totalValue,
  });
  if (challenge1JustCompleted) {
    recordChallengeCompleted();
    showAlert(t('challenge1Complete'));
  }
  if (challenge2JustCompleted) {
    recordChallengeCompleted();
    showAlert(t('challenge2Complete'));
  }
  // Re-read after the rewards: they change cash, so the bars would otherwise
  // paint the pre-reward percentage for one tick.
  const { pnlPercent: shownPnlPercent, totalValue: shownTotal } =
    challenge1JustCompleted || challenge2JustCompleted ? updateStats() : { pnlPercent, totalValue };
  updateChallenges({ pnlPercent: shownPnlPercent });

  recordPnlSnapshot(shownPnlPercent, shownTotal - gameState.initialCapital);

  // The selected stock's price and chart used to sit frozen at whatever they
  // were when it was picked, while the list beside them ticked on — two
  // different numbers for the same stock, side by side on a desktop layout.
  // This patches them in place, so a half-typed quantity and the indicator
  // checkboxes survive.
  if (session.selectedStock) patchStockDetails(session.selectedStock);

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
    // Throttled: this payload is ~216KB of JSON and both stringify and
    // setItem are synchronous, so writing it every tick blocked the main
    // thread every 6 seconds at 10x speed.
    savePriceStateThrottled();
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
  // Above 1024px the details render into the always-visible side panel, so
  // there is no dialog to open — and none to trap focus in either.
  if (!isDesktopLayout()) openStockModal();
}

/**
 * The charts draw onto a canvas, so unlike everything else on the page they
 * don't re-theme when the CSS custom properties change — they have to be
 * drawn again.
 */
function repaintThemedCanvases() {
  if (session.selectedStock) renderStockDetails(session.selectedStock);
}

/**
 * Re-home the stock details after a breakpoint crossing. The node itself is
 * moved by responsive.js; this re-renders it so Chart.js picks up the new
 * canvas size, and dismisses the modal if the side panel just took over.
 */
function handleLayoutChange(desktop) {
  if (desktop && isModalOpen('stock-modal')) closeStockModal();
  if (session.selectedStock) renderStockDetails(session.selectedStock);
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
    flushPriceState();
    closeStockModal();
    showToast(msg);
  } else {
    addPendingOrder(order);
    renderPendingOrders();
    saveGameState();
    closeStockModal();
    showToast(order.kind === 'stop-loss' ? t('stopLossAdded') : t('orderAdded'));
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

function init() {
  initLang();
  initTheme({ onChange: repaintThemedCanvases });
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

  // Before attachEventListeners(), so the action bar is already in its host and
  // its buttons are bound wherever they end up.
  initResponsiveLayout({ onChange: handleLayoutChange });

  attachShellListeners({
    onToggleLanguage: handleToggleLanguage,
    onThemeChanged: repaintThemedCanvases,
    onReset: resetGame,
    onSetSpeed: setSpeed,
    onRefresh: refreshAll,
  });

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

  // The price write is throttled, so a tab that goes away between writes would
  // otherwise lose the most recent ticks. 'pagehide' rather than 'beforeunload'
  // because the latter is unreliable on mobile, where the tab is usually
  // frozen rather than unloaded.
  const flush = () => {
    saveGameState();
    flushPriceState();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
