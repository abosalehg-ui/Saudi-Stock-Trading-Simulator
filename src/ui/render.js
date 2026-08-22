import { CHALLENGE_1_THRESHOLD, CHALLENGE_2_THRESHOLD, COMMISSION } from '../config.js';
import { stocks, findStock } from '../data/stocks.js';
import { financialTips } from '../data/tips.js';
import { gameState, stockPrices, activeNews, session } from '../state.js';
import { getLang, t } from './i18n.js';
import { formatCurrency, direction } from '../utils/numbers.js';
import { formatDateBilingual, formatHijriToday } from '../utils/dates.js';
import { isMarketOpen, describeNextOpen } from '../engine/market-hours.js';
import { newsText } from '../engine/news.js';
import { selectStocks, changePercent } from '../engine/stock-filter.js';
import { clearChildren, html, setHtml } from './dom.js';

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
 * Search / sector / sort state for the list. Deliberately not persisted: it is
 * a view of the catalogue, not part of the player's saved game.
 *
 * @type {{query: string, sector: string, sort: import('../engine/stock-filter.js').StockSort}}
 */
const listFilters = { query: '', sector: 'all', sort: 'default' };

/**
 * Merge in a filter change and rebuild the list.
 * @param {Partial<typeof listFilters>} patch
 */
export function setStockListFilters(patch) {
  Object.assign(listFilters, patch);
  renderStocks();
}

/** @returns {typeof listFilters} a copy, so callers can't mutate the state behind renderStocks() */
export function getStockListFilters() {
  return { ...listFilters };
}

/**
 * Full rebuild of the stock list: needed whenever which stocks are shown or
 * how they're labeled changes (Sharia filter, search, sector, sort, language).
 * Call updateStockPrices() instead for a plain price tick or selection change.
 */
