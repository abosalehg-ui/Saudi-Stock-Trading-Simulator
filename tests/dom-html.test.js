import { describe, it, expect, beforeEach } from 'vitest';
import { html, raw, setHtml, escapeHtml, clearChildren } from '../src/ui/dom.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
});

describe('html`` tagged template', () => {
  it('escapes an interpolated value by default', () => {
    const evil = '<img src=x onerror=alert(1)>';
    expect(html`<p>${evil}</p>`).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });

  it('escapes quotes so a value cannot break out of an attribute', () => {
    const evil = '" onmouseover="alert(1)';
    const markup = html`<div title="${evil}"></div>`;
    setHtml(document.getElementById('host'), markup);
    const div = document.querySelector('#host div');
    expect(div.getAttribute('onmouseover')).toBeNull();
    expect(div.getAttribute('title')).toBe(evil);
  });

  it('escapes every interpolation, not just the first', () => {
    expect(html`${'<a>'}|${'<b>'}|${'<c>'}`).toBe('&lt;a&gt;|&lt;b&gt;|&lt;c&gt;');
  });

  it('keeps the static parts of the template verbatim', () => {
    expect(html`<strong>x</strong>`).toBe('<strong>x</strong>');
  });

  it('interpolates a raw() fragment without re-escaping it', () => {
    expect(html`<div>${raw('<span>ok</span>')}</div>`).toBe('<div><span>ok</span></div>');
  });

  it('stringifies non-string values safely', () => {
    expect(html`${0}|${false}|${null}|${undefined}`).toBe('0|false|null|undefined');
  });
});

describe('setHtml', () => {
  it('replaces the host contents', () => {
    const host = document.getElementById('host');
    host.textContent = 'old';
    setHtml(host, html`<p>new</p>`);
    expect(host.textContent.trim()).toBe('new');
    expect(host.querySelectorAll('p')).toHaveLength(1);
  });

  it('does not execute a script that reaches it in raw markup', () => {
    // A <template> parses inertly: this is the belt to the html`` braces.
    window.__pwned = false;
    const scriptMarkup = ['<scr', 'ipt>window.__pwned = true;</scr', 'ipt>'].join('');
    setHtml(document.getElementById('host'), scriptMarkup);
    expect(window.__pwned).toBe(false);
    delete window.__pwned;
  });
});

describe('escapeHtml', () => {
  it('covers all five sensitive characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});

describe('clearChildren', () => {
  it('empties an element', () => {
    const host = document.getElementById('host');
    setHtml(
      host,
      html`<p>a</p>
        <p>b</p>`
    );
    clearChildren(host);
    expect(host.childNodes).toHaveLength(0);
  });
});
