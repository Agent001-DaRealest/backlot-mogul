import { NextResponse } from 'next/server';
import { getCached, setCache, TTL } from '../../../lib/cache';
import { WATCHLIST_SYMBOLS, BENCHMARK_SYMBOL } from '../../../lib/stock-defaults';

const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

export const maxDuration = 60;

const FETCH_TIMEOUT = 8000;
function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function fetchHistoryForSymbol(sym) {
  const url = `${YAHOO_CHART_BASE}/${sym}?interval=1d&range=10y`;
  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  if (!res.ok) {
    console.error(`[History] ${sym} HTTP ${res.status}`);
    return null;
  }

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  // Filter out null closes (holidays/gaps)
  const filtered = { timestamps: [], closes: [] };
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null) {
      filtered.timestamps.push(timestamps[i]);
      filtered.closes.push(closes[i]);
    }
  }

  console.log(`[History] ${sym}: ${filtered.timestamps.length} trading days`);
  return filtered;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    const cacheKey = 'yahoo_history_all';
    let historyData = forceRefresh ? null : getCached(cacheKey);

    if (historyData) {
      console.log('[History API] Using cached data');
      return NextResponse.json(historyData);
    }

    console.log('[History API] Fetching 10-year history for all symbols...');
    historyData = {};

    const allSymbols = [...WATCHLIST_SYMBOLS, BENCHMARK_SYMBOL];
    for (const sym of allSymbols) {
      const data = await fetchHistoryForSymbol(sym);
      if (data) {
        historyData[sym] = data;
      }
      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setCache(cacheKey, historyData, TTL.HISTORY);

    return NextResponse.json(historyData);
  } catch (err) {
    console.error('[History API] Error:', err.message);
    return NextResponse.json({}, { status: 500 });
  }
}
