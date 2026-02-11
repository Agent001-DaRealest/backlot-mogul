// Signal scoring functions shared between UI (sp1000-terminal.jsx) and
// historical analysis (historical-calc.js).

// CRT palette (duplicated from terminal for standalone use)
const COLORS = {
  green: '#33ff66',
  amber: '#ffcc00',
  red: '#ff5555',
  blue: '#00aaff',
  dim: '#888888',
  dimmer: '#444444',
  unlit: '#222222',
  screen: '#080808',
};

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

export function calcPeriod(today, stock) {
  const daysSinceLast = daysBetween(stock.lastEarn, today);
  const daysToNext = daysBetween(today, stock.nextEarn);
  const daysSinceNext = -daysToNext; // positive when nextEarn is in the past
  const daysToQtr = daysBetween(today, stock.qtrEnd);

  if (stock.eventDate) {
    const daysSinceEvent = daysBetween(stock.eventDate, today);
    if (daysSinceEvent >= 0 && daysSinceEvent <= 3) {
      return { period: 'CRUSH', left: 3 - daysSinceEvent, color: '#ffaa00' };
    }
  }

  // Check crush from lastEarn
  if (daysSinceLast >= 0 && daysSinceLast <= 3) {
    return { period: 'CRUSH', left: 3 - daysSinceLast, color: '#ffaa00' };
  }

  // Also check crush from nextEarn (covers case where nextEarn just passed but lastEarn hasn't been updated)
  if (daysSinceNext >= 0 && daysSinceNext <= 3) {
    return { period: 'CRUSH', left: 3 - daysSinceNext, color: '#ffaa00' };
  }

  if (daysToQtr <= 0 && daysToNext > 0) {
    return { period: 'QUIET', left: daysToNext, color: COLORS.red };
  }

  if (daysToNext >= 0 && daysToNext <= 21) {
    return { period: 'QUIET', left: daysToNext, color: COLORS.red };
  }

  return { period: 'OPEN', left: daysToQtr, color: '#00aaff' };
}

export function detectDrawdownMode(stock) {
  const history = stock.priceHistory;
  if (!history || history.length < 2) {
    return { mode: 'NORMAL', pctChange: 0, days: 0 };
  }

  const latestPrice = history[history.length - 1]?.price;
  const oldestPrice = history[0]?.price;
  const days = history.length - 1;

  if (!latestPrice || !oldestPrice || oldestPrice === 0) {
    return { mode: 'NORMAL', pctChange: 0, days: 0 };
  }

  const pctChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;

  // CRISIS: >8% drop in ≤7 trading days (~9 calendar days)
  if (pctChange <= -8 && days <= 7) {
    return { mode: 'CRISIS', pctChange, days };
  }

  return { mode: 'NORMAL', pctChange, days };
}

// Threshold classifier labels — maps numeric threshold to display class
export function thresholdClass(threshold) {
  if (threshold === 5) return 'THRESHOLD-5';
  if (threshold === 4) return 'THRESHOLD-4';
  if (threshold === 3) return 'THRESHOLD-3';
  return 'THRESHOLD-2';
}

export function calcSignalData(price, w52h, w52l, iv, period, drawdownMode = 'NORMAL') {
  const pctAboveLow = w52l > 0 ? ((price - w52l) / w52l) * 100 : 999;
  const pctBelowHigh = w52h > 0 ? ((w52h - price) / w52h) * 100 : 999;

  let priceScore = 0;
  if (pctAboveLow <= 10) priceScore = 1;
  else if (pctAboveLow <= 20) priceScore = 2;
  else if (pctAboveLow <= 50) priceScore = 1;

  // V2: Near-high penalty is waived during CRISIS (crash prices near prior highs are a different situation)
  const nearHighPenalty = drawdownMode === 'CRISIS' ? 0 : (pctBelowHigh < 20 ? -1 : 0);
  const ivScore = 0;
  const crisisBonus = drawdownMode === 'CRISIS' ? 2 : 0;

  let periodBonus = 0;
  if (period === 'QUIET') periodBonus = 1;
  else if (period === 'OPEN') periodBonus = -1;

  const rawScore = priceScore + nearHighPenalty + crisisBonus + periodBonus;

  const isNearLow = pctAboveLow <= 10;
  const isFarFromHigh = pctBelowHigh > 65;

  const floor1 = isNearLow;
  const floor3 = drawdownMode === 'CRISIS';

  const hasFloor = floor1 || floor3;
  const score = hasFloor ? Math.max(rawScore, 2) : rawScore;

  const color = score >= 3 ? COLORS.green : score === 2 ? COLORS.amber : COLORS.red;

  return { score, rawScore, color, pctAboveLow, pctBelowHigh, priceScore, nearHighPenalty, ivScore, crisisBonus, periodBonus, isNearLow, isFarFromHigh, floor1, floor3, isCrisis: drawdownMode === 'CRISIS' };
}
