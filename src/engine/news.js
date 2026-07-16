import { NEWS_DURATION_MS, NEWS_GENERATION_PROBABILITY } from '../config.js';
import { stocks, findStock } from '../data/stocks.js';
import { newsTemplates } from '../data/news.js';
import { activeNews } from '../state.js';

/**
 * Maybe generate a news item and expire old ones.
 * Items store a template reference (not baked text) so the ticker can render
 * them in whichever language is active at display time.
 */
export function generateNews() {
  const now = Date.now();
  activeNews.items = activeNews.items.filter((news) => now - news.timestamp < NEWS_DURATION_MS);

  if (Math.random() < NEWS_GENERATION_PROBABILITY) {
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    const templateIndex = Math.floor(Math.random() * newsTemplates.ar.length);
    const type = newsTemplates.ar[templateIndex].type;
    const impact = (Math.random() * 0.03 + 0.02) * (type === 'positive' ? 1 : -1);
    activeNews.items.push({
      symbol: stock.symbol,
      templateIndex,
      type,
      impact,
      duration: 5,
      timestamp: now,
      appliedImpact: 0,
    });
  }
}

/**
 * Render a news item's text in the requested language.
 * @param {{symbol: string, templateIndex: number}} news
 * @param {string} lang - 'ar' | 'en'
 * @returns {string}
 */
export function newsText(news, lang) {
  const template = newsTemplates[lang]?.[news.templateIndex];
  if (!template) return '';
  const stock = findStock(news.symbol);
  const name = stock ? (lang === 'ar' ? stock.name : stock.nameEn) : news.symbol;
  return template.text.replace('{stock}', name);
}
