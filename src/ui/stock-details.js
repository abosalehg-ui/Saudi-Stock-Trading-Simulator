import { findStock } from '../data/stocks.js';
import { gameState, stockPrices, priceHistory, session } from '../state.js';
import { getLang, t } from './i18n.js';
import { isMarketOpen } from '../engine/market-hours.js';
import { changePercent } from '../engine/stock-filter.js';
import { direction, formatPrice, formatChange } from '../utils/numbers.js';
import { html, setHtml } from './dom.js';

let onSubmitOrder = () => {};

export function bindStockDetailsCallbacks(callbacks) {
  onSubmitOrder = callbacks.onSubmitOrder ?? onSubmitOrder;
}

/**
 * Which indicators are switched on, kept here rather than read back off the
 * checkboxes.
 *
 * The DOM used to be the only record of it, so every rebuild of this panel — a
 * theme switch, a language switch, crossing the 1024px breakpoint — silently
 * cleared the user's chart setup.
 *
 * @type {{candle: boolean, sma20: boolean, sma50: boolean, rsi: boolean, macd: boolean}}
 */
const indicatorState = { candle: false, sma20: false, sma50: false, rsi: false, macd: false };

/** @returns {typeof indicatorState} a copy; callers must not mutate the source */
export function getIndicatorState() {
  return { ...indicatorState };
}

/**
 * The order form's inputs, kept for the same reason as indicatorState.
 *
 * A rebuild used to put the radio back on "market" with the price field hidden.
 * Someone who had set up a stop-loss, then rotated the phone or switched
 * language, got a market order from the same Sell button.
 *
 * Restored only when the rebuild is for the same stock; picking a different
 * stock starts from a fresh market order.
 *
 * @type {{symbol: string|null, kind: 'market'|'limit'|'stop-loss', quantity: string, price: string}}
 */
const orderForm = { symbol: null, kind: 'market', quantity: '', price: '' };

/**
 * Forget the form's contents, e.g. after the order it held was placed. Also
 * clears the fields on screen: on the desktop layout the panel stays open
 * after an order, so it would otherwise keep showing the old values.
 */
export function resetOrderForm() {
  const symbol = orderForm.symbol;
  Object.assign(orderForm, { symbol: null, kind: 'market', quantity: '', price: '' });
  const quantity = /** @type {HTMLInputElement|null} */ (document.getElementById('order-quantity'));
  const price = /** @type {HTMLInputElement|null} */ (document.getElementById('order-price'));
  if (!quantity || !price) return;
  // The panel is still showing this stock's (now empty) form.
  orderForm.symbol = symbol;
  quantity.value = '';
  price.value = '';
  price.hidden = true;
  const market = /** @type {HTMLInputElement|null} */ (
    document.querySelector('input[name="orderType"][value="market"]')
  );
  if (market) market.checked = true;
}

/** @returns {typeof orderForm} a copy */
export function getOrderFormState() {
  return { ...orderForm };
}

/**
 * Show a validation or execution error under the order form, or clear it with
 * an empty message. Inline rather than in a modal, so focus stays in the field
 * being corrected.
 *
 * @param {string} message
 * @returns {boolean} false when there is no order form to show it in
 */
export function showOrderError(message) {
  const el = document.getElementById('order-error');
  if (!el) return false;
  el.textContent = message;
  el.hidden = !message;
  return true;
}

const INDICATOR_IDS = {
  candle: 'ind-candle',
  sma20: 'ind-sma20',
  sma50: 'ind-sma50',
  rsi: 'ind-rsi',
  macd: 'ind-macd',
};

/**
 * Draw the chart for `symbol` honouring the current indicator selection.
 *
 * Chart.js is ~200KB of the bundle and nothing here runs until a stock is
 * selected, so both renderers are pulled in on demand: the initial bundle drops
 * from ~310KB to ~100KB. Every caller is async as a result — awaited only by
 * the tests, since a chart that paints a tick later is invisible to the user.
 *
 * @param {string} symbol
 */
async function drawChart(symbol) {
  if (indicatorState.candle) {
    const { renderCandlestick } = await import('./candlestick.js');
    renderCandlestick('price-chart', symbol);
    return;
  }
  const { renderChart } = await import('./chart.js');
  renderChart(symbol, indicatorState);
}

