import Chart from 'chart.js/auto';
import { priceHistory, session } from '../state.js';
import { getLang } from './i18n.js';
import { formatTimeShort } from '../utils/dates.js';
import { sma, rsi } from '../engine/indicators.js';

/**
 * Render a price chart for a stock with optional indicator overlays.
 *
 * @param {string} symbol
 * @param {{ sma20?: boolean, sma50?: boolean, rsi?: boolean }} indicators
 */
export function renderChart(symbol, indicators = {}) {
  const canvas = document.getElementById('price-chart');
  if (!canvas) return;
  if (session.chart) {
    session.chart.destroy();
    session.chart = null;
  }
  const lang = getLang();
  const data = priceHistory[symbol] || [];
  const prices = data.map((d) => d.price);
  const labels = data.map((d) => formatTimeShort(d.time, lang));

  const datasets = [
    {
      label: lang === 'ar' ? 'السعر' : 'Price',
      data: prices,
      borderColor: '#16a085',
      backgroundColor: 'rgba(22, 160, 133, 0.1)',
      tension: 0.4,
      fill: true,
      yAxisID: 'y',
    },
  ];

  if (indicators.sma20) {
    datasets.push({
      label: 'SMA 20',
      data: sma(prices, 20),
      borderColor: '#f39c12',
      backgroundColor: 'transparent',
      pointRadius: 0,
      borderWidth: 2,
      fill: false,
      yAxisID: 'y',
    });
  }
  if (indicators.sma50) {
    datasets.push({
      label: 'SMA 50',
      data: sma(prices, 50),
      borderColor: '#9b59b6',
      backgroundColor: 'transparent',
      pointRadius: 0,
      borderWidth: 2,
      fill: false,
      yAxisID: 'y',
    });
  }
  if (indicators.rsi) {
    datasets.push({
      label: 'RSI 14',
      data: rsi(prices, 14),
      borderColor: '#e74c3c',
      backgroundColor: 'transparent',
      pointRadius: 0,
      borderWidth: 2,
      fill: false,
      yAxisID: 'y2',
    });
  }

  const scales = {
    y: {
      ticks: { color: '#e0e0e0' },
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      position: 'left',
    },
    x: {
      ticks: { color: '#e0e0e0', maxTicksLimit: 8 },
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
    },
  };
  if (indicators.rsi) {
    scales.y2 = {
      type: 'linear',
      position: 'right',
      min: 0,
      max: 100,
      ticks: { color: '#e74c3c' },
      grid: { drawOnChartArea: false },
    };
  }

  session.chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: indicators.sma20 || indicators.sma50 || indicators.rsi,
          labels: { color: '#e0e0e0' },
        },
      },
      scales,
    },
  });
}

export function destroyChart() {
  if (session.chart) {
    session.chart.destroy();
    session.chart = null;
  }
}
