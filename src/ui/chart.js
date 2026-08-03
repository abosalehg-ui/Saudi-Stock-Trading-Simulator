// Registering only what the charts use, instead of `chart.js/auto` which pulls
// in every controller (doughnut, radar, polar area, scatter, bubble...) that
// this app never renders.
import {
  Chart,
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);
import { priceHistory, session } from '../state.js';
import { getLang } from './i18n.js';
import { formatTimeShort } from '../utils/dates.js';
import { sma, rsi, macd } from '../engine/indicators.js';

/**
 * Render a price chart for a stock with optional indicator overlays.
 *
 * @param {string} symbol
 * @param {{ sma20?: boolean, sma50?: boolean, rsi?: boolean, macd?: boolean }} indicators
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
  if (indicators.macd) {
    const { macd: macdLine, signal, histogram } = macd(prices, 12, 26, 9);
    datasets.push({
      type: 'bar',
      label: 'MACD Histogram',
      data: histogram,
      backgroundColor: histogram.map((v) => (v !== null && v >= 0 ? '#2ecc71' : '#e74c3c')),
      yAxisID: 'y3',
      order: 3,
    });
    datasets.push({
      label: 'MACD',
      data: macdLine,
      borderColor: '#3498db',
      backgroundColor: 'transparent',
      pointRadius: 0,
      borderWidth: 2,
      fill: false,
      yAxisID: 'y3',
      order: 1,
    });
    datasets.push({
      label: 'Signal',
      data: signal,
      borderColor: '#f1c40f',
      backgroundColor: 'transparent',
      pointRadius: 0,
      borderWidth: 2,
      borderDash: [4, 3],
      fill: false,
      yAxisID: 'y3',
      order: 2,
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
  if (indicators.macd) {
    // MACD/signal are unbounded (unlike RSI's fixed 0-100 range), so this gets
    // its own axis rather than sharing y2 — Chart.js offsets stacked 'right'
    // axes automatically when both are active at once.
    scales.y3 = {
      type: 'linear',
      position: 'right',
      ticks: { color: '#3498db' },
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
          display: indicators.sma20 || indicators.sma50 || indicators.rsi || indicators.macd,
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
