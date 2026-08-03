import { personalStats } from '../state.js';
import { findStock } from '../data/stocks.js';
import { getLang, t } from './i18n.js';
import { openModal, closeModal } from './modal.js';
import { clearChildren } from './dom.js';

export function openStatsModal() {
  document.getElementById('stats-title').textContent = t('statsTitle');
  renderStatsContent();
  openModal('stats-modal');
}

export function closeStatsModal() {
  closeModal('stats-modal');
}

function symbolDisplay(symbol) {
  if (!symbol) return '—';
  const stock = findStock(symbol);
  if (!stock) return symbol;
  const lang = getLang();
  return `${lang === 'ar' ? stock.name : stock.nameEn} (${symbol})`;
}

export function renderStatsContent() {
  const root = document.getElementById('stats-content');
  if (!root) return;
  const sar = t('sar');
  clearChildren(root);

  if (personalStats.totalTrades === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('statsNoData');
    root.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  const cards = [
    {
      label: t('statsBestPnl'),
      value: `${personalStats.bestPnlPct.toFixed(2)}% (${personalStats.bestPnlAmount.toFixed(0)} ${sar})`,
    },
    {
      label: t('statsBestTrade'),
      value: `${personalStats.bestTradeProfit.toFixed(2)} ${sar}\n${symbolDisplay(personalStats.bestTradeSymbol)}`,
    },
    {
      label: t('statsWorstTrade'),
      value: `${personalStats.worstTradeLoss.toFixed(2)} ${sar}\n${symbolDisplay(personalStats.worstTradeSymbol)}`,
    },
    { label: t('statsTotalTrades'), value: String(personalStats.totalTrades) },
    { label: t('statsChallengesDone'), value: String(personalStats.challengesCompleted) },
    {
      label: t('statsLifetimeCommission'),
      value: `${personalStats.lifetimeCommission.toFixed(2)} ${sar}`,
    },
    { label: t('statsSessionsPlayed'), value: String(personalStats.sessionsPlayed) },
  ];
  cards.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'stats-card';
    const label = document.createElement('div');
    label.className = 'stats-card-label';
    label.textContent = c.label;
    const value = document.createElement('div');
    value.className = 'stats-card-value';
    value.style.whiteSpace = 'pre-line';
    value.style.fontSize = '15px';
    value.textContent = c.value;
    card.appendChild(label);
    card.appendChild(value);
    grid.appendChild(card);
  });
  root.appendChild(grid);
}
