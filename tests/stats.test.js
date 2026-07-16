import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordTrade,
  recordPnlSnapshot,
  recordChallengeCompleted,
  recordSessionStart,
} from '../src/engine/stats.js';
import { personalStats, resetStats } from '../src/state.js';

beforeEach(() => {
  resetStats();
});

describe('personal stats', () => {
  it('starts at zeros', () => {
    expect(personalStats.totalTrades).toBe(0);
    expect(personalStats.bestPnlPct).toBe(0);
    expect(personalStats.bestTradeProfit).toBe(0);
  });

  it('recordTrade bumps total trades and commission', () => {
    recordTrade({ symbol: '1180', type: 'buy', quantity: 10, price: 80, commission: 12 });
    expect(personalStats.totalTrades).toBe(1);
    expect(personalStats.lifetimeCommission).toBe(12);
  });

  it('tracks best profit on sells with avgCostBefore', () => {
    recordTrade({
      symbol: '1180',
      type: 'sell',
      quantity: 10,
      price: 100,
      commission: 1,
      avgCostBefore: 80,
    });
    expect(personalStats.bestTradeProfit).toBe(200);
    expect(personalStats.bestTradeSymbol).toBe('1180');
  });

  it('tracks worst loss on losing sells', () => {
    recordTrade({
      symbol: '2222',
      type: 'sell',
      quantity: 5,
      price: 20,
      commission: 1,
      avgCostBefore: 30,
    });
    expect(personalStats.worstTradeLoss).toBe(-50);
    expect(personalStats.worstTradeSymbol).toBe('2222');
  });

  it('only updates bestPnl when improved', () => {
    recordPnlSnapshot(5, 2500);
    recordPnlSnapshot(3, 1500);
    expect(personalStats.bestPnlPct).toBe(5);
    expect(personalStats.bestPnlAmount).toBe(2500);
  });

  it('counts challenges and sessions', () => {
    recordChallengeCompleted();
    recordChallengeCompleted();
    recordSessionStart();
    expect(personalStats.challengesCompleted).toBe(2);
    expect(personalStats.sessionsPlayed).toBe(1);
  });
});
