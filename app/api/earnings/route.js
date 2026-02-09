import { NextResponse } from 'next/server';
import { getCached, setCache, TTL } from '../../../lib/cache';
import { WATCHLIST_SYMBOLS } from '../../../lib/stock-defaults';

export const maxDuration = 60;

// Yahoo Finance calendar endpoint for earnings
const YAHOO_CALENDAR_BASE = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';

const FETCH_TIMEOUT = 8000;
function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function fetchEarningsData(symbol) {
  try {
    const url = `${YAHOO_CALENDAR_BASE}/${symbol}?modules=calendarEvents,earningsHistory`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      console.log(`[Earnings] ${symbol} failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];

    if (!result) {
      console.log(`[Earnings] ${symbol} no result`);
      return null;
    }

    const calendar = result.calendarEvents;
    const earningsHistory = result.earningsHistory?.history || [];

    // Get next earnings date from calendar
    let nextEarn = null;
    if (calendar?.earnings?.earningsDate) {
      const earningsDates = calendar.earnings.earningsDate;
      if (earningsDates.length > 0) {
        // Use the first date (sometimes there's a range)
        const timestamp = earningsDates[0].raw;
        if (timestamp) {
          nextEarn = new Date(timestamp * 1000).toISOString().slice(0, 10);
        }
      }
    }

    // Get last earnings date from history (most recent)
    let lastEarn = null;
    if (earningsHistory.length > 0) {
      // Sort by date descending and get most recent
      const sortedHistory = [...earningsHistory].sort((a, b) =>
        (b.quarterDate?.raw || 0) - (a.quarterDate?.raw || 0)
      );
      const mostRecent = sortedHistory[0];
      if (mostRecent?.quarterDate?.raw) {
        lastEarn = new Date(mostRecent.quarterDate.raw * 1000).toISOString().slice(0, 10);
      }
    }

    // Calculate quarter end date (approximate - end of current fiscal quarter)
    // This is a rough estimate based on typical fiscal calendars
    const now = new Date();
    const month = now.getMonth();
    let qtrEndMonth, qtrEndYear;
    if (month < 3) {
      qtrEndMonth = 2; // March
      qtrEndYear = now.getFullYear();
    } else if (month < 6) {
      qtrEndMonth = 5; // June
      qtrEndYear = now.getFullYear();
    } else if (month < 9) {
      qtrEndMonth = 8; // September
      qtrEndYear = now.getFullYear();
    } else {
      qtrEndMonth = 11; // December
      qtrEndYear = now.getFullYear();
    }
    // Last day of quarter
    const qtrEnd = new Date(qtrEndYear, qtrEndMonth + 1, 0).toISOString().slice(0, 10);

    return {
      symbol,
      nextEarn,
      lastEarn,
      qtrEnd,
    };
  } catch (err) {
    console.error(`[Earnings] ${symbol} error:`, err.message);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const forceRefresh = searchParams.get('refresh') === 'true';

  // If single symbol requested
  if (symbol) {
    const cacheKey = `earnings_${symbol}`;
    let data = forceRefresh ? null : getCached(cacheKey);

    if (!data) {
      console.log(`[Earnings API] Fetching ${symbol}...`);
      data = await fetchEarningsData(symbol);
      if (data) {
        setCache(cacheKey, data, TTL.CALENDAR);
      }
    } else {
      console.log(`[Earnings API] Using cached data for ${symbol}`);
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  // Fetch all watchlist symbols
  const cacheKey = 'earnings_all';
  let allData = forceRefresh ? null : getCached(cacheKey);

  if (!allData) {
    console.log('[Earnings API] Fetching all symbols...');
    const results = {};

    for (const sym of WATCHLIST_SYMBOLS) {
      const data = await fetchEarningsData(sym);
      if (data) {
        results[sym] = data;
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    allData = results;
    setCache(cacheKey, allData, TTL.CALENDAR);
  } else {
    console.log('[Earnings API] Using cached data');
  }

  return NextResponse.json(allData, {
    headers: {
      'X-Data-Source': 'yahoo-calendar',
    },
  });
}
