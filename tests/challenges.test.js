import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateChallenges } from '../src/engine/challenges.js';
import { gameState, resetGameState } from '../src/state.js';
import { CHALLENGE_1_REWARD, CHALLENGE_2_REWARD } from '../src/config.js';

beforeEach(() => {
  resetGameState();
});

describe('evaluateChallenges', () => {
  it('grants the reward and resets the P&L baseline to include it', () => {
    gameState.cash = 55000; // +10% over the 50,000 start, all in cash
    const result = evaluateChallenges({ pnlPercent: 10, totalValue: 55000 });

    expect(result.challenge1JustCompleted).toBe(true);
    expect(result.challenge2JustCompleted).toBe(false);
    expect(gameState.challenge1Completed).toBe(true);
    expect(gameState.cash).toBe(55000 + CHALLENGE_1_REWARD);
    // Baseline must absorb the reward so it is not reported as profit.
    expect(gameState.initialCapital).toBe(55000 + CHALLENGE_1_REWARD);

    // Next tick: total assets equal the new baseline → P&L is 0%,
    // so challenge 2 must NOT auto-complete off the reward.
    const totalValue = gameState.cash;
    const pnlPercent = ((totalValue - gameState.initialCapital) / gameState.initialCapital) * 100;
    expect(pnlPercent).toBe(0);
    const result2 = evaluateChallenges({ pnlPercent, totalValue });
    expect(result2.challenge2JustCompleted).toBe(false);
    expect(gameState.challenge2Completed).toBe(false);
  });

  it('accumulates both rewards in the baseline when both complete in one tick', () => {
    gameState.cash = 62500; // +25%
    const result = evaluateChallenges({ pnlPercent: 25, totalValue: 62500 });

    expect(result.challenge1JustCompleted).toBe(true);
    expect(result.challenge2JustCompleted).toBe(true);
    expect(gameState.challenge1Completed).toBe(true);
    expect(gameState.challenge2Completed).toBe(true);
    expect(gameState.cash).toBe(62500 + CHALLENGE_1_REWARD + CHALLENGE_2_REWARD);
    expect(gameState.initialCapital).toBe(62500 + CHALLENGE_1_REWARD + CHALLENGE_2_REWARD);
  });

  it('does not re-award a completed challenge', () => {
    gameState.challenge1Completed = true;
    const cashBefore = gameState.cash;
    const capitalBefore = gameState.initialCapital;
    const result = evaluateChallenges({ pnlPercent: 15, totalValue: 57500 });
    expect(result.challenge1JustCompleted).toBe(false);
    expect(gameState.cash).toBe(cashBefore);
    expect(gameState.initialCapital).toBe(capitalBefore);
  });

  it('reports no completion when P&L is below both thresholds', () => {
    const result = evaluateChallenges({ pnlPercent: 2, totalValue: 51000 });
    expect(result).toEqual({ challenge1JustCompleted: false, challenge2JustCompleted: false });
  });
});
