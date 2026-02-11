import { DEFAULT_STOCKS } from './stock-defaults';

/**
 * Historical stock splits for watchlist symbols (last 10 years).
 * Each entry: { date: 'YYYY-MM-DD', ratio: N } means a N-for-1 split on that date.
 * Pre-split prices must be divided by ratio to convert to post-split equivalent.
 */
const STOCK_SPLITS = {
  CMCSA: [{ date: '2017-02-21', ratio: 2 }],
  AAPL:  [{ date: '2020-08-31', ratio: 4 }],
  AMZN:  [{ date: '2022-06-06', ratio: 20 }],
  GOOGL: [{ date: '2022-07-15', ratio: 20 }],
  PEGA:  [{ date: '2025-06-23', ratio: 2 }],
  NFLX:  [{ date: '2025-11-17', ratio: 10 }],
};

/**
 * Adjust an array of historical close prices for stock splits.
 * Divides all pre-split prices by the split ratio so they are comparable
 * to today's post-split prices.
 * @param {string} symbol - Stock ticker
 * @param {number[]} timestamps - Unix timestamps (seconds)
 * @param {number[]} closes - Raw (unadjusted) closing prices
 * @returns {number[]} Split-adjusted closing prices
 */
export function adjustForSplits(symbol, timestamps, closes) {
  const splits = STOCK_SPLITS[symbol];
  if (!splits || splits.length === 0) return closes;

  const adjusted = [...closes];
  for (const split of splits) {
    const splitTs = new Date(split.date + 'T00:00:00Z').getTime() / 1000;
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] < splitTs) {
        adjusted[i] = adjusted[i] / split.ratio;
      }
    }
  }
  return adjusted;
}

/**
 * Find the index of the closest trading day at or before the target date.
 * Uses binary search on unix timestamps.
 * @param {number[]} timestamps - Array of unix timestamps (seconds)
 * @param {string} targetDate - "YYYY-MM-DD" format
 * @returns {number} index, or -1 if target is before all data
 */
export function findClosestTradingDay(timestamps, targetDate) {
  // Convert target date to unix timestamp (end of day UTC)
  const target = new Date(targetDate + 'T23:59:59Z').getTime() / 1000;

  if (timestamps.length === 0) return -1;
  if (target < timestamps[0]) return -1;
  if (target >= timestamps[timestamps.length - 1]) return timestamps.length - 1;

  // Binary search for closest at or before target
  let lo = 0;
  let hi = timestamps.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (timestamps[mid] <= target) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * Get the closing price on a specific date.
 * @param {number[]} timestamps
 * @param {number[]} closes
 * @param {string} targetDate - "YYYY-MM-DD"
 * @returns {number|null}
 */
export function getHistoricalPrice(timestamps, closes, targetDate) {
  const idx = findClosestTradingDay(timestamps, targetDate);
  if (idx < 0) return null;
  return closes[idx];
}

/**
 * Get the rolling 52-week high and low as of a specific date.
 * Looks back 252 trading days from the target date index.
 * @param {number[]} timestamps
 * @param {number[]} closes
 * @param {string} targetDate - "YYYY-MM-DD"
 * @returns {{ w52h: number, w52l: number }|null}
 */
export function getHistorical52WeekRange(timestamps, closes, targetDate) {
  const idx = findClosestTradingDay(timestamps, targetDate);
  if (idx < 0) return null;

  // Look back 252 trading days (1 year), or as far as data allows
  const startIdx = Math.max(0, idx - 252);
  let w52h = -Infinity;
  let w52l = Infinity;

  for (let i = startIdx; i <= idx; i++) {
    if (closes[i] > w52h) w52h = closes[i];
    if (closes[i] < w52l) w52l = closes[i];
  }

  return { w52h, w52l };
}

/**
 * Get 5-day drawdown as of a specific date (for crisis detection).
 * @param {number[]} timestamps
 * @param {number[]} closes
 * @param {string} targetDate - "YYYY-MM-DD"
 * @returns {{ mode: string, pctChange: number, days: number, priceHistory: Array }}
 */
export function getHistoricalDrawdown(timestamps, closes, targetDate) {
  const idx = findClosestTradingDay(timestamps, targetDate);
  if (idx < 7) return { mode: 'NORMAL', pctChange: 0, days: 0, priceHistory: [] };

  // Extract last 8 trading days ending at target (7-day lookback)
  const priceHistory = [];
  for (let i = idx - 7; i <= idx; i++) {
    priceHistory.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      price: closes[i],
    });
  }

  const oldest = closes[idx - 7];
  const newest = closes[idx];
  const pctChange = ((newest - oldest) / oldest) * 100;
  const days = 7;

  // Same threshold as detectDrawdownMode: >=8% drop in <=7 trading days
  const mode = pctChange <= -8 && days <= 7 ? 'CRISIS' : 'NORMAL';

  return { mode, pctChange, days, priceHistory };
}