export function renderStocks() {
  const listEl = document.getElementById('stock-list');
  if (!listEl) return;
  clearChildren(listEl);
  stockItemRefs.clear();
  const lang = getLang();
  const filtered = selectStocks({
    stocks,
    prices: stockPrices,
    shariaOnly: !!gameState.shariaFilter,
    query: listFilters.query,
    sector: listFilters.sector,
    sort: listFilters.sort,
    lang,
  });

  if (filtered.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = t('noStocksMatch');
    listEl.appendChild(p);
  } else {
    filtered.forEach((stock) => {
      const refs = buildStockItem(stock, lang);
      stockItemRefs.set(stock.symbol, refs);
      listEl.appendChild(refs.container);
    });
  }

  const countEl = document.getElementById('stock-count');
  if (countEl) countEl.textContent = `${filtered.length} ${t('stocksShown')}`;
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
    const change = changePercent(stock, stockPrices);
    const { glyph, className } = direction(change);
    refs.priceEl.textContent = `${price.toFixed(2)} ${t('sar')}`;
    refs.changeEl.textContent = `${glyph} ${Math.abs(change).toFixed(2)}%`;
    refs.changeEl.className = `stock-change ${className}`;
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
    const { glyph, className } = direction(profitAfterSell);
    // costBasis is zero only for a holding bought at price 0, which the price
    // floor makes unreachable — but dividing anyway would print NaN%, so the
    // percentage is simply omitted rather than rendered as garbage.
    const pnlPct =
      costBasis > 0 ? ` (${Math.abs((profitAfterSell / costBasis) * 100).toFixed(2)}%)` : '';
    setHtml(
      div,
      html`
        <div class="stock-header">
          <div>
            <div class="stock-name">${lang === 'ar' ? stock.name : stock.nameEn}</div>
            <div class="stock-symbol">${symbol} - ${holding.quantity} ${t('shares')}</div>
          </div>
        </div>
        <div class="portfolio-details">
          <div class="detail-item">
            <span>${t('lastPrice')}:</span><strong>${currentPrice.toFixed(2)} ${sar}</strong>
          </div>
          <div class="detail-item">
            <span>${t('avgCost')}:</span><strong>${holding.avgCost.toFixed(2)} ${sar}</strong>
          </div>
          <div class="detail-item">
            <span>${t('totalCost')}:</span><strong>${costBasis.toFixed(2)} ${sar}</strong>
          </div>
          <div class="detail-item">
            <span>${t('marketValue')}:</span><strong>${marketValue.toFixed(2)} ${sar}</strong>
          </div>
          <div class="detail-item">
            <span>${t('valueAfterSell')}:</span><strong>${valueAfterSell.toFixed(2)} ${sar}</strong>
          </div>
          <div class="detail-item">
            <span>${t('pnlAfterSell')}:</span>
            <strong class="${className}">
              ${glyph} ${Math.abs(profitAfterSell).toFixed(2)} ${sar}${pnlPct}
            </strong>
          </div>
        </div>
      `
    );

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
    // A pending order always carries a finite, positive reference price (both
    // state.js's loader and validateOrder() enforce it), so this cannot divide
    // by zero — but guard rather than depend on a validator two modules away.
    const priceDiff = refPrice > 0 ? ((currentPrice - refPrice) / refPrice) * 100 : 0;
    const sar = t('sar');
    const div = document.createElement('div');
    div.className = 'order-item';
    const { glyph, className } = direction(priceDiff);
    setHtml(
      div,
      html`
        <div class="order-header">
          <div>
            <strong class="order-stock-name">${lang === 'ar' ? stock.name : stock.nameEn}</strong>
            <span class="order-stock-symbol">(${order.symbol})</span>
          </div>
          <span class="btn order-kind-badge ${order.type === 'buy' ? 'btn-buy' : 'btn-danger'}">
            ${order.type === 'buy' ? t('buy') : t('sell')} ·
            ${order.kind === 'stop-loss' ? t('orderKindStopLoss') : t('orderKindLimit')}
          </span>
        </div>
        <div class="order-details">
          <div>${t('quantity')}: <strong>${order.quantity}</strong></div>
          <div>
            ${order.kind === 'stop-loss' ? t('stopPrice') : t('limitPrice')}:
            <strong>${refPrice.toFixed(2)} ${sar}</strong>
          </div>
          <div>${t('currentPrice')}: <strong>${currentPrice.toFixed(2)} ${sar}</strong></div>
          <div>
            ${t('difference')}:
            <span class="${className}">${glyph} ${Math.abs(priceDiff).toFixed(2)}%</span>
          </div>
          <div class="order-date-row">
            ${t('date')}: ${formatDateBilingual(order.timestamp, lang)}
          </div>
        </div>
      `
    );
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
  const { glyph, className } = direction(pnl);
  pnlEl.textContent = `${glyph} ${Math.abs(pnl).toFixed(2)} ${t('sar')} (${Math.abs(pnlPercent).toFixed(2)}%)`;
  pnlEl.className = `stat-value ${className}`;

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
 * Draw the challenge progress bars. Rendering only.
 *
 * Granting the rewards used to happen here, which made every repaint a
 * money-moving operation: evaluateChallenges() mutates cash and initialCapital,
 * so a function whose job is to set two bar widths could change the player's
 * balance. main.js owns that call now, and this just reflects the result.
 *
 * @param {{pnlPercent: number}} args
 */
export function updateChallenges({ pnlPercent }) {
  setChallengeProgress(
    'challenge1-progress',
    Math.min((pnlPercent / CHALLENGE_1_THRESHOLD) * 100, 100)
  );
  setChallengeProgress(
    'challenge2-progress',
    Math.min((pnlPercent / CHALLENGE_2_THRESHOLD) * 100, 100)
  );
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
    const change = changePercent(stock, stockPrices);
    const { glyph, className } = direction(change);
    const refs = tickerRefs.get(stock.symbol) || [];
    refs.forEach(({ priceEl, changeEl }) => {
      priceEl.textContent = price.toFixed(2);
      changeEl.textContent = `${glyph} ${Math.abs(change).toFixed(2)}%`;
      changeEl.className = className;
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
  // Shuffle-and-take rather than reject-until-distinct: the old loop spun
  // forever (hanging the tab, not just the render) if the list ever held fewer
  // than three distinct tips. This terminates whatever the data looks like.
  const pool = [...tips];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected = pool.slice(0, 3);
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
