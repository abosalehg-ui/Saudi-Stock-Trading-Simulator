import {
  CHALLENGE_1_THRESHOLD,
  CHALLENGE_1_REWARD,
  CHALLENGE_2_THRESHOLD,
  CHALLENGE_2_REWARD,
} from '../config.js';
import { gameState } from '../state.js';

/**
 * Evaluate challenge completion for the current P&L and grant rewards.
 *
 * The reward is capital support, not profit: the new baseline (initialCapital)
 * absorbs each reward, otherwise the next evaluation would report the reward
 * itself as P&L and cascade into completing the next challenge for free.
 *
 * @param {{pnlPercent: number, totalValue: number}} args
 * @returns {{challenge1JustCompleted: boolean, challenge2JustCompleted: boolean}}
 */
export function evaluateChallenges({ pnlPercent, totalValue }) {
  let rewardedBaseline = totalValue;
  let challenge1JustCompleted = false;
  let challenge2JustCompleted = false;

  if (pnlPercent >= CHALLENGE_1_THRESHOLD && !gameState.challenge1Completed) {
    gameState.challenge1Completed = true;
    gameState.cash += CHALLENGE_1_REWARD;
    rewardedBaseline += CHALLENGE_1_REWARD;
    gameState.initialCapital = rewardedBaseline;
    challenge1JustCompleted = true;
  }
  if (pnlPercent >= CHALLENGE_2_THRESHOLD && !gameState.challenge2Completed) {
    gameState.challenge2Completed = true;
    gameState.cash += CHALLENGE_2_REWARD;
    rewardedBaseline += CHALLENGE_2_REWARD;
    gameState.initialCapital = rewardedBaseline;
    challenge2JustCompleted = true;
  }

  return { challenge1JustCompleted, challenge2JustCompleted };
}
