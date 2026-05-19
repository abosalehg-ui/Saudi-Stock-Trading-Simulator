/**
 * Simple Moving Average. Returns an array same length as prices, padded with null at the start.
 * @param {number[]} prices
 * @param {number} period
 * @returns {(number|null)[]}
 */
export function sma(prices, period) {
  if (period <= 0) throw new Error('period must be positive');
  const out = new Array(prices.length).fill(null);
  if (prices.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  out[period - 1] = sum / period;
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential Moving Average. Seeded with the SMA of the first `period` values.
 * @param {number[]} prices
 * @param {number} period
 * @returns {(number|null)[]}
 */
export function ema(prices, period) {
  if (period <= 0) throw new Error('period must be positive');
  const out = new Array(prices.length).fill(null);
  if (prices.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += prices[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < prices.length; i++) {
    prev = prices[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/**
 * Relative Strength Index using Wilder's smoothing.
 * @param {number[]} prices
 * @param {number} period
 * @returns {(number|null)[]}
 */
export function rsi(prices, period = 14) {
  const out = new Array(prices.length).fill(null);
  if (prices.length <= period) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * MACD: returns three arrays — macd line, signal line, histogram.
 * @param {number[]} prices
 * @param {number} fast
 * @param {number} slow
 * @param {number} signal
 * @returns {{ macd: (number|null)[], signal: (number|null)[], histogram: (number|null)[] }}
 */
export function macd(prices, fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(prices, fast);
  const slowEma = ema(prices, slow);
  const macdLine = prices.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? fastEma[i] - slowEma[i] : null
  );
  const macdValues = macdLine.filter((v) => v !== null);
  const signalRaw = ema(macdValues, signal);
  const offset = macdLine.length - macdValues.length;
  const signalLine = macdLine.map((_, i) =>
    i >= offset ? signalRaw[i - offset] ?? null : null
  );
  const histogram = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i] : null
  );
  return { macd: macdLine, signal: signalLine, histogram };
}
