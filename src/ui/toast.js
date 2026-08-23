/**
 * Non-blocking confirmations.
 *
 * Every successful trade used to open a modal that had to be dismissed with a
 * click. In a simulator whose whole point is repetition, that put a mandatory
 * extra interaction between the user and their next order. Failures still use
 * showAlert(): an error the user must acknowledge is exactly what a modal is
 * for, and it is worth the interruption.
 */

const VISIBLE_MS = 3000;

/** @type {number | undefined} */
let hideTimer;

function host() {
  let el = document.getElementById('toast-host');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-host';
    el.className = 'toast-host';
    // The toast is the only feedback a successful trade gives, so it has to
    // reach a screen reader too — politely, since it never needs to interrupt.
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Show a transient success message.
 *
 * @param {string} message
 */
export function showToast(message) {
  const el = host();
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove('visible'), VISIBLE_MS);
}

/** Test seam: drop the node and any pending timer. */
export function resetToast() {
  clearTimeout(hideTimer);
  document.getElementById('toast-host')?.remove();
}
