import { getLang, t } from './i18n.js';

let lastFocused = null;

function trapFocus(modal) {
  const focusables = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  first.focus();
  modal.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      modal.style.display = 'none';
      restoreFocus();
      modal.removeEventListener('keydown', handler);
    } else if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
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
    okBtn.removeEventListener('click', close);
    restoreFocus();
  };
  okBtn.addEventListener('click', close);
  trapFocus(modal);
}

export function closeAlertModal() {
  document.getElementById('alert-modal').style.display = 'none';
  restoreFocus();
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
    trapFocus(modal);

    const cleanup = () => {
      modal.style.display = 'none';
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      restoreFocus();
    };
    const handleYes = () => {
      cleanup();
      resolve(true);
    };
    const handleNo = () => {
      cleanup();
      resolve(false);
    };
    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
  });
}

export function openStockModal() {
  const modal = document.getElementById('stock-modal');
  lastFocused = document.activeElement;
  modal.style.display = 'block';
  trapFocus(modal);
}

export function closeStockModal(onClose) {
  document.getElementById('stock-modal').style.display = 'none';
  if (typeof onClose === 'function') onClose();
  restoreFocus();
}

// Backwards-compat helper for any code that still cares about the lang
export function getModalLang() {
  return getLang();
}
