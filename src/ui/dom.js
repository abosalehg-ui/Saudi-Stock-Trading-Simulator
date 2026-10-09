/**
 * Remove every child of an element.
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
 * Tagged template that escapes every interpolation by default, so forgetting
 * is the safe path and bypassing it takes an explicit raw() the reader can see.
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

/**
 * Put `nodes` into `host` in the given order, moving only the ones that are
 * out of place.
 *
 * Moving a node detaches it, and a detached node loses focus, so a node that
 * held focus (or contained the focused element) gets it back afterwards.
 * Anything already in `host` but not in `nodes` is removed.
 *
 * @param {Element} host
 * @param {Element[]} nodes
 */
export function placeChildren(host, nodes) {
  const active = document.activeElement;
  let refocus = false;
  const keep = new Set(nodes);
  Array.from(host.children).forEach((child) => {
    if (!keep.has(child)) child.remove();
  });
  nodes.forEach((node, i) => {
    const current = host.children[i];
    if (current === node) return;
    if (active && node.contains(active)) refocus = true;
    host.insertBefore(node, current ?? null);
  });
  if (refocus && active instanceof HTMLElement && document.activeElement !== active) {
    active.focus({ preventScroll: true });
  }
}

/**
 * Keep one DOM node per key across renders, so a list that refreshes every
 * price tick patches its rows instead of replacing them.
 *
 * Replacing rows on every tick took keyboard focus with them and dropped any
 * click whose press and release straddled a tick, because the button under the
 * pointer no longer existed.
 *
 * @template T
 * @param {Element} host
 * @param {Map<string, {el: Element}>} cache - owned by the caller, one per list
 * @param {T[]} items
 * @param {{
 *   key: (item: T) => string,
 *   create: (item: T) => {el: Element},
 *   update: (entry: any, item: T) => void,
 * }} hooks
 */
export function reconcileKeyed(host, cache, items, { key, create, update }) {
  const seen = new Set();
  const nodes = items.map((item) => {
    const k = key(item);
    seen.add(k);
    let entry = cache.get(k);
    if (!entry) {
      entry = create(item);
      cache.set(k, entry);
    }
    update(entry, item);
    return entry.el;
  });
  Array.from(cache.keys()).forEach((k) => {
    if (!seen.has(k)) cache.delete(k);
  });
  placeChildren(host, nodes);
}
