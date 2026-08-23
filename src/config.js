export const INITIAL_CAPITAL = 50000;
export const COMMISSION = 0.00155;
export const SLIPPAGE = 0.002;
export const VOLUME_IMPACT_FACTOR = 0.1;
export const IMPACT_DECAY_RATE = 0.05;

export const PRICE_HISTORY_MAX_POINTS = 100;
export const PRICE_UPDATE_INTERVAL_MS = 60000;
export const NEWS_UPDATE_INTERVAL_MS = 60000;
export const NEWS_DURATION_MS = 300000;
export const NEWS_GENERATION_PROBABILITY = 0.3;

// Occasional extra jolt on top of the usual per-tick noise, so the chart shows
// the odd sharp move rather than uniformly smooth drift.
export const SHOCK_PROBABILITY = 0.015;
export const SHOCK_MAGNITUDE = 0.05;

// Each stock's `sigma` was tuned against the old uniform shock term, which
// realised only 1/sqrt(3) of the declared volatility. Switching to a true
// normal draw would otherwise have made every stock visibly calmer overnight,
// so this restores the previous felt volatility without touching 91 rows of
// data. Raise it to make the market livelier between news events.
export const TICK_VOLATILITY_SCALE = 1 / Math.sqrt(3);

export const MIN_PRICE_RATIO = 0.3;
export const MAX_PRICE_RATIO = 3;

// The transaction log is re-serialised into localStorage on every tick, so it
// cannot be allowed to grow without limit. 500 covers far more than a session's
// trading while keeping the saved payload bounded; the CSV export is the place
// to go for a full history.
export const TRANSACTIONS_MAX = 500;

export const MAX_ORDER_QUANTITY = 1_000_000;
export const MIN_ORDER_QUANTITY = 1;

export const CHALLENGE_1_THRESHOLD = 10;
export const CHALLENGE_1_REWARD = 100000;
export const CHALLENGE_2_THRESHOLD = 20;
export const CHALLENGE_2_REWARD = 300000;

export const STORAGE_KEY = 'tadawulGame';
export const PRICES_STORAGE_KEY = 'tadawulPrices';
export const LANG_STORAGE_KEY = 'tadawulLang';
export const THEME_STORAGE_KEY = 'tadawulTheme';

export const MARKET_TIMEZONE = 'Asia/Riyadh';
export const MARKET_OPEN_HOUR = 10;
export const MARKET_CLOSE_HOUR = 15;
export const MARKET_OPEN_DAYS = [0, 1, 2, 3, 4];
