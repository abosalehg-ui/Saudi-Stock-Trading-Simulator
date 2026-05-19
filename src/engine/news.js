import { NEWS_DURATION_MS, NEWS_GENERATION_PROBABILITY } from '../config.js';
import { stocks } from '../data/stocks.js';
import { newsTemplates } from '../data/news.js';
import { activeNews } from '../state.js';
import { getLang } from '../ui/i18n.js';

export function generateNews() {
  const now = Date.now();
  activeNews.items = activeNews.items.filter((news) => now - news.timestamp < NEWS_DURATION_MS);

  if (Math.random() < NEWS_GENERATION_PROBABILITY) {
    const lang = getLang();
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    const templates = newsTemplates[lang];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const stockName = lang === 'ar' ? stock.name : stock.nameEn;
    const text = template.text.replace('{stock}', stockName);
    const impact = (Math.random() * 0.03 + 0.02) * (template.type === 'positive' ? 1 : -1);
    activeNews.items.push({
      symbol: stock.symbol,
      text,
      type: template.type,
      impact,
      duration: 5,
      timestamp: now,
      appliedImpact: 0,
    });
  }
}
