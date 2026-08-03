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
import { themeColor, themeColorAlpha } from './theme.js';

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
      borderColor: themeColor('--brand'),
      backgroundColor: themeColorAlpha('--brand', 0.12),
      tension: 0.4,
      fill: true,
      yAxisID: 'y',
    },
  ];

  if (indicators.sma20) {
    datasets.push({
      label: 'SMA 20',
      data: sma(prices, 20),
      borderColor: themeColor('--warning'),
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
      borderColor: themeColor('--brand-strong'),
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
      borderColor: themeColor('--loss'),
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
      backgroundColor: histogram.map((v) =>
        v !== null && v >= 0 ? themeColor('--gain') : themeColor('--loss')
      ),
      yAxisID: 'y3',
      order: 3,
    });
    datasets.push({
      label: 'MACD',
      data: macdLine,
      borderColor: themeColor('--brand'),
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
      borderColor: themeColor('--warning'),
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
      ticks: { color: themeColor('--text-2') },
      grid: { color: themeColorAlpha('--border', 0.9) },
      position: 'left',
    },
    x: {
      ticks: { color: themeColor('--text-2'), maxTicksLimit: 8 },
      grid: { color: themeColorAlpha('--border', 0.9) },
    },
  };
  if (indicators.rsi) {
    scales.y2 = {
      type: 'linear',
      position: 'right',
      min: 0,
      max: 100,
      ticks: { color: themeColor('--loss') },
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
      ticks: { color: themeColor('--brand') },
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
          labels: { color: themeColor('--text-2') },
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
