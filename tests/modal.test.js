import { describe, it, expect, beforeEach } from 'vitest';
import {
  openModal,
  closeModal,
  isModalOpen,
  showConfirm,
  showAlert,
  openStockModal,
  closeStockModal,
} from '../src/ui/modal.js';

beforeEach(() => {
  document.body.innerHTML = `
    <button id="opener">open</button>
    <div id="test-modal" class="modal">
      <div class="modal-content">
        <button id="first">first</button>
        <input id="middle" />
        <button id="last">last</button>
      </div>
    </div>
    <div id="alert-modal" class="modal">
      <div class="modal-content">
        <div id="alert-modal-body"></div>
        <button id="alert-modal-ok">ok</button>
      </div>
    </div>
    <div id="stock-modal" class="modal">
      <div class="modal-content">
        <button id="close-stock-modal">x</button>
        <div id="stock-details"></div>
      </div>
    </div>
    <div id="confirm-modal" class="modal">
      <div class="modal-content">
        <div id="confirm-modal-body"></div>
        <button id="confirm-modal-yes">yes</button>
        <button id="confirm-modal-no">no</button>
      </div>
    </div>
  `;
});

function press(key, opts = {}) {
  document
    .getElementById('test-modal')
    .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('openModal / closeModal', () => {
  it('shows the modal and moves focus inside it', () => {
    openModal('test-modal');
    expect(isModalOpen('test-modal')).toBe(true);
    expect(document.activeElement.id).toBe('first');
  });

  it('restores focus to whatever was focused before', () => {
    const opener = document.getElementById('opener');
    opener.focus();
    openModal('test-modal');
    closeModal('test-modal');
    expect(isModalOpen('test-modal')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('runs the onClose callback', () => {
    let called = false;
    openModal('test-modal', () => {
      called = true;
    });
    closeModal('test-modal', () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it('closes on Escape', () => {
    openModal('test-modal');
    press('Escape');
    expect(isModalOpen('test-modal')).toBe(false);
  });

  it('wraps Tab from the last focusable back to the first', () => {
    openModal('test-modal');
    document.getElementById('last').focus();
    press('Tab');
    expect(document.activeElement.id).toBe('first');
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    openModal('test-modal');
    document.getElementById('first').focus();
    press('Tab', { shiftKey: true });
    expect(document.activeElement.id).toBe('last');
  });

  it('detaches its listeners on close, so a stale trap cannot fire', () => {
    openModal('test-modal');
    closeModal('test-modal');
    document.getElementById('test-modal').style.display = 'block';
    press('Escape');
    // Still open: the released trap must not have handled the key.
    expect(isModalOpen('test-modal')).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    expect(() => openModal('does-not-exist')).not.toThrow();
    expect(() => closeModal('does-not-exist')).not.toThrow();
    expect(isModalOpen('does-not-exist')).toBe(false);
  });
});

describe('showConfirm', () => {
  it('resolves true on yes', async () => {
    const answer = showConfirm('sure?');
    document.getElementById('confirm-modal-yes').click();
    await expect(answer).resolves.toBe(true);
  });

  it('resolves false on no', async () => {
    const answer = showConfirm('sure?');
    document.getElementById('confirm-modal-no').click();
    await expect(answer).resolves.toBe(false);
  });

  it('resolves false on Escape', async () => {
    const answer = showConfirm('sure?');
    document
      .getElementById('confirm-modal')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect(answer).resolves.toBe(false);
  });
});

describe('showAlert', () => {
  it('displays the message and closes on OK, restoring focus', () => {
    const opener = document.getElementById('opener');
    opener.focus();
    showAlert('done');
    expect(isModalOpen('alert-modal')).toBe(true);
    expect(document.getElementById('alert-modal-body').textContent).toBe('done');
    document.getElementById('alert-modal-ok').click();
    expect(isModalOpen('alert-modal')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('sets the message as text, so markup is never interpreted', () => {
    showAlert('<img src=x onerror=1>');
    expect(document.querySelector('#alert-modal-body img')).toBeNull();
    document.getElementById('alert-modal-ok').click();
  });

  it('closes on Escape', () => {
    showAlert('done');
    document
      .getElementById('alert-modal')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isModalOpen('alert-modal')).toBe(false);
  });

  it('does not leak a handler when shown twice in a row', () => {
    showAlert('first');
    showAlert('second');
    expect(document.getElementById('alert-modal-body').textContent).toBe('second');
    document.getElementById('alert-modal-ok').click();
    expect(isModalOpen('alert-modal')).toBe(false);
  });
});

describe('stock modal', () => {
  it('opens, closes, and runs its onClose callback', () => {
    let closed = false;
    openStockModal();
    expect(isModalOpen('stock-modal')).toBe(true);
    closeStockModal(() => {
      closed = true;
    });
    expect(isModalOpen('stock-modal')).toBe(false);
    expect(closed).toBe(true);
  });

  it('closes on Escape', () => {
    openStockModal();
    document
      .getElementById('stock-modal')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isModalOpen('stock-modal')).toBe(false);
  });
});
