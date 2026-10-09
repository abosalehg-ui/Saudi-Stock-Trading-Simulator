import { CHALLENGE_1_THRESHOLD, CHALLENGE_2_THRESHOLD, COMMISSION } from '../config.js';
import { stocks, findStock } from '../data/stocks.js';
import { financialTips } from '../data/tips.js';
import { gameState, stockPrices, activeNews, session } from '../state.js';
import { getLang, t } from './i18n.js';
import { formatCurrency, formatPrice, formatChange, direction } from '../utils/numbers.js';
import { formatDateBilingual, formatHijriToday } from '../utils/dates.js';
import { isMarketOpen, describeNextOpen } from '../engine/market-hours.js';
import { newsText } from '../engine/news.js';
import { selectStocks, changePercent } from '../engine/stock-filter.js';
import { clearChildren, html, setHtml, placeChildren, reconcileKeyed } from './dom.js';

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
    refs.priceEl.textContent = formatPrice(price, t('sar'));
    refs.changeEl.textContent = formatChange(change);
    refs.changeEl.className = `stock-change ${direction(change).className}`;
    refs.container.classList.toggle('selected', session.selectedStock === symbol);
  });
  if (listFilters.sort === 'gainers' || listFilters.sort === 'losers') resortStockList();
}

/**
 * Re-apply a change-based sort after a tick. Without this the list was ordered
 * once, when the sort was picked, and "top gainers" drifted out of order as
 * prices moved. Only nodes that are out of place are moved.
 */