/**
 * Text that changes on every price tick, split out of the full render so
 * refreshAll() can update it without rebuilding the panel.
 *
 * @param {string} symbol
 * @returns {{priceText: string, changeText: string, changeClass: string, marketOpen: boolean}}
 */
function priceFieldsFor(symbol) {
  const stock = findStock(symbol);
  const price = stockPrices[symbol];
  const change = changePercent(stock, stockPrices);
  return {
    priceText: formatPrice(price, t('sar')),
    changeText: formatChange(change),
    changeClass: direction(change).className,
    marketOpen: isMarketOpen() || gameState.allow24Trading,
  };
}

/**
 * Text alternative for the price chart: the canvas carried only the words
 * "current price", with neither the number nor the trend it draws.
 *
 * @param {string} symbol
 * @param {string} priceText
 * @returns {string}
 */
function chartLabelFor(symbol, priceText) {
  const history = priceHistory[symbol] || [];
  const first = history[0]?.price;
  const last = history[history.length - 1]?.price;
  const trend = first > 0 && last > 0 ? formatChange(((last - first) / first) * 100) : '';
  return t('chartSummary')
    .replace('{price}', priceText)
    .replace('{trend}', trend)
    .replace('{points}', String(history.length));
}

/**
 * Patch the live parts of an already-built details panel: the price, the change
 * and the market-closed warning, plus the chart's data.
 *
 * This is the half that runs on every tick. Rebuilding instead would wipe a
 * half-typed quantity and reset the indicator checkboxes under the user's
 * hands, which is why the panel is split in two at all.
 *
 * A no-op when the panel is not currently showing `symbol`.
 *
 * @param {string} symbol
 */
export async function patchStockDetails(symbol) {
  const priceEl = document.getElementById('stock-detail-price-value');
  if (!priceEl || priceEl.dataset.symbol !== symbol) return;

  const { priceText, changeText, changeClass, marketOpen } = priceFieldsFor(symbol);
  priceEl.textContent = priceText;

  const changeEl = document.getElementById('stock-detail-change-value');
  if (changeEl) {
    changeEl.textContent = changeText;
    changeEl.className = changeClass;
  }

  const warning = document.getElementById('stock-detail-market-warning');
  if (warning) warning.hidden = marketOpen;

  document
    .getElementById('price-chart')
    ?.setAttribute('aria-label', chartLabelFor(symbol, priceText));

  await drawChart(symbol);
}

/**
 * Build the whole details panel for a stock: header, chart, order form.
 *
 * Call this when the selection (or the language/theme/layout) changes. For a
 * plain price tick call patchStockDetails() instead.
 *
 * @param {string} symbol
 */
