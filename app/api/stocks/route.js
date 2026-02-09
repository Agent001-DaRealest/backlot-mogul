import { NextResponse } from 'next/server';
import { getCached, setCache, clearCache, TTL } from '../../../lib/cache';
import { fetchYahooQuotes } from '../../../lib/yahoo-finance';
import { WATCHLIST_SYMBOLS } from '../../../lib/stock-defaults';
import { mergeStockData } from '../../../lib/merge-stock-data';

export const maxDuration = 60;

export async function GET(request) {
  // Check if this is a refresh request - clear cache to force fresh data
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (forceRefresh) {
    console.log('[API] Force refresh requested - clearing cache');
    clearCache();
  }

  try {
    // Check cache first
    const cacheKey = 'yahoo_quotes';
    let yahooData = forceRefresh ? null : getCached(cacheKey);

    if (!yahooData) {
      console.log('[API] Fetching from Yahoo Finance...');
      yahooData = await fetchYahooQuotes(WATCHLIST_SYMBOLS);
      setCache(cacheKey, yahooData, TTL.QUOTE);
    } else {
      console.log('[API] Using cached Yahoo data');
    }

    const merged = mergeStockData(yahooData);

    return NextResponse.json(merged, {
      headers: {
        'X-Data-Source': 'yahoo',
        'X-AV-Status': 'ok',
        'X-AV-Limit': 'ok',
      },
    });
  } catch (err) {
    console.error('API route error:', err);
    const defaults = mergeStockData({});
    return NextResponse.json(defaults, {
      status: 200,
      headers: {
        'X-Data-Source': 'defaults',
        'X-AV-Status': 'error',
      },
    });
  }
}
