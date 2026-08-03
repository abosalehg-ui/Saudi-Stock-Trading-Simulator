import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildTransactionsCsv, downloadTransactionsCsv } from '../src/ui/csv-export.js';
import { gameState, resetGameState, initPriceState } from '../src/state.js';
import { setLang } from '../src/ui/i18n.js';

beforeEach(() => {
  resetGameState();
  initPriceState();
  setLang('en');
});

describe('buildTransactionsCsv', () => {
  it('emits a header row even with no transactions', () => {
    const rows = buildTransactionsCsv().split('\n');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBe('Date,Type,Stock,Symbol,Quantity,Price,Commission,Total');
  });

  it('writes one row per transaction with computed totals', () => {
    gameState.transactions.push({
      symbol: '1180',
      type: 'buy',
      kind: 'market',
      quantity: 10,
      price: 30,
      commission: 0.465,
      time: Date.UTC(2026, 0, 15, 12, 0, 0),
    });
    const rows = buildTransactionsCsv().split('\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('2026-01-15T12:00:00.000Z');
    expect(rows[1]).toContain('buy');
    expect(rows[1]).toContain('1180');
    expect(rows[1].endsWith('300.00')).toBe(true);
  });

  it('prefixes formula-leading values so a spreadsheet treats them as text', () => {
    gameState.transactions.push({
      symbol: '=cmd|calc',
      type: 'buy',
      kind: 'market',
      quantity: 1,
      price: 1,
      commission: 0,
      time: Date.UTC(2026, 0, 15),
    });
    const csv = buildTransactionsCsv();
    // Unknown symbol falls back to the raw value in both the name and symbol
    // columns; neither may reach the cell starting with '='.
    expect(csv).toContain("'=cmd|calc");
    expect(csv).not.toMatch(/(^|,)=cmd/m);
  });

  it('still quotes fields containing commas or quotes', () => {
    gameState.transactions.push({
      symbol: 'a,b"c',
      type: 'sell',
      kind: 'market',
      quantity: 1,
      price: 1,
      commission: 0,
      time: Date.UTC(2026, 0, 15),
    });
    expect(buildTransactionsCsv()).toContain('"a,b""c"');
  });
});

describe('downloadTransactionsCsv', () => {
  it('triggers a dated .csv download and revokes the object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    // jsdom implements neither; assigning is the only way to observe the calls.
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    let anchor = null;
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = realCreate(tag);
      if (tag === 'a') {
        anchor = el;
        el.click = vi.fn();
      }
      return el;
    });

    downloadTransactionsCsv();

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toMatch(/^tadawul-transactions-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(anchor.click).toHaveBeenCalled();
    // Detached again, so repeated exports don't pile up nodes in the body.
    expect(document.body.contains(anchor)).toBe(false);

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');

    vi.restoreAllMocks();
    vi.useRealTimers();
  });
});
