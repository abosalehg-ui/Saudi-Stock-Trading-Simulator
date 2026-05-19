/**
 * Build OHLC candles from a flat price history.
 * Buckets every `bucketSize` consecutive tick price points into one candle.
 *
 * @param {Array<{time: number, price: number}>} history
 * @param {number} bucketSize - number of price points per candle (default 5)
 * @returns {Array<{open: number, high: number, low: number, close: number, time: number}>}
 */
export function buildOHLC(history, bucketSize = 5) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const candles = [];
  for (let i = 0; i < history.length; i += bucketSize) {
    const slice = history.slice(i, i + bucketSize);
    if (slice.length === 0) continue;
    const prices = slice.map((p) => p.price);
    candles.push({
      time: slice[0].time,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
    });
  }
  return candles;
}
