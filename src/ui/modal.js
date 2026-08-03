import { t } from './i18n.js';

let lastFocused = null;

// One controller per open modal: aborting it detaches every listener the modal
// registered, so no close path (button, Escape, backdrop) can leak handlers.
// Keyed per modal element because modals can stack (e.g. an alert opens while
// the stock modal's deferred close is still pending).
const traps = new WeakMap();

function releaseTrap(modal) {
  const controller = traps.get(modal);
  if (controller) {
    controller.abort();
    traps.delete(modal);
  }
}

/**
 * Trap Tab focus inside the modal and wire Escape to `onEscape`.
 * Returns an AbortSignal; register the modal's own listeners with it so they
 * are removed together when the trap is released.
 */
function trapFocus(modal, onEscape) {
  releaseTrap(modal);
  const controller = new AbortController();
  traps.set(modal, controller);
  const { signal } = controller;

  const focusables = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (first) first.focus();

  modal.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      } else if (e.key === 'Tab' && first) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    { signal }
  );
  return signal;
}

function restoreFocus() {
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
  }
}

export function showAlert(message) {
  const modal = document.getElementById('alert-modal');
  const body = document.getElementById('alert-modal-body');
  const okBtn = document.getElementById('alert-modal-ok');
  body.textContent = message;
  okBtn.textContent = t('confirmOk');
  lastFocused = document.activeElement;
  modal.style.display = 'block';

  const close = () => {
    modal.style.display = 'none';
    releaseTrap(modal);
    restoreFocus();
  };
  const signal = trapFocus(modal, close);
  okBtn.addEventListener('click', close, { signal });
}

export function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const body = document.getElementById('confirm-modal-body');
    const yesBtn = document.getElementById('confirm-modal-yes');
    const noBtn = document.getElementById('confirm-modal-no');

    body.textContent = message;
    yesBtn.textContent = t('confirmYes');
    noBtn.textContent = t('confirmNo');
    lastFocused = document.activeElement;
    modal.style.display = 'block';

    const settle = (answer) => {
      modal.style.display = 'none';
      releaseTrap(modal);
      restoreFocus();
      resolve(answer);
    };
    const signal = trapFocus(modal, () => settle(false));
    yesBtn.addEventListener('click', () => settle(true), { signal });
    noBtn.addEventListener('click', () => settle(false), { signal });
  });
}

/**
 * Open any modal by id with the same focus handling the stock/alert modals get:
 * remember what was focused, move focus inside, trap Tab, wire Escape.
 *
 * Exists so the glossary/stats/learning/scenarios modals stop hand-rolling
 * `style.display = 'block'`, which skipped the trap entirely.
 *
 * @param {string} id
 * @param {() => void} [onClose] - run after the modal is hidden, before focus returns
 */
export function openModal(id, onClose) {
  const modal = document.getElementById(id);
  if (!modal) return;
  lastFocused = document.activeElement;
  modal.style.display = 'block';
  trapFocus(modal, () => closeModal(id, onClose));
}

/**
 * @param {string} id
 * @param {() => void} [onClose]
 */
export function closeModal(id, onClose) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'none';
  releaseTrap(modal);
  if (typeof onClose === 'function') onClose();
  restoreFocus();
}

export function isModalOpen(id) {
  const modal = document.getElementById(id);
  return !!modal && modal.style.display === 'block';
}

export function openStockModal() {
  const modal = document.getElementById('stock-modal');
  lastFocused = document.activeElement;
  modal.style.display = 'block';
  trapFocus(modal, () => closeStockModal());
}

export function closeStockModal(onClose) {
  const modal = document.getElementById('stock-modal');
  modal.style.display = 'none';
  releaseTrap(modal);
  if (typeof onClose === 'function') onClose();
  restoreFocus();
}
