import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateChallenges } from '../src/ui/render.js';
import { resetGameState } from '../src/state.js';
import { CHALLENGE_1_THRESHOLD, CHALLENGE_2_THRESHOLD } from '../src/config.js';

beforeEach(() => {
  resetGameState();
  document.body.innerHTML = `
    <div id="challenge1-progress"></div>
    <div id="challenge2-progress"></div>
  `;
});

describe('updateChallenges (DOM wrapper)', () => {
  it('sets progress bar widths proportional to the thresholds', () => {
    updateChallenges({ pnlPercent: CHALLENGE_1_THRESHOLD / 2, totalValue: 52500 });
    expect(document.getElementById('challenge1-progress').style.width).toBe('50%');
    expect(document.getElementById('challenge2-progress').style.width).toBe('25%');
  });

  it('clamps progress at 100% past the threshold', () => {
    updateChallenges({ pnlPercent: CHALLENGE_2_THRESHOLD * 2, totalValue: 60000 });
    expect(document.getElementById('challenge1-progress').style.width).toBe('100%');
    expect(document.getElementById('challenge2-progress').style.width).toBe('100%');
  });

  it('calls showAlertFn only for challenges that just completed, and returns the flags', () => {
    const showAlertFn = vi.fn();
    const result = updateChallenges({ pnlPercent: 10, totalValue: 55000, showAlertFn });
    expect(result.challenge1JustCompleted).toBe(true);
    expect(result.challenge2JustCompleted).toBe(false);
    expect(showAlertFn).toHaveBeenCalledTimes(1);
  });

  it('does not call showAlertFn when no challenge completes', () => {
    const showAlertFn = vi.fn();
    updateChallenges({ pnlPercent: 1, totalValue: 50500, showAlertFn });
    expect(showAlertFn).not.toHaveBeenCalled();
  });
});
