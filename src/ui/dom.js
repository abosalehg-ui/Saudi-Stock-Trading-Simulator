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
 * Prefer the `html` tagged template below, which applies this automatically.
 * This stays exported for the cases that build a string by hand.
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

/** Marks a string as already-safe markup, so `html` won't escape it again. */
const RAW = Symbol('raw-markup');

/**
 * Mark a fragment of markup as trusted, so `html` interpolates it verbatim.
 *
 * Only for markup this codebase built itself (a branch that emits `<p>...</p>`
 * or ''). Never call it on a value that could carry user or stored input —
 * that is exactly the escaping this module exists to enforce.
 *
 * @param {string} markup
 * @returns {{[RAW]: string}}
 */
export function raw(markup) {
  return { [RAW]: String(markup) };
}

/**
 * Tagged template that escapes every interpolation by default.
 *
 * The previous convention was to call escapeHtml() by hand at each `${}`, with
 * an ESLint rule meant to catch a forgotten one. That rule matched only a
 * variable literally named `element`, so it flagged none of the real sinks and
 * a raw `div.innerHTML = ` + '`<b>${input}</b>`' + ` passed lint clean — the guard
 * looked present and enforced nothing.
 *
 * Escaping by default inverts that: forgetting is now the safe path, and
 * bypassing it takes an explicit raw() the reader can see.
 *
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {string}
 */
export function html(strings, ...values) {
  return strings.reduce((out, chunk, i) => {
    if (i === 0) return chunk;
    const value = values[i - 1];
    const safe =
      value && typeof value === 'object' && RAW in value ? value[RAW] : escapeHtml(value);
    return out + safe + chunk;
  }, '');
}

/**
 * The single audited `innerHTML` sink in the app.
 *
 * Everything that needs to turn markup into nodes goes through here, so there
 * is exactly one place to review rather than six scattered assignments. A
 * `<template>` is inert while it parses: no script runs and no resource loads,
 * even if a string somehow arrived unescaped.
 *
 * @param {Element} host - emptied before the markup is inserted
 * @param {string} markup - build it with the `html` tag above
 */
export function setHtml(host, markup) {
  const template = document.createElement('template');
  // eslint-disable-next-line no-restricted-properties -- the one audited sink; see above.
  template.innerHTML = markup;
  clearChildren(host);
  host.appendChild(template.content);
}
