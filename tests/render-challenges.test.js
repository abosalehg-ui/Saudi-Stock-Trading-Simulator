import { describe, it, expect, beforeEach } from 'vitest';
import { updateChallenges } from '../src/ui/render.js';
import { gameState, resetGameState } from '../src/state.js';
import { CHALLENGE_1_THRESHOLD, CHALLENGE_2_THRESHOLD } from '../src/config.js';

beforeEach(() => {
  resetGameState();
  document.body.innerHTML = `
    <div role="progressbar"><div id="challenge1-progress"></div></div>
    <div role="progressbar"><div id="challenge2-progress"></div></div>
  `;
});

describe('updateChallenges (DOM wrapper)', () => {
  it('sets progress bar widths proportional to the thresholds', () => {
    updateChallenges({ pnlPercent: CHALLENGE_1_THRESHOLD / 2 });
    expect(document.getElementById('challenge1-progress').style.width).toBe('50%');
    expect(document.getElementById('challenge2-progress').style.width).toBe('25%');
  });

  it('clamps progress at 100% past the threshold', () => {
    updateChallenges({ pnlPercent: CHALLENGE_2_THRESHOLD * 2 });
    expect(document.getElementById('challenge1-progress').style.width).toBe('100%');
    expect(document.getElementById('challenge2-progress').style.width).toBe('100%');
  });

  it('clamps a negative P&L to 0% rather than a negative width', () => {
    updateChallenges({ pnlPercent: -25 });
    expect(document.getElementById('challenge1-progress').style.width).toBe('0%');
    expect(document.getElementById('challenge2-progress').style.width).toBe('0%');
  });

  it('mirrors the percentage onto the wrapping progressbar for assistive tech', () => {
    updateChallenges({ pnlPercent: CHALLENGE_1_THRESHOLD / 2 });
    const wrapper = document.getElementById('challenge1-progress').closest('[role="progressbar"]');
    expect(wrapper.getAttribute('aria-valuenow')).toBe('50');
  });

  it('grants no reward: awarding is the caller’s job, not the renderer’s', () => {
    // The renderer used to call evaluateChallenges() itself, which meant a
    // repaint could move cash and rewrite initialCapital. Painting a bar that
    // reads "complete" must leave the balance untouched.
    const cashBefore = gameState.cash;
    const capitalBefore = gameState.initialCapital;
    updateChallenges({ pnlPercent: CHALLENGE_2_THRESHOLD * 5 });
    expect(gameState.cash).toBe(cashBefore);
    expect(gameState.initialCapital).toBe(capitalBefore);
    expect(gameState.challenge1Completed).toBe(false);
    expect(gameState.challenge2Completed).toBe(false);
  });
});
