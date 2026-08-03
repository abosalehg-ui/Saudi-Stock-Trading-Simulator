/**
 * Remove every child of an element.
 *
 * Lives here rather than in render.js because six render functions across four
 * modules were each carrying their own copy of the same `while (firstChild)`
 * loop.
 *
 * @param {Element} el
 */
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Escape text for interpolation into an HTML string.
 *
 * Every `innerHTML` sink in the UI goes through this, even where the value is
 * currently bundled static data: the escaping is what makes those sinks safe to
 * keep once a value arrives from somewhere less trusted.
 *
 * @param {unknown} s
 * @returns {string}
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
