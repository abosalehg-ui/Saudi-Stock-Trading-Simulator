import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showToast, resetToast } from '../src/ui/toast.js';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  resetToast();
});

afterEach(() => {
  resetToast();
  vi.useRealTimers();
});

describe('showToast', () => {
  it('creates one polite live region and shows the message', () => {
    showToast('تم الشراء بنجاح!');
    const host = document.getElementById('toast-host');
    expect(host.textContent).toBe('تم الشراء بنجاح!');
    expect(host.classList.contains('visible')).toBe(true);
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-live')).toBe('polite');
  });

  it('reuses the same node across calls instead of stacking them', () => {
    showToast('first');
    const host = document.getElementById('toast-host');
    showToast('second');
    expect(document.querySelectorAll('.toast-host')).toHaveLength(1);
    expect(document.getElementById('toast-host')).toBe(host);
    expect(host.textContent).toBe('second');
  });

  it('hides itself after the visible window', () => {
    showToast('done');
    const host = document.getElementById('toast-host');
    vi.advanceTimersByTime(2999);
    expect(host.classList.contains('visible')).toBe(true);
    vi.advanceTimersByTime(2);
    expect(host.classList.contains('visible')).toBe(false);
  });

  it('restarts the timer on a second message rather than inheriting the first', () => {
    showToast('first');
    vi.advanceTimersByTime(2500);
    showToast('second');
    vi.advanceTimersByTime(2500); // past the first toast's deadline, not the second's
    expect(document.getElementById('toast-host').classList.contains('visible')).toBe(true);
    vi.advanceTimersByTime(600);
    expect(document.getElementById('toast-host').classList.contains('visible')).toBe(false);
  });

  it('renders the message as text, never as markup', () => {
    showToast('<img src=x onerror=alert(1)>');
    expect(document.querySelector('#toast-host img')).toBeNull();
    expect(document.getElementById('toast-host').textContent).toContain('<img');
  });
});
