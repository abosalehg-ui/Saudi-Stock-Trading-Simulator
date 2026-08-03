import { CHALLENGE_1_THRESHOLD, CHALLENGE_2_THRESHOLD, COMMISSION } from '../config.js';
import { stocks, findStock } from '../data/stocks.js';
import { financialTips } from '../data/tips.js';
import { gameState, stockPrices, activeNews, session } from '../state.js';
import { getLang, t } from './i18n.js';
import { formatCurrency } from '../utils/numbers.js';
import { formatDateBilingual, formatHijriToday } from '../utils/dates.js';
import { isMarketOpen, describeNextOpen } from '../engine/market-hours.js';
import { newsText } from '../engine/news.js';
import { evaluateChallenges } from '../engine/challenges.js';
import { clearChildren, escapeHtml } from './dom.js';

/** @type {(symbol: string) => void} */
let onSelectStock = () => {};
/** @type {(orderId: number) => void} */
let onCancelOrder = () => {};
/** @type {(symbol: string, type: 'buy'|'sell') => void} */
let onQuickTrade = () => {};

/**
 * @param {{onSelectStock?: (symbol: string) => void, onCancelOrder?: (orderId: number) => void, onQuickTrade?: (symbol: string, type: 'buy'|'sell') => void}} callbacks
 */
export function bindRenderCallbacks(callbacks) {
  onSelectStock = callbacks.onSelectStock ?? onSelectStock;
  onCancelOrder = callbacks.onCancelOrder ?? onCancelOrder;
  onQuickTrade = callbacks.onQuickTrade ?? onQuickTrade;
}

// symbol -> { container, priceEl, changeEl }, rebuilt whenever renderStocks()
// does a full rebuild. Lets updateStockPrices() patch text on every price
// tick without recreating 90+ DOM nodes (and their listeners) each time.
const stockItemRefs = new Map();

function buildStockItem(stock, lang) {
  const div = document.createElement('div');
  div.className = 'stock-item';
  div.dataset.symbol = stock.symbol;
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.setAttribute('aria-label', `${lang === 'ar' ? stock.name : stock.nameEn} ${stock.symbol}`);

  const header = document.createElement('div');
  header.className = 'stock-header';

  const left = document.createElement('div');
  const nameDiv = document.createElement('div');
  nameDiv.className = 'stock-name';
  nameDiv.textContent = lang === 'ar' ? stock.name : stock.nameEn;
  if (stock.isShariaCompliant) {
    const badge = document.createElement('span');
    badge.className = 'sharia-badge';
    badge.title = t('shariaCompliant');
    badge.textContent = ' 🕌';
    nameDiv.appendChild(badge);
  }
  const symbolDiv = document.createElement('div');
  symbolDiv.className = 'stock-symbol';
  symbolDiv.textContent = stock.symbol;
  left.appendChild(nameDiv);
  left.appendChild(symbolDiv);

  const right = document.createElement('div');
  right.className = 'stock-figures';
  const priceDiv = document.createElement('div');
  priceDiv.className = 'stock-price';
  const changeDiv = document.createElement('div');
  changeDiv.className = 'stock-change';
  right.appendChild(priceDiv);
  right.appendChild(changeDiv);

  header.appendChild(left);
  header.appendChild(right);
  div.appendChild(header);

  return { container: div, priceEl: priceDiv, changeEl: changeDiv };
}

/**
 * Full rebuild of the stock list: needed whenever which stocks are shown or
 * how they're labeled changes (Sharia filter, language). Call updateStockPrices()
 * instead for a plain price tick or selection change.
 */
export function renderStocks() {
  const listEl = document.getElementById('stock-list');
  if (!listEl) return;
  clearChildren(listEl);
  stockItemRefs.clear();
  const lang = getLang();
  const filtered = gameState.shariaFilter ? stocks.filter((s) => s.isShariaCompliant) : stocks;

  filtered.forEach((stock) => {
    const refs = buildStockItem(stock, lang);
    stockItemRefs.set(stock.symbol, refs);
    listEl.appendChild(refs.container);
  });
  updateStockPrices();
}

/**
 * Patch price/change text and the selected-item highlight on the existing
 * stock-list DOM nodes, without rebuilding them. Safe to call every price
 * tick; a no-op for any symbol not currently rendered (e.g. filtered out).
 */
export function updateStockPrices() {
  stockItemRefs.forEach((refs, symbol) => {
    const stock = findStock(symbol);
    if (!stock) return;
    const price = stockPrices[symbol];
    const change = ((price - stock.basePrice) / stock.basePrice) * 100;
    refs.priceEl.textContent = `${price.toFixed(2)} ${t('sar')}`;
    // Arrow rather than a bare sign, matching the ticker: direction should not
    // depend on colour alone, and the glyph is faster to scan down a list.
    refs.changeEl.textContent = `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%`;
    refs.changeEl.className = `stock-change ${change >= 0 ? 'positive' : 'negative'}`;
    refs.container.classList.toggle('selected', session.selectedStock === symbol);
  });
}