export async function renderStockDetails(symbol) {
  const stock = findStock(symbol);
  if (!stock) return;
  const lang = getLang();
  const { priceText, changeText, changeClass, marketOpen } = priceFieldsFor(symbol);

  const detailsEl = document.getElementById('stock-details');
  if (!detailsEl) return;

  // Three blocks rather than two columns of mixed content: the header spans
  // the grid, then the chart, then the order form. Stacked (phone modal, or
  // the desktop side panel) that reads price -> chart -> act, instead of
  // burying the chart below the buy/sell buttons.
  setHtml(
    detailsEl,
    html`
      <div class="stock-details-grid">
        <div class="stock-details-header">
          <h3 id="stock-title">
            ${lang === 'ar' ? stock.name : stock.nameEn}
            (${symbol})${stock.isShariaCompliant ? ' 🕌' : ''}
          </h3>
          <p class="stock-detail-price">
            ${t('currentPrice')}:
            <strong id="stock-detail-price-value" data-symbol="${symbol}">${priceText}</strong>
          </p>
          <p>
            ${t('change')}:
            <span id="stock-detail-change-value" class="${changeClass}">${changeText}</span>
          </p>
          <p
            class="market-warning"
            id="stock-detail-market-warning"
            role="alert"
            ${marketOpen ? 'hidden' : ''}
          >
            ⚠️ ${t('marketClosedMessage')}
          </p>
        </div>

        <div class="stock-details-chart">
          <div class="chart-container">
            <canvas
              id="price-chart"
              role="img"
              aria-label="${chartLabelFor(symbol, priceText)}"
            ></canvas>
          </div>
          <div class="indicator-controls" role="group" aria-label="${t('indicators')}">
            <label><input type="checkbox" id="ind-candle" /> ${t('candlestickToggle')}</label>
            <label><input type="checkbox" id="ind-sma20" /> SMA 20</label>
            <label><input type="checkbox" id="ind-sma50" /> SMA 50</label>
            <label><input type="checkbox" id="ind-rsi" /> RSI</label>
            <label><input type="checkbox" id="ind-macd" /> MACD</label>
          </div>
        </div>

        <div class="order-form" role="group" aria-labelledby="stock-title">
          <div class="order-type" role="radiogroup" aria-label="${t('orderTypeGroup')}">
            <label>
              <input type="radio" name="orderType" value="market" checked />
              <span>${t('market')}</span>
            </label>
            <label>
              <input type="radio" name="orderType" value="limit" />
              <span>${t('limit')}</span>
            </label>
            <label>
              <input type="radio" name="orderType" value="stop-loss" />
              <span>${t('stopLoss')}</span>
            </label>
          </div>
          <label for="order-quantity" class="sr-only">${t('quantity')}</label>
          <!-- type="text" rather than "number": a number input may discard
               Arabic-Indic digits (١٠٠) before the code sees them, and the
               parser normalises them itself. -->
          <input
            type="text"
            id="order-quantity"
            placeholder="${t('quantity')}"
            inputmode="numeric"
            autocomplete="off"
            aria-describedby="order-error"
          />
          <label for="order-price" class="sr-only">${t('priceForLimitOrders')}</label>
          <input
            type="text"
            id="order-price"
            placeholder="${t('priceForLimitOrders')}"
            inputmode="decimal"
            autocomplete="off"
            aria-describedby="order-error"
            hidden
          />
          <p id="order-error" class="order-error" role="alert" hidden></p>
          <div class="order-submit-row">
            <button class="btn btn-buy order-submit-btn" id="order-buy">${t('buy')}</button>
            <button class="btn btn-danger order-submit-btn" id="order-sell">${t('sell')}</button>
          </div>
        </div>
      </div>
    `
  );

  const priceInput = /** @type {HTMLInputElement} */ (document.getElementById('order-price'));
  const quantityInput = /** @type {HTMLInputElement} */ (document.getElementById('order-quantity'));

  if (orderForm.symbol !== symbol) {
    resetOrderForm();
    orderForm.symbol = symbol;
  }

  const applyKind = (kind) => {
    priceInput.hidden = kind === 'market';
    priceInput.placeholder =
      kind === 'stop-loss' ? t('stopPricePlaceholder') : t('priceForLimitOrders');
  };

  document.querySelectorAll('input[name="orderType"]').forEach((el) => {
    const radio = /** @type {HTMLInputElement} */ (el);
    radio.checked = radio.value === orderForm.kind;
    radio.addEventListener('change', () => {
      orderForm.kind = /** @type {typeof orderForm.kind} */ (radio.value);
      applyKind(orderForm.kind);
      showOrderError('');
    });
  });
  applyKind(orderForm.kind);
  quantityInput.value = orderForm.quantity;
  priceInput.value = orderForm.price;

  quantityInput.addEventListener('input', () => {
    orderForm.quantity = quantityInput.value;
    showOrderError('');
  });
  priceInput.addEventListener('input', () => {
    orderForm.price = priceInput.value;
    showOrderError('');
  });

  document.getElementById('order-buy').addEventListener('click', () => submit('buy'));
  document.getElementById('order-sell').addEventListener('click', () => submit('sell'));

  // Restore the surviving selection onto the fresh checkboxes, then keep the
  // module-level record in step with them.
  Object.entries(INDICATOR_IDS).forEach(([key, id]) => {
    const box = /** @type {HTMLInputElement} */ (document.getElementById(id));
    if (!box) return;
    box.checked = indicatorState[key];
    box.addEventListener('change', () => {
      indicatorState[key] = box.checked;
      drawChart(symbol);
    });
  });

  await drawChart(symbol);
}

function submit(type) {
  const quantityRaw = document.getElementById('order-quantity').value;
  const kindEl = document.querySelector('input[name="orderType"]:checked');
  const kind = kindEl ? kindEl.value : 'market';
  const priceRaw = document.getElementById('order-price').value;
  onSubmitOrder({
    symbol: session.selectedStock,
    type,
    kind,
    quantityRaw,
    priceRaw,
  });
}
