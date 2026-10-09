import { buildOHLC } from '../engine/ohlc.js';
import { priceHistory } from '../state.js';
import { destroyChart } from './chart.js';
import { themeColor, themeColorAlpha } from './theme.js';
import { getLang, t } from './i18n.js';
import { formatTimeShort } from '../utils/dates.js';

/**
 * Geometry of the last drawn frame, so the pointer handler can map an x
 * coordinate back to a candle without recomputing the layout.
 * @type {{candles: Array<object>, padding: object, candleSlot: number, cssWidth: number}|null}
 */
let lastFrame = null;

/** Remove the hover readout and its listeners, if any. */
function teardownTooltip(canvas) {
  if (canvas?._candleCleanup) {
    canvas._candleCleanup();
    delete canvas._candleCleanup;
  }
  document.getElementById('candle-tooltip')?.remove();
}

/**
 * Attach the OHLC hover readout.
 *
 * Switching from the line chart to candles used to *lose* information: Chart.js
 * gives the line a tooltip, and this hand-rolled canvas had none, so the
 * candles carried no readable numbers at all. (The candleOpen/High/Low/Close
 * translations existed the whole time, unused.)
 */
function attachTooltip(canvas) {
  // Already attached to this canvas: a price tick only redraws, so keep the
  // readout and refresh it in place instead of rebuilding it under the pointer.
  if (canvas._candleCleanup && document.getElementById('candle-tooltip')) {
    canvas._candleRefresh?.();
    return;
  }
  teardownTooltip(canvas);
  const tooltip = document.createElement('div');
  tooltip.id = 'candle-tooltip';
  tooltip.className = 'candle-tooltip';
  tooltip.hidden = true;
  canvas.parentElement?.appendChild(tooltip);

  let pointerX = null;
  const show = () => {
    if (!lastFrame || pointerX === null) return;
    const index = Math.floor((pointerX - lastFrame.padding.left) / lastFrame.candleSlot);
    const candle = lastFrame.candles[index];
    if (!candle) {
      tooltip.hidden = true;
      return;
    }
    const lang = getLang();
    tooltip.textContent = [
      formatTimeShort(candle.time, lang),
      `${t('candleOpen')}: ${candle.open.toFixed(2)}`,
      `${t('candleHigh')}: ${candle.high.toFixed(2)}`,
      `${t('candleLow')}: ${candle.low.toFixed(2)}`,
      `${t('candleClose')}: ${candle.close.toFixed(2)}`,
    ].join(' · ');
    tooltip.hidden = false;
  };
  const onMove = (event) => {
    pointerX = event.clientX - canvas.getBoundingClientRect().left;
    show();
  };
  const onLeave = () => {
    pointerX = null;
    tooltip.hidden = true;
  };

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas._candleRefresh = show;
  canvas._candleCleanup = () => {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    delete canvas._candleRefresh;
  };
}

/** The page's own font, so the axis labels match the rest of the UI. */
function canvasFont(sizePx) {
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
  return `${sizePx}px ${family}`;
}

/**
 * Render a candlestick chart onto a canvas.
 * @param {string} canvasId
 * @param {string} symbol
 */
export function renderCandlestick(canvasId, symbol) {
  destroyChart();
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const history = priceHistory[symbol] || [];
  const candles = buildOHLC(history, 5);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = canvas.clientHeight || 300;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (candles.length === 0) {
    teardownTooltip(canvas);
    lastFrame = null;
    ctx.fillStyle = themeColor('--text-muted');
    ctx.font = canvasFont(14);
    ctx.textAlign = 'center';
    ctx.fillText('—', cssWidth / 2, cssHeight / 2);
    return;
  }

  const padding = { top: 20, right: 30, bottom: 30, left: 50 };
  const innerW = cssWidth - padding.left - padding.right;
  const innerH = cssHeight - padding.top - padding.bottom;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;

  const yScale = (price) => padding.top + ((max - price) / range) * innerH;
  const candleSlot = innerW / candles.length;
  const candleWidth = Math.max(2, Math.min(14, candleSlot * 0.6));

  ctx.strokeStyle = themeColorAlpha('--border', 0.9);
  ctx.lineWidth = 1;
  ctx.font = canvasFont(11);
  ctx.fillStyle = themeColor('--text-muted');
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const price = min + (range * i) / 4;
    const y = yScale(price);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(cssWidth - padding.right, y);
    ctx.stroke();
    ctx.fillText(price.toFixed(2), padding.left - 6, y + 4);
  }

  candles.forEach((c, i) => {
    const xCenter = padding.left + candleSlot * (i + 0.5);
    const isUp = c.close >= c.open;
    const color = isUp ? themeColor('--gain') : themeColor('--loss');
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(xCenter, yScale(c.high));
    ctx.lineTo(xCenter, yScale(c.low));
    ctx.stroke();

    const bodyTop = yScale(Math.max(c.open, c.close));
    const bodyBottom = yScale(Math.min(c.open, c.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);
    ctx.fillRect(xCenter - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  });

  // Time axis. The chart had no x labels at all, so a candle's position
  // carried no meaning beyond "further right is later".
  const lang = getLang();
  const labelEvery = Math.max(1, Math.ceil(candles.length / 6));
  ctx.fillStyle = themeColor('--text-muted');
  ctx.textAlign = 'center';
  ctx.font = canvasFont(11);
  candles.forEach((c, i) => {
    if (i % labelEvery !== 0) return;
    const xCenter = padding.left + candleSlot * (i + 0.5);
    ctx.fillText(formatTimeShort(c.time, lang), xCenter, cssHeight - padding.bottom + 16);
  });

  lastFrame = { candles, padding, candleSlot, cssWidth };
  attachTooltip(canvas);
}
