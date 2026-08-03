import { describe, it, expect, afterEach } from 'vitest';
import { themeColor, themeColorAlpha } from '../src/ui/theme.js';

afterEach(() => {
  document.documentElement.style.removeProperty('--gain');
  document.documentElement.style.removeProperty('--loss');
});

describe('themeColor', () => {
  it('reads the live value off :root so the charts follow the stylesheet', () => {
    document.documentElement.style.setProperty('--gain', '#123456');
    expect(themeColor('--gain')).toBe('#123456');
  });

  it('falls back to the token default when the property is unset', () => {
    // jsdom loads no stylesheet, which is also the case during SSR and before
    // the CSS lands — the charts must still draw in the right palette.
    expect(themeColor('--loss')).toBe('#ff6b6b');
  });

  it('returns an opaque colour for an unknown token rather than an empty string', () => {
    expect(themeColor('--not-a-token')).toBe('#ffffff');
  });
});

describe('themeColorAlpha', () => {
  it('converts a hex token into an rgba string', () => {
    expect(themeColorAlpha('--gain', 0.12)).toBe('rgba(61, 220, 145, 0.12)');
  });

  it('respects an overridden value', () => {
    document.documentElement.style.setProperty('--gain', '#000000');
    expect(themeColorAlpha('--gain', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('passes through a value it cannot parse instead of emitting a broken colour', () => {
    document.documentElement.style.setProperty('--gain', 'rgb(1, 2, 3)');
    expect(themeColorAlpha('--gain', 0.5)).toBe('rgb(1, 2, 3)');
  });
});