/**
 * Fiscal quarter end months for each stock.
 * Most companies follow calendar quarters (Mar, Jun, Sep, Dec).
 * AAPL and DIS have offset fiscal years (Dec, Mar, Jun, Sep).
 */
const FISCAL_QUARTERS = {
  AAPL: [12, 3, 6, 9],   // FY ends Sep; quarters: Dec, Mar, Jun, Sep
  DIS:  [12, 3, 6, 9],   // FY ends Sep; quarters: Dec, Mar, Jun, Sep
};
const DEFAULT_QUARTERS = [3, 6, 9, 12]; // Calendar quarters: Mar, Jun, Sep, Dec

/** Average days from quarter end to earnings report */
const EARNINGS_OFFSET_DAYS = 28;

/**
 * Estimate the quarterly earnings cycle dates for a given historical date.
 * Returns estimated lastEarn, nextEarn, and qtrEnd relative to the target date.
 * @param {string} symbol - Stock ticker
 * @param {string} targetDate - "YYYY-MM-DD"
 * @returns {{ lastEarn: string, nextEarn: string, qtrEnd: string }}
 */
export function estimateEarningsDates(symbol, targetDate) {
  const target = new Date(targetDate + 'T00:00:00Z');
  const qtrMonths = FISCAL_QUARTERS[symbol] || DEFAULT_QUARTERS;

  // Build a list of quarter-end dates surrounding the target date
  // Look at prior year through next year to ensure we bracket the target
  const targetYear = target.getUTCFullYear();
  const quarterEnds = [];
  for (let y = targetYear - 1; y <= targetYear + 1; y++) {
    for (const m of qtrMonths) {
      // Last day of the quarter-end month
      const lastDay = new Date(Date.UTC(y, m, 0)); // Day 0 of next month = last day of month m
      quarterEnds.push(lastDay);
    }
  }
  quarterEnds.sort((a, b) => a - b);

  // Find the most recent quarter end at or before the target date
  let prevQtrEnd = quarterEnds[0];
  let nextQtrEnd = quarterEnds[quarterEnds.length - 1];
  for (let i = 0; i < quarterEnds.length; i++) {
    if (quarterEnds[i] <= target) {
      prevQtrEnd = quarterEnds[i];
      if (i + 1 < quarterEnds.length) nextQtrEnd = quarterEnds[i + 1];
    }
  }

  // Estimated earnings dates: ~28 days after each quarter end
  const lastEarnDate = new Date(prevQtrEnd);
  lastEarnDate.setUTCDate(lastEarnDate.getUTCDate() + EARNINGS_OFFSET_DAYS);

  const nextEarnDate = new Date(nextQtrEnd);
  nextEarnDate.setUTCDate(nextEarnDate.getUTCDate() + EARNINGS_OFFSET_DAYS);

  const fmt = (d) => d.toISOString().slice(0, 10);

  return {
    lastEarn: fmt(lastEarnDate),
    nextEarn: fmt(nextEarnDate),
    qtrEnd: fmt(nextQtrEnd),
  };
}

/**
 * Extract a sampled price series from targetDate to the most recent close.
 * Returns an array of { price } objects suitable for sparkline rendering.
 * Samples down to ~40 points max for performance.
 * @param {number[]} timestamps
 * @param {number[]} closes
 * @param {string} targetDate - "YYYY-MM-DD"
 * @returns {number[]} array of sampled closing prices
 */
export function getChartData(timestamps, closes, targetDate) {
  const startIdx = findClosestTradingDay(timestamps, targetDate);
  if (startIdx < 0) return [];

  const endIdx = closes.length - 1;
  const totalPoints = endIdx - startIdx + 1;
  if (totalPoints <= 1) return [];

  const maxSamples = 40;
  const step = totalPoints <= maxSamples ? 1 : totalPoints / maxSamples;
  const sampled = [];

  for (let i = 0; i < maxSamples && Math.round(startIdx + i * step) <= endIdx; i++) {
    const idx = Math.round(startIdx + i * step);
    if (closes[idx] != null && !isNaN(closes[idx])) {
      sampled.push(closes[idx]);
    }
  }

  // Always include the final close
  const lastClose = closes[endIdx];
  if (lastClose != null && !isNaN(lastClose) && sampled.length > 0 && sampled[sampled.length - 1] !== lastClose) {
    sampled.push(lastClose);
  }

  return sampled;
}

