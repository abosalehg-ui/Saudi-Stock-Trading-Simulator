import {
  CHALLENGE_1_THRESHOLD,
  CHALLENGE_1_REWARD,
  CHALLENGE_2_THRESHOLD,
  CHALLENGE_2_REWARD,
  COMMISSION,
} from '../config.js';
import { stocks, findStock } from '../data/stocks.js';
import { financialTips } from '../data/tips.js';
import { gameState, stockPrices, activeNews, session } from '../state.js';
import { getLang, t } from './i18n.js';
import { formatCurrency } from '../utils/numbers.js';
import { formatDateBilingual, formatHijriToday } from '../utils/dates.js';
import { isMarketOpen, describeNextOpen } from '../engine/market-hours.js';

let onSelectStock = () => {};
let onCancelOrder = () => {};
let onQuickTrade = () => {};

export function bindRenderCallbacks(callbacks) {
  onSelectStock = callbacks.onSelectStock ?? onSelectStock;
  onCancelOrder = callbacks.onCancelOrder ?? onCancelOrder;
  onQuickTrade = callbacks.onQuickTrade ?? onQuickTrade;
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function renderStocks() {
  const listEl = document.getElementById('stock-list');
  if (!listEl) return;
  clearChildren(listEl);
  const lang = getLang();
  const filtered = gameState.shariaFilter
    ? stocks.filter((s) => s.isShariaCompliant)
    : stocks;

  filtered.forEach((stock) => {
    const price = stockPrices[stock.symbol];
    const change = ((price - stock.basePrice) / stock.basePrice) * 100;
    const changeClass = change >= 0 ? 'positive' : 'negative';

    const div = document.createElement('div');
    div.className = 'stock-item' + (session.selectedStock === stock.symbol ? ' selected' : '');
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `${lang === 'ar' ? stock.name : stock.nameEn} ${stock.symbol}`);
    div.addEventListener('click', () => onSelectStock(stock.symbol));
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectStock(stock.symbol);
      }
    });

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
    priceDiv.textContent = `${price.toFixed(2)} ${t('sar')}`;
    const changeDiv = document.createElement('div');
    changeDiv.className = `stock-change ${changeClass}`;
    changeDiv.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    right.appendChild(priceDiv);
    right.appendChild(changeDiv);

    header.appendChild(left);
    header.appendChild(right);
    div.appendChild(header);
    listEl.appendChild(div);
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

  orders.forEach((order, index) => {
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
    cancelBtn.addEventListener('click', () => onCancelOrder(index));
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
  document.getElementById('portfolio-value').textContent = formatCurrency(portfolioValue, lang, t('sar'));
  document.getElementById('total-value').textContent = formatCurrency(totalValue, lang, t('sar'));

  const pnlEl = document.getElementById('pnl');
  pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ${t('sar')} (${pnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;
  pnlEl.className = 'stat-value ' + (pnl >= 0 ? 'positive' : 'negative');

  return { pnlPercent, totalValue };
}

export function updateChallenges({ pnlPercent, totalValue, showAlertFn }) {
  const progress1 = Math.min((pnlPercent / CHALLENGE_1_THRESHOLD) * 100, 100);
  const progress2 = Math.min((pnlPercent / CHALLENGE_2_THRESHOLD) * 100, 100);
  document.getElementById('challenge1-progress').style.width = `${progress1}%`;
  document.getElementById('challenge2-progress').style.width = `${progress2}%`;

  if (pnlPercent >= CHALLENGE_1_THRESHOLD && !gameState.challenge1Completed) {
    gameState.challenge1Completed = true;
    gameState.cash += CHALLENGE_1_REWARD;
    gameState.initialCapital = totalValue;
    if (showAlertFn) showAlertFn(t('challenge1Complete'));
  }
  if (pnlPercent >= CHALLENGE_2_THRESHOLD && !gameState.challenge2Completed) {
    gameState.challenge2Completed = true;
    gameState.cash += CHALLENGE_2_REWARD;
    gameState.initialCapital = totalValue;
    if (showAlertFn) showAlertFn(t('challenge2Complete'));
  }
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
      html += `<span class="news-item"><span class="${className}">${icon} 📰 ${escapeHtml(news.text)}</span></span>`;
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