/**
 * Bind a single delegated click/keydown listener on the stock list container.
 * Call once (the container itself is never replaced, only its children).
 */
export function bindStockListEvents() {
  const listEl = document.getElementById('stock-list');
  if (!listEl) return;
  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.stock-item');
    if (item?.dataset.symbol) onSelectStock(item.dataset.symbol);
  });
  listEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.stock-item');
    if (item?.dataset.symbol) {
      e.preventDefault();
      onSelectStock(item.dataset.symbol);
    }
  });
}

export function renderPortfolio() {
  const portfolioEl = document.getElementById('portfolio');
  if (!portfolioEl) return;
  const lang = getLang();
  clearChildren(portfolioEl);

  if (Object.keys(gameState.portfolio).length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = t('portfolioEmpty');
    portfolioEl.appendChild(p);
    return;
  }

  Object.entries(gameState.portfolio).forEach(([symbol, holding]) => {
    const stock = findStock(symbol);
    if (!stock) return;
    const currentPrice = stockPrices[symbol];
    const marketValue = currentPrice * holding.quantity;
    const costBasis = holding.avgCost * holding.quantity;
    const valueAfterSell = marketValue * (1 - COMMISSION);
    const profitAfterSell = valueAfterSell - costBasis;
    const sar = t('sar');

    const div = document.createElement('div');
    div.className = 'portfolio-item';
    div.innerHTML = `
      <div class="stock-header">
        <div>
          <div class="stock-name">${escapeHtml(lang === 'ar' ? stock.name : stock.nameEn)}</div>
          <div class="stock-symbol">${escapeHtml(symbol)} - ${holding.quantity} ${escapeHtml(t('shares'))}</div>
        </div>
      </div>
      <div class="portfolio-details">
        <div class="detail-item"><span>${t('lastPrice')}:</span><strong>${currentPrice.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('avgCost')}:</span><strong>${holding.avgCost.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('totalCost')}:</span><strong>${costBasis.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('marketValue')}:</span><strong>${marketValue.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('valueAfterSell')}:</span><strong>${valueAfterSell.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('pnlAfterSell')}:</span><strong class="${profitAfterSell >= 0 ? 'positive' : 'negative'}">${profitAfterSell >= 0 ? '▲' : '▼'} ${Math.abs(profitAfterSell).toFixed(2)} ${sar} (${Math.abs((profitAfterSell / costBasis) * 100).toFixed(2)}%)</strong></div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'portfolio-actions';
    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn btn-buy portfolio-action-btn';
    buyBtn.textContent = t('buyMore');
    buyBtn.addEventListener('click', () => onQuickTrade(symbol, 'buy'));
    const sellBtn = document.createElement('button');
    sellBtn.className = 'btn btn-danger portfolio-action-btn';
    sellBtn.textContent = t('sellAll');
    sellBtn.addEventListener('click', () => onQuickTrade(symbol, 'sell'));
    actions.appendChild(buyBtn);
    actions.appendChild(sellBtn);
    div.appendChild(actions);
    portfolioEl.appendChild(div);
  });
}

export function renderPendingOrders() {
  const ordersEl = document.getElementById('pending-orders');
  if (!ordersEl) return;
  clearChildren(ordersEl);
  const lang = getLang();
  const orders = gameState.pendingOrders || [];

  if (orders.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = t('noPendingOrders');
    ordersEl.appendChild(p);
    return;
  }

  orders.forEach((order) => {
    const stock = findStock(order.symbol);
    if (!stock) return;
    const currentPrice = stockPrices[order.symbol];
    const refPrice = order.kind === 'stop-loss' ? order.stopPrice : order.limitPrice;
    const priceDiff = ((currentPrice - refPrice) / refPrice) * 100;
    const sar = t('sar');
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
      <div class="order-header">
        <div>
          <strong class="order-stock-name">${escapeHtml(lang === 'ar' ? stock.name : stock.nameEn)}</strong>
          <span class="order-stock-symbol">(${escapeHtml(order.symbol)})</span>
        </div>
        <span class="btn order-kind-badge ${order.type === 'buy' ? 'btn-buy' : 'btn-danger'}">
          ${order.type === 'buy' ? t('buy') : t('sell')} · ${order.kind === 'stop-loss' ? t('orderKindStopLoss') : t('orderKindLimit')}
        </span>
      </div>
      <div class="order-details">
        <div>${t('quantity')}: <strong>${order.quantity}</strong></div>
        <div>${order.kind === 'stop-loss' ? t('stopPrice') : t('limitPrice')}: <strong>${refPrice.toFixed(2)} ${sar}</strong></div>
        <div>${t('currentPrice')}: <strong>${currentPrice.toFixed(2)} ${sar}</strong></div>
        <div>${t('difference')}: <span class="${priceDiff >= 0 ? 'positive' : 'negative'}">${priceDiff >= 0 ? '▲' : '▼'} ${Math.abs(priceDiff).toFixed(2)}%</span></div>
        <div class="order-date-row">${escapeHtml(t('date'))}: ${escapeHtml(formatDateBilingual(order.timestamp, lang))}</div>
      </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'order-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-danger cancel-order-btn';
    cancelBtn.textContent = t('cancelOrder');
    cancelBtn.addEventListener('click', () => onCancelOrder(order.id));
    actions.appendChild(cancelBtn);
    div.appendChild(actions);
    ordersEl.appendChild(div);
  });
}

export function updateStats() {
  let portfolioValue = 0;
  Object.entries(gameState.portfolio).forEach(([symbol, holding]) => {
    portfolioValue += stockPrices[symbol] * holding.quantity;
  });
  const totalValue = gameState.cash + portfolioValue;
  const pnl = totalValue - gameState.initialCapital;
  const pnlPercent = (pnl / gameState.initialCapital) * 100;
  const lang = getLang();

  document.getElementById('cash').textContent = formatCurrency(gameState.cash, lang, t('sar'));
  document.getElementById('portfolio-value').textContent = formatCurrency(
    portfolioValue,
    lang,
    t('sar')
  );
  document.getElementById('total-value').textContent = formatCurrency(totalValue, lang, t('sar'));

  const pnlEl = document.getElementById('pnl');
  pnlEl.textContent = `${pnl >= 0 ? '▲' : '▼'} ${Math.abs(pnl).toFixed(2)} ${t('sar')} (${Math.abs(pnlPercent).toFixed(2)}%)`;
  pnlEl.className = 'stat-value ' + (pnl >= 0 ? 'positive' : 'negative');

  return { pnlPercent, totalValue };
}

/**
 * Set a progress bar's width and mirror it onto the wrapping role="progressbar"
 * so the value is exposed to assistive tech, not just painted.
 *
 * @param {string} barId
 * @param {number} percent - 0..100
 */
function setChallengeProgress(barId, percent) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const clamped = Math.max(0, Math.min(100, percent));
  bar.style.width = `${clamped}%`;
  const wrapper = bar.closest('[role="progressbar"]');
  if (wrapper) wrapper.setAttribute('aria-valuenow', String(Math.round(clamped)));
}

/**
 * Update the challenge progress bars and grant any newly-earned rewards.
 * @returns {{challenge1JustCompleted: boolean, challenge2JustCompleted: boolean}}
 */
export function updateChallenges({ pnlPercent, totalValue, showAlertFn }) {
  const progress1 = Math.min((pnlPercent / CHALLENGE_1_THRESHOLD) * 100, 100);
  const progress2 = Math.min((pnlPercent / CHALLENGE_2_THRESHOLD) * 100, 100);
  setChallengeProgress('challenge1-progress', progress1);
  setChallengeProgress('challenge2-progress', progress2);

  const { challenge1JustCompleted, challenge2JustCompleted } = evaluateChallenges({
    pnlPercent,
    totalValue,
  });
  if (challenge1JustCompleted && showAlertFn) showAlertFn(t('challenge1Complete'));
  if (challenge2JustCompleted && showAlertFn) showAlertFn(t('challenge2Complete'));

  return { challenge1JustCompleted, challenge2JustCompleted };
}

// Two copies of the list are rendered back to back so the CSS marquee loops
// seamlessly. Refs are kept for both copies so a price tick patches text in
// place: replacing innerHTML every tick rebuilt 182 nodes *and* restarted the
// scroll animation from zero, making the ticker visibly jump each minute.
const tickerRefs = new Map();
let tickerLang = null;

function buildTicker(tickerEl, lang) {
  clearChildren(tickerEl);
  tickerRefs.clear();
  for (let copy = 0; copy < 2; copy += 1) {
    stocks.forEach((stock) => {
      const item = document.createElement('span');
      item.className = 'ticker-item';

      const name = document.createElement('strong');
      name.textContent = lang === 'ar' ? stock.name : stock.nameEn;
      const priceEl = document.createElement('span');
      priceEl.className = 'ticker-price';
      const changeEl = document.createElement('span');

      item.appendChild(name);
      item.appendChild(document.createTextNode(' '));
      item.appendChild(priceEl);
      item.appendChild(document.createTextNode(' '));
      item.appendChild(changeEl);
      tickerEl.appendChild(item);

      if (!tickerRefs.has(stock.symbol)) tickerRefs.set(stock.symbol, []);
      tickerRefs.get(stock.symbol).push({ priceEl, changeEl });
    });
  }
  tickerLang = lang;
}

export function updateTicker() {
  const tickerEl = document.getElementById('ticker');
  if (!tickerEl) return;
  const lang = getLang();
  if (tickerLang !== lang || tickerRefs.size !== stocks.length || !tickerEl.firstChild) {
    buildTicker(tickerEl, lang);
  }

  stocks.forEach((stock) => {
    const price = stockPrices[stock.symbol];
    const change = ((price - stock.basePrice) / stock.basePrice) * 100;
    const refs = tickerRefs.get(stock.symbol) || [];
    refs.forEach(({ priceEl, changeEl }) => {
      priceEl.textContent = price.toFixed(2);
      changeEl.textContent = `${change >= 0 ? '\u25b2' : '\u25bc'} ${Math.abs(change).toFixed(2)}%`;
      changeEl.className = change >= 0 ? 'positive' : 'negative';
    });
  });
}

// Rebuild only when the visible set of headlines actually changes, for the same
// animation-restart reason as the price ticker above.
let newsSignature = null;

function buildNewsItem(news, lang) {
  const item = document.createElement('span');
  item.className = 'news-item';
  if (!news) {
    item.textContent = `\ud83d\udcf0 ${t('noNewNews')}`;
    return item;
  }
  const inner = document.createElement('span');
  inner.className = news.type === 'positive' ? 'news-positive' : 'news-negative';
  const icon = news.type === 'positive' ? '\ud83d\udcc8' : '\ud83d\udcc9';
  inner.textContent = `${icon} \ud83d\udcf0 ${newsText(news, lang)}`;
  item.appendChild(inner);
  return item;
}

/**
 * The scrolling ticker is aria-hidden (a moving marquee is unusable with a
 * screen reader), but the headlines are the only place this information
 * appears. Mirror the newest one into a polite live region so it is announced
 * once instead of being lost.
 */
function announceLatestNews(lang) {
  const live = document.getElementById('news-live');
  if (!live) return;
  const latest = activeNews.items[activeNews.items.length - 1];
  live.textContent = latest ? `${t('newsAnnouncement')}: ${newsText(latest, lang)}` : '';
}

export function updateNewsTicker() {
  const tickerEl = document.getElementById('news-ticker');
  if (!tickerEl) return;
  const lang = getLang();
  const signature = `${lang}|${activeNews.items
    .map((n) => `${n.symbol}:${n.templateIndex}:${n.timestamp}`)
    .join(',')}`;
  if (signature === newsSignature && tickerEl.firstChild) return;
  newsSignature = signature;

  clearChildren(tickerEl);
  const items = activeNews.items.length === 0 ? [null, null, null] : activeNews.items;
  for (let copy = 0; copy < 2; copy += 1) {
    items.forEach((news) => tickerEl.appendChild(buildNewsItem(news, lang)));
  }
  announceLatestNews(lang);
}

export function displayRandomTips() {
  const tipsEl = document.getElementById('tips-list');
  if (!tipsEl) return;
  const tips = financialTips[getLang()];
  const selected = [];
  while (selected.length < 3) {
    const tip = tips[Math.floor(Math.random() * tips.length)];
    if (!selected.includes(tip)) selected.push(tip);
  }
  clearChildren(tipsEl);
  selected.forEach((tip) => {
    const div = document.createElement('div');
    div.className = 'tip-item';
    div.textContent = tip;
    tipsEl.appendChild(div);
  });
}

export function updateMarketStatusBadge() {
  const badge = document.getElementById('market-status');
  if (!badge) return;
  const open = isMarketOpen();
  const override = gameState.allow24Trading;
  badge.classList.remove('open', 'closed', 'override');
  if (override) {
    badge.classList.add('override');
    badge.textContent = `🟣 ${t('enable24Trading')}`;
  } else if (open) {
    badge.classList.add('open');
    badge.textContent = `🟢 ${t('marketOpen')}`;
  } else {
    badge.classList.add('closed');
    badge.textContent = `🔴 ${t('marketClosed')} · ${t('nextOpen')}: ${describeNextOpen(new Date(), getLang())}`;
  }
}

export function updateHijriDate() {
  const el = document.getElementById('hijri-date');
  if (!el) return;
  const lang = getLang();
  if (lang === 'ar') {
    const hijri = formatHijriToday('ar');
    el.textContent = hijri ? `📅 ${hijri}` : '';
    el.style.display = hijri ? '' : 'none';
  } else {
    el.style.display = 'none';
  }
}
