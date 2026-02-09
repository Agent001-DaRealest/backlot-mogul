const BASE = 'https://www.alphavantage.co/query';
const FETCH_TIMEOUT = 8000;

function apiKey() {
  return process.env.ALPHA_VANTAGE_API_KEY;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function fetchGlobalQuote(symbol) {
  const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey()}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  console.log(`[AV] Quote ${symbol}:`, JSON.stringify(data).slice(0, 200));
  const q = data['Global Quote'];
  if (!q || !q['05. price']) return null;
  return {
    price: parseFloat(q['05. price']),
  };
}

export async function fetchOverview(symbol) {
  const url = `${BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey()}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  if (!data['52WeekHigh']) return null;
  return {
    w52h: parseFloat(data['52WeekHigh']),
    w52l: parseFloat(data['52WeekLow']),
  };
}

export async function fetchEarnings(symbol) {
  const url = `${BASE}?function=EARNINGS&symbol=${symbol}&apikey=${apiKey()}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const quarterly = data.quarterlyEarnings;
  if (!quarterly || quarterly.length === 0) return null;
  const sorted = [...quarterly].sort(
    (a, b) => new Date(b.reportedDate) - new Date(a.reportedDate)
  );
  return {
    lastEarn: sorted[0].reportedDate,
  };
}

export async function fetchEarningsCalendar() {
  const url = `${BASE}?function=EARNINGS_CALENDAR&horizon=3month&apikey=${apiKey()}`;
  const res = await fetchWithTimeout(url);
  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',');
  const symbolIdx = headers.indexOf('symbol');
  const dateIdx = headers.indexOf('reportDate');
  if (symbolIdx === -1 || dateIdx === -1) return {};
  const result = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const sym = cols[symbolIdx];
    const date = cols[dateIdx];
    if (sym && date && !result[sym]) {
      result[sym] = date;
    }
  }
  return result;
}

const MAX_API_CALLS = 24;

export async function fetchAllStockData(symbols, getCached, setCache, TTL) {
  const apiData = {};
  let callsMade = 0;
  let hitLimit = false;

  function canCall() {
    return callsMade < MAX_API_CALLS && !hitLimit;
  }

  // 1. Earnings calendar — one call for all symbols
  const calendarKey = 'av_calendar';
  let calendar = getCached(calendarKey);
  if (!calendar && canCall()) {
    try {
      calendar = await fetchEarningsCalendar();
      setCache(calendarKey, calendar, TTL.CALENDAR);
      callsMade++;
      await delay(1200);
    } catch (err) {
      console.error('Earnings calendar fetch failed:', err.message);
      calendar = {};
      if (err.name === 'AbortError') hitLimit = true;
    }
  }
  if (!calendar) calendar = {};

  // 2. Per-symbol data
  for (const sym of symbols) {
    apiData[sym] = { sym };

    // Price
    const quoteKey = `av_quote_${sym}`;
    let quote = getCached(quoteKey);
    if (!quote && canCall()) {
      try {
        quote = await fetchGlobalQuote(sym);
        if (quote) {
          setCache(quoteKey, quote, TTL.QUOTE);
          callsMade++;
        }
        await delay(1200);
      } catch (err) {
        console.error(`Quote fetch failed for ${sym}:`, err.message);
        if (err.name === 'AbortError') hitLimit = true;
      }
    }
    if (quote) apiData[sym].price = quote.price;

    // 52-week range
    const overviewKey = `av_overview_${sym}`;
    let overview = getCached(overviewKey);
    if (!overview && canCall()) {
      try {
        overview = await fetchOverview(sym);
        if (overview) {
          setCache(overviewKey, overview, TTL.OVERVIEW);
          callsMade++;
        }
        await delay(1200);
      } catch (err) {
        console.error(`Overview fetch failed for ${sym}:`, err.message);
        if (err.name === 'AbortError') hitLimit = true;
      }
    }
    if (overview) {
      apiData[sym].w52h = overview.w52h;
      apiData[sym].w52l = overview.w52l;
    }

    // Last earnings
    const earningsKey = `av_earnings_${sym}`;
    let earnings = getCached(earningsKey);
    if (!earnings && canCall()) {
      try {
        earnings = await fetchEarnings(sym);
        if (earnings) {
          setCache(earningsKey, earnings, TTL.EARNINGS);
          callsMade++;
        }
        await delay(1200);
      } catch (err) {
        console.error(`Earnings fetch failed for ${sym}:`, err.message);
        if (err.name === 'AbortError') hitLimit = true;
      }
    }
    if (earnings) apiData[sym].lastEarn = earnings.lastEarn;

    // Next earnings from calendar
    if (calendar[sym]) {
      apiData[sym].nextEarn = calendar[sym];
    }
  }

  return { apiData, callsMade, hitLimit };
}
