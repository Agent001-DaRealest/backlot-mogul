export const DEFAULT_STOCKS = [
  { sym: 'AAPL', tier: 1, price: 276.49, iv: 22, w52h: 288.62, w52l: 169.21, lastEarn: '2026-01-29', nextEarn: '2026-04-30', qtrEnd: '2026-03-28', event: 'WWDC', eventDate: '2026-06-08' },
  { sym: 'AMZN', tier: 2, price: 229.15, iv: 38, w52h: 242.52, w52l: 161.02, lastEarn: '2026-02-06', nextEarn: '2026-04-29', qtrEnd: '2026-03-31', event: 'REINVENT', eventDate: '2026-12-01' },
  { sym: 'CMCSA', tier: 2, price: 30.88, iv: 27, w52h: 37.98, w52l: 25.75, lastEarn: '2026-01-29', nextEarn: '2026-04-23', qtrEnd: '2026-03-31', event: '', eventDate: '' },
  { sym: 'DIS', tier: 2, price: 106.30, iv: 26, w52h: 124.69, w52l: 80.10, lastEarn: '2026-02-02', nextEarn: '2026-05-13', qtrEnd: '2026-03-29', event: '', eventDate: '' },
  { sym: 'GOOGL', tier: 1, price: 333.34, iv: 26, w52h: 349.00, w52l: 140.53, lastEarn: '2026-02-04', nextEarn: '2026-04-28', qtrEnd: '2026-03-31', event: 'I/O', eventDate: '2026-05-18' },
  { sym: 'META', tier: 1, price: 668.99, iv: 30, w52h: 796.25, w52l: 479.80, lastEarn: '2026-01-28', nextEarn: '2026-04-29', qtrEnd: '2026-03-31', event: 'CONNECT', eventDate: '2026-09-17' },
  { sym: 'MSFT', tier: 1, price: 407.50, iv: 30, w52h: 555.45, w52l: 344.79, lastEarn: '2026-01-28', nextEarn: '2026-04-28', qtrEnd: '2026-03-31', event: 'BUILD', eventDate: '2026-05-18' },
  { sym: 'NFLX', tier: 2, price: 80.16, iv: 48, w52h: 134.12, w52l: 79.22, lastEarn: '2026-01-20', nextEarn: '2026-04-21', qtrEnd: '2026-03-31', event: 'WBD VOTE', eventDate: '2026-06-15' },
  { sym: 'PEGA', tier: 1, price: 38.53, iv: 70, w52h: 68.10, w52l: 29.84, lastEarn: '2025-10-22', nextEarn: '2026-02-10', qtrEnd: '2026-03-31', event: 'WORLD', eventDate: '2026-06-15' },
  { sym: 'TTWO', tier: 2, price: 203.13, iv: 33, w52h: 264.79, w52l: 181.86, lastEarn: '2026-02-03', nextEarn: '2026-05-14', qtrEnd: '2026-03-31', event: 'GTA VI', eventDate: '2026-11-19' },
];

export const WATCHLIST_SYMBOLS = DEFAULT_STOCKS.map((s) => s.sym);

export const BENCHMARK_SYMBOL = 'SPY';
