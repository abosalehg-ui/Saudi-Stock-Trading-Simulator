/**
 * Theme: the light/dark mode preference, and the bridge between the CSS design
 * tokens and the canvas drawing code.
 *
 * Chart.js and the hand-rolled candlestick renderer both need concrete colour
 * strings, so they can't reference var(--gain) directly. Reading the tokens
 * back off :root keeps a single source of truth: change a colour in main.css
 * and the charts follow, instead of drifting into their own palette. It also
 * means the charts re-theme for free — as long as they are re-rendered when
 * the mode changes.
 */

import { THEME_STORAGE_KEY } from '../config.js';

/** @typedef {'system'|'light'|'dark'} ThemeMode */

/** The order the toggle cycles through. */
export const THEME_MODES = /** @type {ThemeMode[]} */ (['system', 'light', 'dark']);

/** @type {ThemeMode} */
let mode = 'system';

/** @returns {ThemeMode} */
export function getThemeMode() {
  return mode;
}

/**
 * The scheme actually being painted, resolving 'system' against the OS.
 * @returns {'light'|'dark'}
 */
export function getResolvedTheme() {
  if (mode !== 'system') return mode;
  const prefersLight =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

/**
 * Keep the browser UI colour in step with the page. Without this the phone's
 * address bar stays midnight blue behind a white page.
 */
function syncThemeColorMeta() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  // Read it back rather than hardcoding, so the meta can never drift from the
  // token the page is actually painted with.
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) meta.setAttribute('content', bg);
}

/**
 * Apply a mode and persist it. 'system' clears the attribute so the CSS media
 * query takes over again.
 *
 * @param {ThemeMode} next
 * @returns {ThemeMode} the mode actually applied
 */
export function setThemeMode(next) {
  mode = THEME_MODES.includes(next) ? next : 'system';
  const root = document.documentElement;
  if (mode === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', mode);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable; the preference just won't persist
  }
  syncThemeColorMeta();
  return mode;
}

/** Advance to the next mode in THEME_MODES. @returns {ThemeMode} */
export function cycleThemeMode() {
  const index = THEME_MODES.indexOf(mode);
  return setThemeMode(THEME_MODES[(index + 1) % THEME_MODES.length]);
}

/**
 * Restore the saved preference and start following the OS while in 'system'.
 *
 * @param {{onChange?: (resolved: 'light'|'dark') => void}} [handlers] - fired when the *painted* scheme changes, so canvas content can be redrawn
 * @returns {ThemeMode}
 */
export function initTheme({ onChange } = {}) {
  /** @type {ThemeMode} */
  let saved = 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') saved = stored;
  } catch {
    // localStorage unavailable; keep the default
  }
  setThemeMode(saved);

  if (typeof window.matchMedia === 'function') {
    const query = window.matchMedia('(prefers-color-scheme: light)');
    query.addEventListener?.('change', () => {
      // Only 'system' tracks the OS; an explicit choice must not be overridden.
      if (mode !== 'system') return;
      syncThemeColorMeta();
      onChange?.(getResolvedTheme());
    });
  }
  return mode;
}

/** Fallbacks mirror :root in main.css, for jsdom (no stylesheet) and SSR. */
const FALLBACKS = {
  '--text': '#e8eef7',
  '--text-2': '#a9b8cc',
  '--text-muted': '#8194ab',
  '--gain': '#3ddc91',
  '--loss': '#ff6b6b',
  '--brand': '#4c9aff',
  '--brand-strong': '#7fb5ff',
  '--warning': '#fbbf24',
  '--border': '#24344d',
  '--surface-2': '#18253c',
};

/**
 * @param {keyof typeof FALLBACKS | string} token - CSS custom property name, including the leading `--`.
 * @returns {string} A colour usable by canvas APIs.
 */
export function themeColor(token) {
  const fallback = FALLBACKS[token] ?? '#ffffff';
  if (typeof getComputedStyle !== 'function' || typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

/**
 * Same token, at partial opacity — for chart fills and grid lines.
 *
 * @param {string} token
 * @param {number} alpha - 0..1
 * @returns {string} An `rgb(... / a)` string, or the flat colour if it can't be parsed.
 */
export function themeColorAlpha(token, alpha) {
  const color = themeColor(token);
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
