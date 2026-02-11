import { DEFAULT_STOCKS } from './stock-defaults';

export function mergeStockData(apiData) {
  return DEFAULT_STOCKS.map((defaults) => {
    const api = apiData[defaults.sym] || {};
    return {
      sym: defaults.sym,
      threshold: defaults.threshold,
      price: api.price ?? defaults.price ?? 0,
      iv: defaults.iv,
      w52h: api.w52h ?? defaults.w52h ?? 0,
      w52l: api.w52l ?? defaults.w52l ?? 0,
      lastEarn: api.lastEarn ?? defaults.lastEarn ?? '',
      nextEarn: api.nextEarn ?? defaults.nextEarn ?? '',
      qtrEnd: defaults.qtrEnd,
      event: defaults.event,
      eventDate: defaults.eventDate,
      dividendYield: api.dividendYield ?? 0,
      priceHistory: api.priceHistory ?? [], // Last 6 trading days for drawdown detection
    };
  });
}
