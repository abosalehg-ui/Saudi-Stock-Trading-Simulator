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

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
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
  right.style.textAlign = 'left';
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
    refs.changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
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
    p.style.textAlign = 'center';
    p.style.color = '#95a5a6';
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
          <div class="stock-name">${lang === 'ar' ? stock.name : stock.nameEn}</div>
          <div class="stock-symbol">${symbol} - ${holding.quantity} ${t('shares')}</div>
        </div>
      </div>
      <div class="portfolio-details">
        <div class="detail-item"><span>${t('lastPrice')}:</span><strong>${currentPrice.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('avgCost')}:</span><strong>${holding.avgCost.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('totalCost')}:</span><strong>${costBasis.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('marketValue')}:</span><strong>${marketValue.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('valueAfterSell')}:</span><strong>${valueAfterSell.toFixed(2)} ${sar}</strong></div>
        <div class="detail-item"><span>${t('pnlAfterSell')}:</span><strong class="${profitAfterSell >= 0 ? 'positive' : 'negative'}">${profitAfterSell >= 0 ? '+' : ''}${profitAfterSell.toFixed(2)} ${sar} (${profitAfterSell >= 0 ? '+' : ''}${((profitAfterSell / costBasis) * 100).toFixed(2)}%)</strong></div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'portfolio-actions';
    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn btn-primary';
    buyBtn.style.flex = '1';
    buyBtn.textContent = t('buyMore');
    buyBtn.addEventListener('click', () => onQuickTrade(symbol, 'buy'));
    const sellBtn = document.createElement('button');
    sellBtn.className = 'btn btn-danger';
    sellBtn.style.flex = '1';
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
    p.style.textAlign = 'center';
    p.style.color = '#95a5a6';
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
          <strong style="font-size: 16px;">${lang === 'ar' ? stock.name : stock.nameEn}</strong>
          <span style="color:#95a5a6;margin-${lang === 'ar' ? 'right' : 'left'}:10px;">(${order.symbol})</span>
        </div>
        <span class="btn ${order.type === 'buy' ? 'btn-primary' : 'btn-danger'}" style="padding:5px 15px;font-size:12px;">
          ${order.type === 'buy' ? t('buy') : t('sell')} · ${order.kind === 'stop-loss' ? t('orderKindStopLoss') : t('orderKindLimit')}
        </span>
      </div>
      <div class="order-details">
        <div>${t('quantity')}: <strong>${order.quantity}</strong></div>
        <div>${order.kind === 'stop-loss' ? t('stopPrice') : t('limitPrice')}: <strong>${refPrice.toFixed(2)} ${sar}</strong></div>
        <div>${t('currentPrice')}: <strong>${currentPrice.toFixed(2)} ${sar}</strong></div>
        <div>${t('difference')}: <span class="${priceDiff >= 0 ? 'positive' : 'negative'}">${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)}%</span></div>
        <div style="grid-column:1/-1;">${t('date')}: ${formatDateBilingual(order.timestamp, lang)}</div>
      </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'order-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-danger';
    cancelBtn.style.width = '100%';
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
  pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ${t('sar')} (${pnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;
  pnlEl.className = 'stat-value ' + (pnl >= 0 ? 'positive' : 'negative');

  return { pnlPercent, totalValue };
}

/**
 * Update the challenge progress bars and grant any newly-earned rewards.
 * @returns {{challenge1JustCompleted: boolean, challenge2JustCompleted: boolean}}
 */
export function updateChallenges({ pnlPercent, totalValue, showAlertFn }) {
  const progress1 = Math.min((pnlPercent / CHALLENGE_1_THRESHOLD) * 100, 100);
  const progress2 = Math.min((pnlPercent / CHALLENGE_2_THRESHOLD) * 100, 100);
  document.getElementById('challenge1-progress').style.width = `${progress1}%`;
  document.getElementById('challenge2-progress').style.width = `${progress2}%`;

  const { challenge1JustCompleted, challenge2JustCompleted } = evaluateChallenges({
    pnlPercent,
    totalValue,
  });
  if (challenge1JustCompleted && showAlertFn) showAlertFn(t('challenge1Complete'));
  if (challenge2JustCompleted && showAlertFn) showAlertFn(t('challenge2Complete'));

  return { challenge1JustCompleted, challenge2JustCompleted };
}

export function updateTicker() {
  const tickerEl = document.getElementById('ticker');
  if (!tickerEl) return;
  const lang = getLang();
  let html = '';
  stocks.forEach((stock) => {
    const price = stockPrices[stock.symbol];
    const change = ((price - stock.basePrice) / stock.basePrice) * 100;
    const changeClass = change >= 0 ? 'positive' : 'negative';
    html += `
      <span class="ticker-item">
        <strong>${lang === 'ar' ? stock.name : stock.nameEn}</strong>
        ${price.toFixed(2)}
        <span class="${changeClass}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%</span>
      </span>
    `;
  });
  tickerEl.innerHTML = html + html;
}

export function updateNewsTicker() {
  const tickerEl = document.getElementById('news-ticker');
  if (!tickerEl) return;
  const lang = getLang();
  let html = '';
  if (activeNews.items.length === 0) {
    const placeholder = `<span class="news-item">📰 ${lang === 'ar' ? 'لا توجد أخبار جديدة' : 'No new news'}</span>`;
    html = placeholder.repeat(3);
  } else {
    activeNews.items.forEach((news) => {
      const icon = news.type === 'positive' ? '📈' : '📉';
      const className = news.type === 'positive' ? 'news-positive' : 'news-negative';
      html += `<span class="news-item"><span class="${className}">${icon} 📰 ${escapeHtml(newsText(news, lang))}</span></span>`;
    });
  }
  tickerEl.innerHTML = html + html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
