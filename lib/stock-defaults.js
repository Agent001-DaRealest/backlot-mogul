export const DEFAULT_STOCKS = [
  { sym: 'AAPL', threshold: 3, price: 274.53, iv: 22, w52h: 288.62, w52l: 169.21, lastEarn: '2026-01-29', nextEarn: '2026-04-30', qtrEnd: '2026-03-28', event: 'WWDC', eventDate: '2026-06-08' },
  { sym: 'AMZN', threshold: 5, price: 207.75, iv: 38, w52h: 258.60, w52l: 161.38, lastEarn: '2026-02-06', nextEarn: '2026-04-29', qtrEnd: '2026-03-31', event: 'REINVENT', eventDate: '2026-12-01' },
  { sym: 'CMCSA', threshold: 5, price: 32.33, iv: 27, w52h: 37.98, w52l: 24.35, lastEarn: '2026-01-29', nextEarn: '2026-04-23', qtrEnd: '2026-03-31', event: '', eventDate: '' },
  { sym: 'DIS', threshold: 3, price: 108.70, iv: 26, w52h: 124.69, w52l: 80.10, lastEarn: '2026-02-05', nextEarn: '2026-05-06', qtrEnd: '2026-03-29', event: '', eventDate: '' },
  { sym: 'GOOGL', threshold: 2, price: 320.86, iv: 26, w52h: 349.00, w52l: 140.53, lastEarn: '2026-02-04', nextEarn: '2026-04-28', qtrEnd: '2026-03-31', event: 'I/O', eventDate: '2026-05-18' },
  { sym: 'META', threshold: 2, price: 676.96, iv: 30, w52h: 796.25, w52l: 479.80, lastEarn: '2026-01-29', nextEarn: '2026-04-29', qtrEnd: '2026-03-31', event: 'CONNECT', eventDate: '2026-09-17' },
  { sym: 'MSFT', threshold: 3, price: 406.83, iv: 30, w52h: 555.45, w52l: 344.79, lastEarn: '2026-01-28', nextEarn: '2026-04-28', qtrEnd: '2026-03-31', event: 'BUILD', eventDate: '2026-05-18' },
  { sym: 'NFLX', threshold: 2, price: 82.06, iv: 48, w52h: 134.12, w52l: 79.22, lastEarn: '2026-01-21', nextEarn: '2026-04-16', qtrEnd: '2026-03-31', event: 'WBD VOTE', eventDate: '2026-06-15' },
  { sym: 'PEGA', threshold: 2, price: 43.04, iv: 70, w52h: 68.10, w52l: 29.84, lastEarn: '2026-02-10', nextEarn: '2026-05-12', qtrEnd: '2026-03-31', event: 'WORLD', eventDate: '2026-06-15' },
  { sym: 'TTWO', threshold: 2, price: 211.01, iv: 33, w52h: 264.79, w52l: 188.56, lastEarn: '2026-02-03', nextEarn: '2026-05-14', qtrEnd: '2026-03-31', event: 'GTA VI', eventDate: '2026-11-19' },
];

export const WATCHLIST_SYMBOLS = DEFAULT_STOCKS.map((s) => s.sym);

export const BENCHMARK_SYMBOL = 'SPY';
