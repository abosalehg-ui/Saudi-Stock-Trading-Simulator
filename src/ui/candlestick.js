import { buildOHLC } from '../engine/ohlc.js';
import { priceHistory } from '../state.js';
import { destroyChart } from './chart.js';

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
    ctx.fillStyle = '#95a5a6';
    ctx.font = '14px sans-serif';
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

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#95a5a6';
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
    const color = isUp ? '#2ecc71' : '#e74c3c';
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
}
