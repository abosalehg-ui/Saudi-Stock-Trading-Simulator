/**
 * Bridge between the CSS design tokens and the canvas drawing code.
 *
 * Chart.js and the hand-rolled candlestick renderer both need concrete colour
 * strings, so they can't reference var(--gain) directly. Reading the tokens
 * back off :root keeps a single source of truth: change a colour in main.css
 * and the charts follow, instead of drifting into their own palette.
 */

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
