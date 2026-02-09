import { NextResponse } from 'next/server';
import { getCached, setCache, TTL } from '../../../lib/cache';
import { WATCHLIST_SYMBOLS, DEFAULT_STOCKS } from '../../../lib/stock-defaults';

export const maxDuration = 60;

// Since Yahoo Finance API is blocked from server-side requests,
// this endpoint returns default IV values from stock-defaults.
// Users can manually override IV values in the terminal config.

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const forceRefresh = searchParams.get('refresh') === 'true';

  // Build IV data from defaults
  const ivData = {};
  for (const stock of DEFAULT_STOCKS) {
    ivData[stock.sym] = {
      symbol: stock.sym,
      iv: stock.iv || null,
      source: 'defaults',
    };
  }

  // If single symbol requested
  if (symbol) {
    const data = ivData[symbol] || { symbol, iv: null, source: 'defaults' };
    return NextResponse.json(data);
  }

  // Return all symbols
  return NextResponse.json(ivData, {
    headers: {
      'X-Data-Source': 'defaults',
      'X-Note': 'Yahoo-options-API-blocked-using-defaults',
    },
  });
}