function resortStockList() {
  const listEl = document.getElementById('stock-list');
  if (!listEl || stockItemRefs.size === 0) return;
  const ordered = selectStocks({
    stocks,
    prices: stockPrices,
    shariaOnly: !!gameState.shariaFilter,
    query: listFilters.query,
    sector: listFilters.sector,
    sort: listFilters.sort,
    lang: getLang(),
  });
  const nodes = ordered.map((stock) => stockItemRefs.get(stock.symbol)?.container).filter(Boolean);
  if (nodes.length === stockItemRefs.size) placeChildren(listEl, nodes);
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

/**
 * Show the empty-state paragraph in `host` (and forget its rows), or remove it.
 * @param {Element} host
 * @param {Map<string, unknown>} cache
 * @param {string|null} text - null when the list has rows
 * @returns {boolean} true when the empty state is showing
 */
function syncEmptyState(host, cache, text) {
  if (text === null) {
    host.querySelector(':scope > .empty-state')?.remove();
    return false;
  }
  cache.clear();
  clearChildren(host);
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  host.appendChild(p);
  return true;
}

/**
 * A list row made of a details block, re-rendered every tick (it holds no
 * focusable elements), and an actions block built once with its buttons.
 * @param {string} className
 * @param {string} actionsClass
 * @param {HTMLButtonElement[]} buttons
 */
function buildRow(className, actionsClass, buttons) {
  const el = document.createElement('div');
  el.className = className;
  const body = document.createElement('div');
  const actions = document.createElement('div');
  actions.className = actionsClass;
  buttons.forEach((b) => actions.appendChild(b));
  el.appendChild(body);
  el.appendChild(actions);
  return { el, body };
}

/** @param {string} className @param {string} label @param {() => void} onClick */
function makeButton(className, label, onClick) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

// Keyed by `${lang}:${symbol}` / `${lang}:${order.id}`, so a language switch
// rebuilds the rows (their button labels are translated) while a price tick
// only patches them.
const portfolioRows = new Map();
const pendingOrderRows = new Map();

export function renderPortfolio() {
  const portfolioEl = document.getElementById('portfolio');
  if (!portfolioEl) return;
  const lang = getLang();
  const holdings = Object.entries(gameState.portfolio).filter(([symbol]) => findStock(symbol));

  if (syncEmptyState(portfolioEl, portfolioRows, holdings.length ? null : t('portfolioEmpty'))) {
    return;
  }

  reconcileKeyed(portfolioEl, portfolioRows, holdings, {
    key: ([symbol]) => `${lang}:${symbol}`,
    create: ([symbol]) =>
      buildRow('portfolio-item', 'portfolio-actions', [
        makeButton('btn btn-buy portfolio-action-btn', t('buyMore'), () =>
          onQuickTrade(symbol, 'buy')
        ),
        makeButton('btn btn-danger portfolio-action-btn', t('sellAll'), () =>
          onQuickTrade(symbol, 'sell')
        ),
      ]),
    update: (row, [symbol, holding]) => renderHoldingDetails(row.body, symbol, holding, lang),
  });
}

function renderHoldingDetails(body, symbol, holding, lang) {
  const stock = findStock(symbol);
  const currentPrice = stockPrices[symbol];
  const marketValue = currentPrice * holding.quantity;
  const costBasis = holding.avgCost * holding.quantity;
  const valueAfterSell = marketValue * (1 - COMMISSION);
  const profitAfterSell = valueAfterSell - costBasis;
  const sar = t('sar');
  const { glyph, className } = direction(profitAfterSell);
  // costBasis is zero only for a holding bought at price 0, which the price
  // floor makes unreachable; omit the percentage rather than print NaN%.
  const pnlPct =
    costBasis > 0 ? ` (${Math.abs((profitAfterSell / costBasis) * 100).toFixed(2)}%)` : '';
  setHtml(
    body,
    html`
      <div class="stock-header">
        <div>
          <div class="stock-name">${lang === 'ar' ? stock.name : stock.nameEn}</div>
          <div class="stock-symbol">${symbol} - ${holding.quantity} ${t('shares')}</div>
        </div>
      </div>
      <div class="portfolio-details">
        <div class="detail-item">
          <span>${t('lastPrice')}:</span><strong>${formatPrice(currentPrice, sar)}</strong>
        </div>
        <div class="detail-item">
          <span>${t('avgCost')}:</span><strong>${formatPrice(holding.avgCost, sar)}</strong>
        </div>
        <div class="detail-item">
          <span>${t('totalCost')}:</span><strong>${formatPrice(costBasis, sar)}</strong>
        </div>
        <div class="detail-item">
          <span>${t('marketValue')}:</span><strong>${formatPrice(marketValue, sar)}</strong>
        </div>
        <div class="detail-item">
          <span>${t('valueAfterSell')}:</span><strong>${formatPrice(valueAfterSell, sar)}</strong>
        </div>
        <div class="detail-item">
          <span>${t('pnlAfterSell')}:</span>
          <strong class="${className}">
            ${glyph} ${formatPrice(Math.abs(profitAfterSell), sar)}${pnlPct}
          </strong>
        </div>
      </div>
    `
  );
}

export function renderPendingOrders() {
  const ordersEl = document.getElementById('pending-orders');
  if (!ordersEl) return;
  const lang = getLang();
  const orders = (gameState.pendingOrders || []).filter((order) => findStock(order.symbol));

  if (syncEmptyState(ordersEl, pendingOrderRows, orders.length ? null : t('noPendingOrders'))) {
    return;
  }

  reconcileKeyed(ordersEl, pendingOrderRows, orders, {
    key: (order) => `${lang}:${order.id}`,
    create: (order) =>
      buildRow('order-item', 'order-actions', [
        makeButton('btn btn-danger cancel-order-btn', t('cancelOrder'), () =>
          onCancelOrder(order.id)
        ),
      ]),
    update: (row, order) => renderPendingOrderDetails(row.body, order, lang),
  });
}

function renderPendingOrderDetails(body, order, lang) {
  const stock = findStock(order.symbol);
  const currentPrice = stockPrices[order.symbol];
  const refPrice = order.kind === 'stop-loss' ? order.stopPrice : order.limitPrice;
  // Both the save loader and validateOrder() guarantee a positive reference
  // price; guard anyway rather than depend on a validator two modules away.
  const priceDiff = refPrice > 0 ? ((currentPrice - refPrice) / refPrice) * 100 : 0;
  const sar = t('sar');
  setHtml(
    body,
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
          <strong>${formatPrice(refPrice, sar)}</strong>
        </div>
        <div>${t('currentPrice')}: <strong>${formatPrice(currentPrice, sar)}</strong></div>
        <div>
          ${t('difference')}:
          <span class="${direction(priceDiff).className}">${formatChange(priceDiff)}</span>
        </div>
        <div class="order-date-row">
          ${t('date')}: ${formatDateBilingual(order.timestamp, lang)}
        </div>
      </div>
    `
  );
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
    const { className } = direction(change);
    const refs = tickerRefs.get(stock.symbol) || [];
    refs.forEach(({ priceEl, changeEl }) => {
      priceEl.textContent = price.toFixed(2);
      changeEl.textContent = formatChange(change);
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
