'use client';
import { useState, useEffect, useCallback } from 'react';
import Terminal from './sp1000-terminal';
import { DEFAULT_STOCKS } from '../lib/stock-defaults';
import { computeAllHistoricalData, computeBenchmarkReturn } from '../lib/historical-calc';
import { buildSignalDatesIndex } from '../lib/signal-dates-catalog';

const MANUAL_FIELDS = ['iv', 'qtrEnd', 'event', 'eventDate', 'nextEarn', 'lastEarn'];
const LS_KEY = 'sp1000-manual-overrides';
const LS_SNAPSHOT = 'sp1000-last-sync';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadOverrides() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides) {
  localStorage.setItem(LS_KEY, JSON.stringify(overrides));
}

function loadSnapshot() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(LS_SNAPSHOT));
  } catch {
    return null;
  }
}

function saveSnapshot(stocks) {
  localStorage.setItem(LS_SNAPSHOT, JSON.stringify(stocks));
}

function getInitialStocks() {
  if (typeof window === 'undefined') return DEFAULT_STOCKS;
  const snapshot = loadSnapshot();
  // Check if snapshot has all expected symbols
  const expectedSyms = DEFAULT_STOCKS.map(s => s.sym);
  if (snapshot && Array.isArray(snapshot) && snapshot.length > 0) {
    const snapshotSyms = snapshot.map(s => s.sym);
    const hasAllSymbols = expectedSyms.every(sym => snapshotSyms.includes(sym));
    if (hasAllSymbols) {
      const overrides = loadOverrides();
      // Reorder to match DEFAULT_STOCKS order, and include any new defaults
      return expectedSyms.map(sym => {
        const fromSnapshot = snapshot.find(s => s.sym === sym);
        const fromDefaults = DEFAULT_STOCKS.find(s => s.sym === sym);
        return {
          ...fromDefaults,
          ...fromSnapshot,
          ...(overrides[sym] || {}),
        };
      });
    }
  }
  // Snapshot is stale or missing symbols — use fresh defaults
  return DEFAULT_STOCKS;
}

