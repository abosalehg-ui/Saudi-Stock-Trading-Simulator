import { describe, it, expect, vi } from 'vitest';
import { clearChildren, escapeHtml, placeChildren, reconcileKeyed } from '../src/ui/dom.js';

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
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
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

describe('placeChildren', () => {
  function makeList(ids) {
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    const nodes = ids.map((id) => {
      const b = document.createElement('button');
      b.id = id;
      host.appendChild(b);
      return b;
    });
    return { host, nodes };
  }

  it('reorders children and removes the ones not listed', () => {
    const { host, nodes } = makeList(['a', 'b', 'c']);
    placeChildren(host, [nodes[2], nodes[0]]);
    expect(Array.from(host.children).map((n) => n.id)).toEqual(['c', 'a']);
  });

  it('gives focus back to a node it had to move', () => {
    const { host, nodes } = makeList(['a', 'b', 'c']);
    nodes[2].focus();
    placeChildren(host, [nodes[2], nodes[0], nodes[1]]);
    expect(host.firstElementChild).toBe(nodes[2]);
    expect(document.activeElement).toBe(nodes[2]);
  });
});

describe('reconcileKeyed', () => {
  it('reuses the node for a key across renders and drops keys that went away', () => {
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    const cache = new Map();
    const create = vi.fn((item) => {
      const el = document.createElement('div');
      el.dataset.key = item.id;
      return { el };
    });
    const update = vi.fn((entry, item) => {
      entry.el.textContent = item.label;
    });
    const hooks = { key: (item) => item.id, create, update };

    reconcileKeyed(
      host,
      cache,
      [
        { id: 'x', label: '1' },
        { id: 'y', label: '2' },
      ],
      hooks
    );
    const x = host.firstElementChild;
    reconcileKeyed(host, cache, [{ id: 'x', label: '3' }], hooks);

    expect(create).toHaveBeenCalledTimes(2);
    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(x);
    expect(x.textContent).toBe('3');
    expect(cache.has('y')).toBe(false);
  });
});
