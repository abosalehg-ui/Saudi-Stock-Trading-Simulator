import { describe, it, expect } from 'vitest';
import { decayPriceImpact } from '../src/engine/prices.js';

describe('decayPriceImpact', () => {
  it('shrinks the outstanding impact by the given rate each call', () => {
    const impact = { value: 0.1 };
    decayPriceImpact(impact, 0.05);
    expect(impact.value).toBeCloseTo(0.095);
  });

  it('returns the reversion (negative of the shrunk amount)', () => {
    const impact = { value: 0.1 };
    const delta = decayPriceImpact(impact, 0.05);
    expect(delta).toBeCloseTo(-0.005);
  });

  it('reverses direction for a negative impact too', () => {
    const impact = { value: -0.1 };
    const delta = decayPriceImpact(impact, 0.05);
    expect(delta).toBeCloseTo(0.005);
    expect(impact.value).toBeCloseTo(-0.095);
  });

  it('the cumulative drift correction telescopes back to roughly -impact_0, not a multiple of it', () => {
    const impact = { value: 0.1 };
    let totalDrift = 0;
    for (let i = 0; i < 500; i++) {
      totalDrift += decayPriceImpact(impact, 0.05);
    }
    // As impact.value decays toward 0, the sum of all reversions telescopes
    // to -(initial value). The old buggy implementation instead summed to
    // ~20x the initial impact by re-adding the full (barely-decaying) value
    // every tick instead of only the decayed fraction.
    expect(totalDrift).toBeCloseTo(-0.1, 3);
    expect(Math.abs(totalDrift)).toBeLessThan(0.1 * 2);
    expect(impact.value).toBeCloseTo(0, 5);
  });
});