export default function TerminalContainer({ program } = {}) {
  const [stocks, setStocks] = useState(DEFAULT_STOCKS);
  const [today, setToday] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // Time Machine state
  const [historyData, setHistoryData] = useState(null);
  const [timeMachineDate, setTimeMachineDate] = useState(null);
  const [timeMachineStocks, setTimeMachineStocks] = useState(null);
  const [timeMachineLoading, setTimeMachineLoading] = useState(false);
  const [benchmarkReturn, setBenchmarkReturn] = useState(null);
  const [signalDatesIndex, setSignalDatesIndex] = useState(null);

  // On mount, restore last synced snapshot from localStorage then fetch fresh data
  useEffect(() => {
    const restored = getInitialStocks();
    setStocks(restored);
    // Auto-fetch fresh data including live IV from options API
    fetchStocks(false);
  }, []);

  const fetchStocks = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const stockUrl = forceRefresh ? '/api/stocks?refresh=true' : '/api/stocks';
      const optionsUrl = forceRefresh ? '/api/options?refresh=true' : '/api/options';
      const earningsUrl = forceRefresh ? '/api/earnings?refresh=true' : '/api/earnings';

      // Fetch stocks, options, and earnings data in parallel with 15s safety timeout
      const raceTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout (15s)')), 15000));
      const [stockRes, optionsRes, earningsRes] = await Promise.race([
        Promise.all([
          fetch(stockUrl),
          fetch(optionsUrl).catch(() => null), // Don't fail if options API fails
          fetch(earningsUrl).catch(() => null), // Don't fail if earnings API fails
        ]),
        raceTimeout,
      ]);

      if (!stockRes.ok) throw new Error(`Stock API returned ${stockRes.status}`);
      const apiStocks = await stockRes.json();

      // Parse options data for live IV values
      let optionsData = {};
      if (optionsRes && optionsRes.ok) {
        optionsData = await optionsRes.json();
        console.log('[Container] Options data loaded:', Object.keys(optionsData).length, 'symbols');
      }

      // Parse earnings data for period dates
      let earningsData = {};
      if (earningsRes && earningsRes.ok) {
        earningsData = await earningsRes.json();
        console.log('[Container] Earnings data loaded:', Object.keys(earningsData).length, 'symbols');
      }

      // Check if API limit was reached
      setLimitReached(stockRes.headers.get('X-AV-Limit') === 'reached');
      // Save the raw API data as a snapshot for next load
      saveSnapshot(apiStocks);
      const overrides = loadOverrides();
      const merged = apiStocks.map((s) => {
        // Get live IV from options API if available
        const liveIV = optionsData[s.sym]?.iv;
        // Get earnings dates if available
        const earnings = earningsData[s.sym];
        return {
          ...s,
          // Use live IV if available, otherwise keep existing
          iv: liveIV !== null && liveIV !== undefined ? liveIV : s.iv,
          // Use live earnings dates if available
          nextEarn: earnings?.nextEarn || s.nextEarn,
          lastEarn: earnings?.lastEarn || s.lastEarn,
          qtrEnd: earnings?.qtrEnd || s.qtrEnd,
          // Apply manual overrides last (user edits take priority)
          ...(overrides[s.sym] || {}),
        };
      });
      setStocks(merged);
    } catch (err) {
      console.error('Fetch failed, using current data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStockChange = (idx, key, value) => {
    setStocks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      if (MANUAL_FIELDS.includes(key)) {
        const overrides = loadOverrides();
        const sym = next[idx].sym;
        overrides[sym] = overrides[sym] || {};
        overrides[sym][key] = value;
        saveOverrides(overrides);
      }
      return next;
    });
  };

  const handleTimeMachineActivate = useCallback(async (targetDate) => {
    setTimeMachineLoading(true);
    try {
      // Fetch history data if not already cached (or if SPY is missing from stale cache)
      let history = historyData;
      if (!history || !history['SPY']) {
        console.log('[TimeMachine] Fetching 10-year history...');
        const res = await fetch('/api/history' + (history && !history['SPY'] ? '?refresh=true' : ''));
        if (!res.ok) throw new Error(`History API returned ${res.status}`);
        history = await res.json();
        setHistoryData(history);
        console.log('[TimeMachine] History loaded:', Object.keys(history).length, 'symbols');
      }

      // Build signal dates index on first activation (cached for session)
      if (!signalDatesIndex) {
        const sigIndex = buildSignalDatesIndex(history, stocks);
        setSignalDatesIndex(sigIndex);
      }

      // Compute historical signals and benchmark return
      const historicalStocks = computeAllHistoricalData(history, targetDate, stocks);
      const spyReturn = computeBenchmarkReturn(history, targetDate);
      setTimeMachineDate(targetDate);
      setTimeMachineStocks(historicalStocks);
      setBenchmarkReturn(spyReturn);

    } catch (err) {
      console.error('[TimeMachine] Error:', err.message);
    } finally {
      setTimeMachineLoading(false);
    }
  }, [historyData, stocks, signalDatesIndex]);

  const handleReturnToPresent = useCallback(() => {
    setTimeMachineDate(null);
    setTimeMachineStocks(null);
    setBenchmarkReturn(null);
  }, []);

  const handleTimeMachineNavigate = useCallback((newDate) => {
    handleTimeMachineActivate(newDate);
  }, [handleTimeMachineActivate]);

  return (
    <Terminal
      stocks={stocks}
      today={today}
      onTodayChange={setToday}
      onStockChange={handleStockChange}
      onRefresh={() => fetchStocks(true)}
      loading={loading}
      limitReached={limitReached}
      timeMachineDate={timeMachineDate}
      timeMachineStocks={timeMachineStocks}
      timeMachineLoading={timeMachineLoading}
      onTimeMachineActivate={handleTimeMachineActivate}
      onReturnToPresent={handleReturnToPresent}
      benchmarkReturn={benchmarkReturn}
      onTimeMachineNavigate={handleTimeMachineNavigate}
      signalDatesIndex={signalDatesIndex}
      program={program}
    />
  );
}
