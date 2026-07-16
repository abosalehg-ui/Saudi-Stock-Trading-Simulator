import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateNews, newsText } from '../src/engine/news.js';
import { activeNews } from '../src/state.js';

beforeEach(() => {
  activeNews.items = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('news', () => {
  it('stores a template reference instead of baked text', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // forces generation and picks indices
    generateNews();
    expect(activeNews.items).toHaveLength(1);
    const item = activeNews.items[0];
    expect(item.templateIndex).toBeGreaterThanOrEqual(0);
    expect(item.text).toBeUndefined();
    expect(['positive', 'negative']).toContain(item.type);
  });

  it('renders the same item in both languages at display time', () => {
    const item = { symbol: '2222', templateIndex: 0, type: 'positive' };
    expect(newsText(item, 'ar')).toContain('أرامكو');
    expect(newsText(item, 'en')).toContain('Aramco');
  });

  it('falls back to the symbol for unknown stocks and empty for bad templates', () => {
    expect(newsText({ symbol: '9999', templateIndex: 0 }, 'en')).toContain('9999');
    expect(newsText({ symbol: '2222', templateIndex: 999 }, 'en')).toBe('');
  });

  it('expires items older than the news duration', () => {
    activeNews.items.push({ symbol: '2222', templateIndex: 0, timestamp: Date.now() - 600000 });
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no new item generated
    generateNews();
    expect(activeNews.items).toHaveLength(0);
  });
});
