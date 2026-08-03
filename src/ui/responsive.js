/**
 * Layout switching between the phone and desktop presentations.
 *
 * Two pieces of UI live in different places depending on width, and both are
 * *moved* rather than duplicated so their ids, listeners and state survive:
 *
 *  - `.action-bar` — a row above the tabs on desktop, the body of the "more"
 *    bottom sheet on phones, where five secondary buttons otherwise wrapped
 *    onto three rows.
 *  - `#stock-details` — a modal on phones, a persistent side panel on desktop.
 *    Chart-beside-list is the standard trading layout, and the desktop column
 *    was previously empty enough to render a stock name across 1360px.
 */

const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Cached rather than read back off the MediaQueryList on every call: the
 * change event carries the authoritative `matches`, and depending on the list
 * object staying live makes the module hostage to how faithfully the host
 * implements it.
 */
let desktop = false;
/** @type {(isDesktop: boolean) => void} */
let notify = () => {};

/** @returns {boolean} true when the inline (side-panel) layout is in effect */
export function isDesktopLayout() {
  return desktop;
}

function moveTo(node, host) {
  if (node && host && node.parentElement !== host) host.appendChild(node);
}

/**
 * Put both relocatable blocks where the current width wants them.
 * Safe to call repeatedly; each move is a no-op once the node is in place.
 */
export function applyLayout() {
  moveTo(
    document.getElementById('action-bar'),
    document.getElementById(desktop ? 'action-bar-slot' : 'more-sheet-body')
  );

  moveTo(
    document.getElementById('stock-details'),
    desktop
      ? document.getElementById('stock-panel-body')
      : document.querySelector('#stock-modal .modal-content')
  );
}

/**
 * @param {object} handlers
 * @param {(isDesktop: boolean) => void} [handlers.onChange] - run after each breakpoint crossing, once the nodes have moved
 */
export function initResponsiveLayout({ onChange } = {}) {
  // jsdom implements matchMedia only partially in some versions; treating a
  // missing implementation as "phone" keeps the modal path, which works
  // everywhere.
  const mql = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY) : null;
  desktop = !!mql?.matches;
  notify = typeof onChange === 'function' ? onChange : () => {};
  applyLayout();
  if (mql && typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', (event) => {
      desktop = event.matches;
      applyLayout();
      notify(desktop);
    });
  }
}

/** Show or hide the "more" bottom sheet. */
export function toggleMoreSheet(open) {
  const sheet = document.getElementById('more-sheet');
  if (!sheet) return;
  sheet.classList.toggle('open', open);
  const btn = document.getElementById('nav-more');
  if (btn) btn.setAttribute('aria-expanded', String(!!open));
}

/** @returns {boolean} */
export function isMoreSheetOpen() {
  const sheet = document.getElementById('more-sheet');
  return !!sheet && sheet.classList.contains('open');
}

/**
 * Mirror the active tab onto the bottom navigation.
 * @param {string} tab
 */
export function syncBottomNav(tab) {
  document.querySelectorAll('.bottom-nav-btn[data-tab]').forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}
