import { personalStats, gameState, saveStats } from '../state.js';

/**
 * Update best-pnl trackers after a state change.
 * @param {number} pnlPct
 * @param {number} pnlAmount
 */
export function recordPnlSnapshot(pnlPct, pnlAmount) {
  if (pnlPct > personalStats.bestPnlPct) {
    personalStats.bestPnlPct = pnlPct;
    personalStats.bestPnlAmount = pnlAmount;
    saveStats();
  }
}

/**
 * Record an executed trade and update aggregate counters.
 * @param {{symbol: string, type: 'buy'|'sell', quantity: number, price: number, commission: number, avgCostBefore?: number}} tx
 */
export function recordTrade(tx) {
  personalStats.totalTrades += 1;
  personalStats.lifetimeCommission += tx.commission || 0;

  if (tx.type === 'sell') {
    const holding = gameState.portfolio[tx.symbol];
    const avgCost = tx.avgCostBefore ?? (holding ? holding.avgCost : null);
    if (avgCost !== null && avgCost !== undefined) {
      const profit = (tx.price - avgCost) * tx.quantity;
      if (profit > personalStats.bestTradeProfit) {
        personalStats.bestTradeProfit = profit;
        personalStats.bestTradeSymbol = tx.symbol;
      }
      if (profit < personalStats.worstTradeLoss) {
        personalStats.worstTradeLoss = profit;
        personalStats.worstTradeSymbol = tx.symbol;
      }
    }
  }
  saveStats();
}

export function recordChallengeCompleted() {
  personalStats.challengesCompleted += 1;
  saveStats();
}

export function recordSessionStart() {
  personalStats.sessionsPlayed += 1;
  saveStats();
}
