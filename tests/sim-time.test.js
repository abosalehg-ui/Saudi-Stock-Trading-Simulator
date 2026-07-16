import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { simElapsedMs } from '../src/engine/sim-time.js';

describe('simElapsedMs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches real elapsed time at speed 1', () => {
    const start = Date.now();
    vi.advanceTimersByTime(10000);
    expect(simElapsedMs(start, 1)).toBe(10000);
  });

  it('scales elapsed time proportionally with speed', () => {
    const start = Date.now();
    vi.advanceTimersByTime(10000);
    expect(simElapsedMs(start, 10)).toBe(100000);
    expect(simElapsedMs(start, 5)).toBe(50000);
  });

  it('returns 0 when no real time has passed', () => {
    const start = Date.now();
    expect(simElapsedMs(start, 10)).toBe(0);
  });
});
