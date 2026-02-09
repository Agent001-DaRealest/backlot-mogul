// Yahoo Finance API - free, no API key required
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const FETCH_TIMEOUT = 8000;
function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function fetchYahooQuotes(symbols) {
  const results = {};

  for (const sym of symbols) {
    try {
      // Fetch price, 52W range, and dividend events from v8 chart endpoint
      // Use 1y range with div events to calculate dividend yield
      const chartUrl = `${YAHOO_CHART_BASE}/${sym}?interval=1d&range=1y&events=div`;
      const chartRes = await fetchWithTimeout(chartUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      let price = 0, w52h = 0, w52l = 0, dividendYield = 0;
      let priceHistory = [];

      if (chartRes.ok) {
        const chartData = await chartRes.json();
        const result = chartData?.chart?.result?.[0];
        if (result) {
          const meta = result.meta;
          price = meta.regularMarketPrice || 0;
          w52h = meta.fiftyTwoWeekHigh || 0;
          w52l = meta.fiftyTwoWeekLow || 0;

          // Calculate dividend yield from dividend events
          const divEvents = result.events?.dividends || {};
          const divAmounts = Object.values(divEvents).map(d => d.amount);
          if (divAmounts.length > 0 && price > 0) {
            // Sum last 4 dividends (quarterly) for annual dividend
            const last4 = divAmounts.slice(-4);
            const annualDiv = last4.reduce((sum, amt) => sum + amt, 0);
            dividendYield = (annualDiv / price) * 100;
          }

          // Extract last 8 trading days of price history for drawdown detection (7-day lookback)
          const timestamps = result.timestamp || [];
          const closes = result.indicators?.quote?.[0]?.close || [];
          if (timestamps.length >= 8 && closes.length >= 8) {
            // Get last 8 entries (need 8 to calculate 7-day change)
            const startIdx = timestamps.length - 8;
            for (let i = startIdx; i < timestamps.length; i++) {
              const ts = timestamps[i];
              const closePrice = closes[i];
              if (ts && closePrice != null) {
                priceHistory.push({
                  date: new Date(ts * 1000).toISOString().slice(0, 10),
                  price: closePrice,
                });
              }
            }
          }
        }
      }

      results[sym] = { price, w52h, w52l, dividendYield, priceHistory };
      console.log(`[Yahoo] ${sym}: $${price?.toFixed(2)}, div: ${dividendYield.toFixed(2)}%`);
    } catch (err) {
      console.error(`[Yahoo] ${sym} error:`, err.message);
    }
  }

  return results;
}
