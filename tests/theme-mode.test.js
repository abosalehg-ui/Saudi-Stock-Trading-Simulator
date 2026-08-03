import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initTheme,
  setThemeMode,
  cycleThemeMode,
  getThemeMode,
  getResolvedTheme,
  THEME_MODES,
} from '../src/ui/theme.js';
import { THEME_STORAGE_KEY } from '../src/config.js';

const originalMatchMedia = window.matchMedia;

/**
 * @param {boolean} prefersLight - what '(prefers-color-scheme: light)' reports
 */
function stubMatchMedia(prefersLight) {
  const listeners = [];
  window.matchMedia = (query) => ({
    matches: query.includes('light') ? prefersLight : !prefersLight,
    addEventListener: (_type, fn) => listeners.push(fn),
    removeEventListener: () => {},
  });
  return { fire: () => listeners.forEach((fn) => fn({ matches: true })) };
}

beforeEach(() => {
  document.head.innerHTML = '<meta name="theme-color" content="#000000">';
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  stubMatchMedia(false);
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  document.documentElement.removeAttribute('data-theme');
});

describe('setThemeMode', () => {
  it('marks an explicit choice on the root element', () => {
    setThemeMode('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(getThemeMode()).toBe('light');
  });

  it('clears the attribute for "system" so the media query takes over again', () => {
    setThemeMode('dark');
    setThemeMode('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(getThemeMode()).toBe('system');
  });

  it('persists the choice', () => {
    setThemeMode('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('falls back to "system" for an unrecognised mode', () => {
    // @ts-expect-error deliberately invalid
    expect(setThemeMode('sepia')).toBe('system');
  });
});

describe('cycleThemeMode', () => {
  it('walks the modes in order and wraps around', () => {
    setThemeMode('system');
    const seen = THEME_MODES.map(() => cycleThemeMode());
    expect(seen).toEqual(['light', 'dark', 'system']);
  });
});

describe('getResolvedTheme', () => {
  it('reports the explicit choice regardless of the OS', () => {
    stubMatchMedia(true); // OS wants light
    setThemeMode('dark');
    expect(getResolvedTheme()).toBe('dark');
  });

  it('follows the OS while on "system"', () => {
    stubMatchMedia(true);
    setThemeMode('system');
    expect(getResolvedTheme()).toBe('light');

    stubMatchMedia(false);
    expect(getResolvedTheme()).toBe('dark');
  });

  it('defaults to dark when matchMedia is unavailable', () => {
    // @ts-expect-error deliberately removing the API to exercise the guard
    window.matchMedia = undefined;
    setThemeMode('system');
    expect(getResolvedTheme()).toBe('dark');
  });
});

describe('initTheme', () => {
  it('restores a saved preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    initTheme();
    expect(getThemeMode()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('ignores a corrupt stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    initTheme();
    expect(getThemeMode()).toBe('system');
  });

  it('notifies on an OS change while following the system', () => {
    const mq = stubMatchMedia(false);
    const seen = [];
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    initTheme({ onChange: (resolved) => seen.push(resolved) });
    mq.fire();
    expect(seen).toHaveLength(1);
  });

  it('stays silent on an OS change once the user has chosen explicitly', () => {
    const mq = stubMatchMedia(false);
    const seen = [];
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    initTheme({ onChange: (resolved) => seen.push(resolved) });
    mq.fire();
    expect(seen).toEqual([]);
  });
});
