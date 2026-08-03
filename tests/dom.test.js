import { describe, it, expect } from 'vitest';
import { clearChildren, escapeHtml } from '../src/ui/dom.js';

describe('clearChildren', () => {
  it('removes every child', () => {
    const el = document.createElement('div');
    el.appendChild(document.createElement('span'));
    el.appendChild(document.createTextNode('text'));
    clearChildren(el);
    expect(el.firstChild).toBeNull();
  });

  it('is a no-op on an already-empty element', () => {
    const el = document.createElement('div');
    expect(() => clearChildren(el)).not.toThrow();
    expect(el.childNodes).toHaveLength(0);
  });
});

describe('escapeHtml', () => {
  it('neutralises a script tag', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('escapes both quote styles so attribute interpolation is safe', () => {
    expect(escapeHtml('" onload="x')).toBe('&quot; onload=&quot;x');
    expect(escapeHtml("' onload='x")).toBe('&#39; onload=&#39;x');
  });

  it('escapes ampersands before anything else, so entities are not doubled oddly', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves Arabic text untouched', () => {
    expect(escapeHtml('الراجحي')).toBe('الراجحي');
  });

  it('coerces non-strings', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });
});
