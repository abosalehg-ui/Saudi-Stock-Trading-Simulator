import { findStock } from '../data/stocks.js';
import { gameState, stockPrices, session } from '../state.js';
import { getLang, t } from './i18n.js';
import { renderChart } from './chart.js';
import { renderCandlestick } from './candlestick.js';
import { isMarketOpen } from '../engine/market-hours.js';
import { escapeHtml } from './dom.js';

let onSubmitOrder = () => {};

export function bindStockDetailsCallbacks(callbacks) {
  onSubmitOrder = callbacks.onSubmitOrder ?? onSubmitOrder;
}

export function renderStockDetails(symbol) {
  const stock = findStock(symbol);
  if (!stock) return;
  const price = stockPrices[symbol];
  const change = ((price - stock.basePrice) / stock.basePrice) * 100;
  const lang = getLang();
  const sar = t('sar');
  const marketOpen = isMarketOpen() || gameState.allow24Trading;

  const detailsEl = document.getElementById('stock-details');
  detailsEl.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'stock-details-grid';

  const left = document.createElement('div');
  left.innerHTML = `
    <h3 id="stock-title">${escapeHtml(lang === 'ar' ? stock.name : stock.nameEn)} (${escapeHtml(symbol)})${stock.isShariaCompliant ? ' 🕌' : ''}</h3>
    <p class="stock-detail-price">${escapeHtml(t('currentPrice'))}: <strong>${price.toFixed(2)} ${escapeHtml(sar)}</strong></p>
    <p>${escapeHtml(t('change'))}: <span class="${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%</span></p>
    ${marketOpen ? '' : `<p class="market-warning" role="alert">⚠️ ${escapeHtml(t('marketClosedMessage'))}</p>`}
  `;

  const form = document.createElement('div');
  form.className = 'order-form';
  form.setAttribute('role', 'group');
  form.setAttribute('aria-labelledby', 'stock-title');
  form.innerHTML = `
    <div class="order-type" role="radiogroup" aria-label="${escapeHtml(t('orderKindLimit'))}">
      <label>
        <input type="radio" name="orderType" value="market" checked>
        <span>${escapeHtml(t('market'))}</span>
      </label>
      <label>
        <input type="radio" name="orderType" value="limit">
        <span>${escapeHtml(t('limit'))}</span>
      </label>
      <label>
        <input type="radio" name="orderType" value="stop-loss">
        <span>${escapeHtml(t('stopLoss'))}</span>
      </label>
    </div>
    <label for="order-quantity" class="sr-only">${escapeHtml(t('quantity'))}</label>
    <input type="number" id="order-quantity" placeholder="${escapeHtml(t('quantity'))}" min="1" max="1000000" step="1" inputmode="numeric">
    <label for="order-price" class="sr-only">${escapeHtml(t('priceForLimitOrders'))}</label>
    <input type="number" id="order-price" placeholder="${escapeHtml(t('priceForLimitOrders'))}" min="0.01" step="0.01" inputmode="decimal" hidden>
    <div class="order-submit-row">
      <button class="btn btn-buy order-submit-btn" id="order-buy">${escapeHtml(t('buy'))}</button>
      <button class="btn btn-danger order-submit-btn" id="order-sell">${escapeHtml(t('sell'))}</button>
    </div>
  `;
  left.appendChild(form);

  const right = document.createElement('div');
  right.innerHTML = `
    <div class="chart-container">
      <canvas id="price-chart" role="img" aria-label="${escapeHtml(t('currentPrice'))}"></canvas>
    </div>
    <div class="indicator-controls" role="group" aria-label="${escapeHtml(t('indicators'))}">
      <label><input type="checkbox" id="ind-candle"> ${escapeHtml(t('candlestickToggle'))}</label>
      <label><input type="checkbox" id="ind-sma20"> SMA 20</label>
      <label><input type="checkbox" id="ind-sma50"> SMA 50</label>
      <label><input type="checkbox" id="ind-rsi"> RSI</label>
      <label><input type="checkbox" id="ind-macd"> MACD</label>
    </div>
  `;

  grid.appendChild(left);
  grid.appendChild(right);
  detailsEl.appendChild(grid);

  const priceInput = document.getElementById('order-price');
  document.querySelectorAll('input[name="orderType"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const val = e.target.value;
      priceInput.hidden = val === 'market';
      priceInput.placeholder =
        val === 'stop-loss' ? t('stopPricePlaceholder') : t('priceForLimitOrders');
    });
  });

  document.getElementById('order-buy').addEventListener('click', () => submit('buy'));
  document.getElementById('order-sell').addEventListener('click', () => submit('sell'));

  const rerender = () => {
    const useCandles = document.getElementById('ind-candle').checked;
    const indicators = {
      sma20: document.getElementById('ind-sma20').checked,
      sma50: document.getElementById('ind-sma50').checked,
      rsi: document.getElementById('ind-rsi').checked,
      macd: document.getElementById('ind-macd').checked,
    };
    if (useCandles) {
      renderCandlestick('price-chart', symbol);
    } else {
      renderChart(symbol, indicators);
    }
  };
  document.getElementById('ind-candle').addEventListener('change', rerender);
  document.getElementById('ind-sma20').addEventListener('change', rerender);
  document.getElementById('ind-sma50').addEventListener('change', rerender);
  document.getElementById('ind-rsi').addEventListener('change', rerender);
  document.getElementById('ind-macd').addEventListener('change', rerender);

  renderChart(symbol);
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