/**
 * Compute full historical stock data for a single symbol.
 * Returns an object shaped like the stock data the terminal expects,
 * plus currentPrice and historicalReturn fields.
 */
export function computeHistoricalStockData(symbol, timestamps, closes, targetDate, currentPrice, stockDefaults) {
  const historicalPrice = getHistoricalPrice(timestamps, closes, targetDate);
  if (historicalPrice == null) return null;

  const range = getHistorical52WeekRange(timestamps, closes, targetDate);
  if (!range) return null;

  const drawdown = getHistoricalDrawdown(timestamps, closes, targetDate);
  const chartData = getChartData(timestamps, closes, targetDate);

  const historicalReturn = ((currentPrice - historicalPrice) / historicalPrice) * 100;

  // Estimate earnings dates relative to the historical date
  const estimatedDates = estimateEarningsDates(symbol, targetDate);

  return {
    sym: symbol,
    threshold: stockDefaults.threshold,
    price: historicalPrice,
    iv: stockDefaults.iv, // Cannot derive historically — use default
    w52h: range.w52h,
    w52l: range.w52l,
    lastEarn: estimatedDates.lastEarn,
    nextEarn: estimatedDates.nextEarn,
    qtrEnd: estimatedDates.qtrEnd,
    event: '', // Cannot derive historically
    eventDate: '',
    priceHistory: drawdown.priceHistory,
    chartData, // Sampled price series from target date to now
    // Time machine extras
    currentPrice,
    historicalReturn,
    drawdownMode: drawdown.mode,
    drawdownPctChange: drawdown.pctChange,
  };
}

/**
 * Compute historical data for all stocks in the watchlist.
 * @param {Object} historyData - { [symbol]: { timestamps: [...], closes: [...] } }
 * @param {string} targetDate - "YYYY-MM-DD"
 * @param {Array} currentStocks - current live stock data array (for current prices)
 * @returns {Array} enriched stock objects with historical data + returns
 */
export function computeAllHistoricalData(historyData, targetDate, currentStocks) {
  const results = [];

  for (const defaults of DEFAULT_STOCKS) {
    const sym = defaults.sym;
    const history = historyData[sym];
    if (!history || !history.timestamps || !history.closes) continue;

    // Yahoo Finance v8 chart API already returns split-adjusted close prices,
    // so no manual split adjustment is needed. The STOCK_SPLITS table and
    // adjustForSplits() are retained as reference data only.

    // Get current price from live data
    const currentStock = currentStocks.find(s => s.sym === sym);
    const currentPrice = currentStock?.price || defaults.price;

    const result = computeHistoricalStockData(
      sym,
      history.timestamps,
      history.closes,
      targetDate,
      currentPrice,
      defaults
    );

    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Compute the benchmark (SPY) return from a target date to the most recent close.
 * @param {Object} historyData - { [symbol]: { timestamps: [...], closes: [...] } }
 * @param {string} targetDate - "YYYY-MM-DD"
 * @param {string} benchmarkSymbol - ticker symbol for benchmark (default 'SPY')
 * @returns {number|null} percentage return, or null if data unavailable
 */
export function computeBenchmarkReturn(historyData, targetDate, benchmarkSymbol = 'SPY') {
  const history = historyData[benchmarkSymbol];
  if (!history?.timestamps?.length || !history?.closes?.length) return null;

  const historicalPrice = getHistoricalPrice(history.timestamps, history.closes, targetDate);
  const currentPrice = history.closes[history.closes.length - 1]; // Most recent close
  if (historicalPrice == null) return null;

  return ((currentPrice - historicalPrice) / historicalPrice) * 100;
}

/**
 * Get the valid date range for time machine queries.
 * Need at least 252 trading days of lookback for 52W range.
 * @param {Object} historyData - { [symbol]: { timestamps: [...], closes: [...] } }
 * @returns {{ earliest: string, latest: string }|null}
 */
export function getValidDateRange(historyData) {
  let earliestTs = Infinity;
  let latestTs = 0;

  for (const sym of Object.keys(historyData)) {
    const { timestamps } = historyData[sym];
    if (timestamps.length < 253) continue; // Need 252 lookback + 1

    // Earliest valid date = 253rd timestamp (need 252 days of lookback)
    const symEarliest = timestamps[252];
    const symLatest = timestamps[timestamps.length - 1];

    if (symEarliest < earliestTs) earliestTs = symEarliest;
    if (symLatest > latestTs) latestTs = symLatest;
  }

  if (earliestTs === Infinity) return null;

  return {
    earliest: new Date(earliestTs * 1000).toISOString().slice(0, 10),
    latest: new Date(latestTs * 1000).toISOString().slice(0, 10),
  };
}

