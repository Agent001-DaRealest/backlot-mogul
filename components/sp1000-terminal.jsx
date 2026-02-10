'use client';
import React, { useState, useEffect } from 'react';
import { daysBetween, calcPeriod, detectDrawdownMode, calcSignalData } from '../lib/signal-scoring';
import { findPrevSignalDate, findNextSignalDate } from '../lib/signal-dates-catalog';

// CRT palette: only green, amber, red + white
const COLORS = {
  green: '#33ff66',
  amber: '#ffcc00',
  red: '#ff5555',
  blue: '#00aaff',
  dim: '#aaaaaa',
  dimmer: '#555555',
  unlit: '#222222',
  screen: '#080808',
};

const MONO = "'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace";

// Module-level box-drawing constants (used by TimeMachineBlueprintOverlay)
const BLOCK = '\u2588';
const HALF = '\u2593';
const LIGHT = '\u2591';
const DOT_CHAR = '\u00B7';
const M_BOX_H = '\u2550';
const M_BOX_TL = '\u2554';
const M_BOX_TR = '\u2557';
const M_BOX_BL = '\u255A';
const M_BOX_BR = '\u255D';
const M_ARROW_R = '\u25BA';

function calcGauge(price, w52h, w52l) {
  const range = w52h - w52l;
  if (range <= 0) return { filled: 0, color: '#22aa44', pct: 0.5, isExpensive: false };
  const pct = Math.max(0, Math.min(1, (price - w52l) / range));
  // Bi-directional: bars emanate equally from center
  // Color: green if closer to 52W high, red if closer to 52W low
  const distFromCenter = Math.abs(pct - 0.5); // 0 at center, 0.5 at extremes
  const filled = Math.round(distFromCenter / 0.5 * 5); // 0-5 bars
  const isExpensive = pct >= 0.5;
  const color = isExpensive ? '#22aa44' : COLORS.red; // green = near high, red = near low
  return { filled, color, pct, isExpensive };
}

function ivColor(iv) {
  if (iv <= 40) return COLORS.amber;
  return COLORS.red;
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const date = new Date(dateStr + 'T00:00:00');
  return months[date.getMonth()];
}

function SymbolDisplay({ sym }) {
  return (
    <div style={{ width: 70, flexShrink: 0, color: '#fff', textShadow: '0 0 2px rgba(255,255,255,0.6)' }}>
      <span>{sym}</span>
    </div>
  );
}

function PriceGaugeCell({ price, w52h, w52l, gaugeInfo, dividendYield }) {
  const [showUnderlay, setShowUnderlay] = useState(false);

  // Percentage above 52W low
  const pctAboveLow = w52l > 0 ? ((price - w52l) / w52l) * 100 : 0;

  // Green only if percentage is over 50%, otherwise red
  const isHighAboveLow = pctAboveLow > 50;
  const textColor = isHighAboveLow ? '#22aa44' : '#ff6666';
  const glowColor = isHighAboveLow ? 'rgba(34,170,68,0.6)' : 'rgba(255,68,68,0.6)';

  return (
    <div
      onClick={() => setShowUnderlay(!showUnderlay)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
      }}
    >
      {!showUnderlay ? (
        <>
          <div style={{ color: '#fff', textAlign: 'right', minWidth: 50, textShadow: '0 0 2px rgba(255,255,255,0.6)' }}>
            <span>${Math.round(price)}</span>
          </div>
          <GaugeVertical
            filled={gaugeInfo.filled}
            color={gaugeInfo.color}
            rangePct={gaugeInfo.pct}
            isExpensive={gaugeInfo.isExpensive}
            price={price}
            w52l={w52l}
          />
        </>
      ) : (
        <div style={{ color: '#fff', textAlign: 'center', minWidth: 80 }}>
          <span style={{
            fontSize: 16,
            fontWeight: 600,
            color: textColor,
            textShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
            animation: 'sp1000backlightOn 0.15s ease-out',
          }}>
            L:{Math.round(w52l)} +{Math.round(pctAboveLow)}%
          </span>
        </div>
      )}
    </div>
  );
}

function GaugeVertical({ filled, color, rangePct, isExpensive, price, w52l }) {
  const [clicked, setClicked] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  // 5 bars vertical
  // Below 50%: GREEN, fills from TOP to bottom (cheap = good)
  // Above 50%: RED, fills from BOTTOM to top (expensive = warning)

  // Percentage above 52W low - used for throbbing and click display
  const pctAboveLow = w52l > 0 ? ((price - w52l) / w52l) * 100 : 999;
  // Only pulse if within 30% above the 52W low (undervalued)
  const shouldPulse = pctAboveLow <= 30;

  // Brightness increases closer to extremes
  const distFromCenter = Math.abs((rangePct ?? 0.5) - 0.5);
  const brightness = 0.5 + (distFromCenter * 1.0); // 0.5 at center, 1.0 at extremes

  // Green if below midpoint (cheap), red if above midpoint (expensive)
  const baseRed = { r: 255, g: 85, b: 85 }; // #ff5555
  const baseGreen = { r: 51, g: 204, b: 85 }; // #33cc55
  const base = isExpensive ? baseGreen : baseRed;
  const barColor = `rgb(${Math.round(base.r * brightness)}, ${Math.round(base.g * brightness)}, ${Math.round(base.b * brightness)})`;

  // Calculate how many bars to fill based on distance from center
  // At 50%: 0 bars, at extremes (0% or 100%): 5 bars
  const filledBars = Math.round(distFromCenter / 0.5 * 5);

  const pctAboveLowDisplay = Math.round(pctAboveLow);
  const glowColor = isExpensive ? 'rgba(34,170,68,0.6)' : 'rgba(255,68,68,0.6)';

  return (
    <div
      onClick={() => setClicked(!clicked)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 28,
        width: clicked ? 'auto' : 8,
        minWidth: 8,
        gap: 3,
        cursor: 'pointer',
        position: 'relative',
        padding: '8px 6px',
        margin: '-8px -6px',
      }}
    >
      {clicked ? (
        <div style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 600,
          color: isExpensive ? '#22aa44' : '#ff6666',
          textShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
          letterSpacing: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '0 2px',
          animation: 'sp1000backlightOn 0.15s ease-out',
        }}>
          {pctAboveLowDisplay}%
        </div>
      ) : (
        Array.from({ length: 5 }, (_, i) => {
          // Both colors fill from bottom (index 4) to top
          const active = mounted && (5 - i) <= filledBars;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                width: 8,
                backgroundColor: active ? barColor : COLORS.unlit,
                borderRadius: 1,
                transition: `background-color 0.5s ease-out ${(4 - i) * 0.08}s`,
                animation: shouldPulse && active ? 'sp1000throb 2s ease-in-out infinite' : 'none',
              }}
            />
          );
        })
      )}
    </div>
  );
}

function IVBar({ iv, editMode, onIVChange, stockIdx }) {
  const [clicked, setClicked] = useState(false);
  const [inputValue, setInputValue] = useState(iv?.toString() || '');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Update input when iv prop changes
  useEffect(() => {
    setInputValue(iv?.toString() || '');
  }, [iv]);

  // Scale: 0-50%, each segment = 5% IV (10 segments total)
  const filled = Math.round(Math.min(iv || 0, 50) / 5);
  const isOverLimit = iv > 50;
  const isAmberIV = iv <= 40; // Amber range (≤40%)
  const c = ivColor(iv);
  // Amber ≤40%, red >40%
  const segmentColor = isOverLimit ? '#cc4444' : isAmberIV ? '#cc7700' : '#cc4444';

  // Glow color based on IV level
  const glowColor = isOverLimit ? 'rgba(204,68,68,0.7)' : isAmberIV ? 'rgba(204,119,0,0.7)' : 'rgba(204,68,68,0.7)';
  const textColor = isOverLimit ? '#ff7777' : isAmberIV ? '#ffbb44' : '#ff7777';

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 999 && onIVChange) {
      onIVChange(stockIdx, 'iv', num);
    }
  };

  // In edit mode, show input field
  if (editMode) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 67 }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          style={{
            width: 40,
            height: 22,
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 600,
            color: textColor,
            backgroundColor: '#1a1a1a',
            border: `1px solid ${COLORS.dimmer}`,
            borderRadius: 3,
            textAlign: 'center',
            outline: 'none',
            textShadow: `0 0 6px ${glowColor}`,
          }}
          onFocus={(e) => e.target.select()}
        />
        <span style={{ color: COLORS.dim, fontSize: 11, marginLeft: 2 }}>%</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => setClicked(!clicked)}
      style={{ display: 'flex', gap: 3, alignItems: 'center', cursor: 'pointer', minWidth: clicked ? 'auto' : 67, padding: '10px 0', margin: '-10px 0' }}
    >
      {clicked ? (
        <div style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 600,
          color: textColor,
          textShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
          letterSpacing: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 12,
          animation: 'sp1000backlightOn 0.15s ease-out',
        }}>
          {iv}%
        </div>
      ) : (
        Array.from({ length: 10 }, (_, i) => {
          const active = mounted && (i < filled || isOverLimit);
          return (
            <div
              key={i}
              style={{
                width: 4,
                height: 12,
                backgroundColor: active ? segmentColor : COLORS.unlit,
                borderRadius: 1,
                transition: `background-color 0.5s ease-out ${i * 0.06}s`,
              }}
            />
          );
        })
      )}
    </div>
  );
}

function PeriodDot({ color }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        marginRight: 8,
        verticalAlign: 'middle',
        opacity: 0.9,
      }}
    />
  );
}

function PeriodWithClick({ periodInfo, stock, today }) {
  const [clickState, setClickState] = useState(0); // 0=period name, 1=period details, 2=next event

  const handleClick = () => {
    setClickState((prev) => (prev + 1) % 3);
  };

  // Calculate various date info
  const daysToQtr = daysBetween(today, stock.qtrEnd);
  const daysToEarn = daysBetween(today, stock.nextEarn);
  const daysSinceLastEarn = daysBetween(stock.lastEarn, today);
  const hasEvent = stock.event && stock.eventDate;
  const daysToEvent = hasEvent ? daysBetween(today, stock.eventDate) : null;

  // Format earnings date (MMM DD)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const date = new Date(dateStr + 'T00:00:00');
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Get the display text based on click state
  let displayText = periodInfo.period;
  let glowColor = periodInfo.color;

  if (clickState === 1) {
    // Period-specific details
    if (periodInfo.period === 'OPEN') {
      displayText = `${daysToQtr}D→EOQ`;
    } else if (periodInfo.period === 'CRUSH') {
      displayText = `${daysSinceLastEarn}D POST`;
    } else if (periodInfo.period === 'QUIET') {
      displayText = `${daysToEarn}D ${formatDate(stock.nextEarn)}`;
    }
  } else if (clickState === 2) {
    // Next corporate event
    if (hasEvent && daysToEvent !== null) {
      // Truncate long event names to max 8 chars
      const eventName = stock.event.length > 8 ? stock.event.slice(0, 8) : stock.event;
      if (daysToEvent > 0) {
        displayText = `${eventName} ${daysToEvent}D`;
      } else if (daysToEvent === 0) {
        displayText = `${eventName} TODAY`;
      } else {
        displayText = `${eventName} DONE`;
      }
      glowColor = '#4dc3ff'; // Lighter cyan for events - more readable
    } else {
      displayText = 'NO EVENT';
      glowColor = COLORS.dim;
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '10px 8px',
        margin: '-10px -8px',
      }}
    >
      {clickState === 0 && <PeriodDot color={periodInfo.color} />}
      <span style={{
        color: glowColor,
        textShadow: clickState === 2 ? '0 0 4px rgba(77,195,255,0.3)' : (clickState > 0 ? `0 0 6px ${glowColor}` : `0 0 4px ${periodInfo.color}`),
        letterSpacing: clickState > 0 ? 0.5 : 2,
        fontSize: clickState === 2 ? 11 : (clickState > 0 ? 11 : 'inherit'),
        fontWeight: clickState > 0 ? 500 : 'inherit',
        background: clickState === 0 ? 'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)' : 'none',
        padding: '2px 0',
        animation: clickState > 0 ? 'sp1000backlightOn 0.15s ease-out' : 'none',
        whiteSpace: 'nowrap',
      }}>
        {displayText}
      </span>
    </div>
  );
}

function SignalLight({ sig, tier = 1 }) {
  const isGreen = sig.score >= 3;
  // Yellow if score is 2 (has 2 out of 4 favorable conditions)
  const isYellow = sig.score === 2;

  // Tier 2: Only show GREEN signals (conviction plays only)
  if (tier === 2 && !isGreen) {
    return <span style={{ display: 'inline-block', width: 8, height: 8 }} />;
  }

  // Tier 1: Show both GREEN and YELLOW
  if (!isGreen && !isYellow) {
    return <span style={{ display: 'inline-block', width: 8, height: 8 }} />;
  }

  const lightColor = isGreen ? '#00ff00' : '#ddaa00';

  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: lightColor,
        boxShadow: isGreen
          ? '0 0 14px rgba(0,255,0,1), 0 0 28px rgba(0,255,0,0.7), 0 0 6px rgba(0,255,0,1)'
          : '0 0 10px rgba(221,170,0,0.8), 0 0 20px rgba(221,170,0,0.5)',
        animation: 'sp1000throb 2s ease-in-out infinite',
      }}
    />
  );
}


// Signal Explanation Overlay - Click on stock symbol to see analysis
function generateNarrative(stock, sig, periodInfo, drawdown) {
  const yahooUrl = `https://finance.yahoo.com/quote/${stock.sym}`;
  let segments = [];

  const pctAbove = sig.pctAboveLow;
  const pctBelow = sig.pctBelowHigh;

  // Opening with current price
  segments.push({ text: 'At a current price of ' });
  segments.push({ text: `$${stock.price.toFixed(2)}`, color: '#fff' });
  segments.push({ text: ', ' });

  // Price position relative to 52W range
  segments.push({ text: `${stock.sym} is trading ` });
  segments.push({ text: `${pctAbove.toFixed(0)}%`, color: pctAbove <= 20 ? '#33ff66' : pctAbove <= 50 ? '#ffcc00' : '#ff5555' });
  segments.push({ text: ' above its 52-week low of ' });
  segments.push({ text: `$${stock.w52l.toFixed(2)}`, color: COLORS.red });
  segments.push({ text: ' and ' });
  segments.push({ text: `${pctBelow.toFixed(0)}%`, color: pctBelow >= 20 ? '#33ff66' : '#ff5555' });
  segments.push({ text: ' below its 52-week high of ' });
  segments.push({ text: `$${stock.w52h.toFixed(2)}`, color: COLORS.green });
  segments.push({ text: ' ', link: yahooUrl, linkText: '(verify)' });
  segments.push({ text: '. ' });

  // Near-high note
  if (sig.nearHighPenalty < 0) {
    segments.push({ text: 'Being less than ' });
    segments.push({ text: '20%', color: '#ff5555' });
    segments.push({ text: ' below the 52-week high incurs a near-high penalty. ' });
  }

  // Crisis mode
  if (sig.isCrisis) {
    segments.push({ text: 'CRISIS detected — ' });
    segments.push({ text: `${Math.abs(drawdown.pctChange).toFixed(1)}%`, color: '#ff5555' });
    segments.push({ text: ' drop in ' });
    segments.push({ text: `${drawdown.days}`, color: '#fff' });
    segments.push({ text: ' trading days ' });
    segments.push({ text: ' ', link: `${yahooUrl}/history/`, linkText: '(history)' });
    segments.push({ text: '. ' });
  }

  // Period explanation
  if (periodInfo.period === 'QUIET') {
    segments.push({ text: 'In QUIET period with ' });
    segments.push({ text: `${periodInfo.left}`, color: '#ffcc00' });
    segments.push({ text: ' days to earnings (' });
    segments.push({ text: stock.nextEarn, color: COLORS.blue });
    segments.push({ text: ') ' });
    segments.push({ text: ' ', link: `${yahooUrl}/analysis/`, linkText: '(verify)' });
    segments.push({ text: '. ' });
  } else if (periodInfo.period === 'CRUSH') {
    segments.push({ text: 'In post-earnings CRUSH period following the ' });
    segments.push({ text: stock.lastEarn, color: COLORS.blue });
    segments.push({ text: ' report ' });
    segments.push({ text: ' ', link: `${yahooUrl}/analysis/`, linkText: '(view earnings)' });
    segments.push({ text: '. ' });
  } else if (periodInfo.period === 'OPEN') {
    segments.push({ text: 'OPEN window with ' });
    segments.push({ text: `${periodInfo.left}`, color: '#fff' });
    segments.push({ text: ' days to quarter end (' });
    segments.push({ text: stock.qtrEnd, color: COLORS.blue });
    segments.push({ text: '). ' });
  }

  return segments;
}

function NarrativeText({ segments }) {
  return (
    <p style={{ color: COLORS.dim, lineHeight: 1.8, margin: 0, fontFamily: MONO, fontSize: 13 }}>
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          {seg.color ? (
            <span style={{ color: seg.color }}>{seg.text}</span>
          ) : seg.link ? (
            <a
              href={seg.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: COLORS.dim, textDecoration: 'underline', opacity: 0.7 }}
            >
              {seg.linkText}
            </a>
          ) : (
            seg.text
          )}
        </React.Fragment>
      ))}
    </p>
  );
}

function SignalExplainOverlay({ stock, sig, periodInfo, drawdown, onClose }) {
  // Tier 2 stocks only show GREEN signals — demote YELLOW to DIM
  const isTier2 = stock.tier === 2;
  const effectiveScore = (isTier2 && sig.score === 2) ? 0 : sig.score;
  const signalLabel = effectiveScore >= 3 ? 'GREEN' : effectiveScore === 2 ? 'YELLOW' : 'DIM';

  // Border glow color based on effective signal
  const borderColor = effectiveScore >= 3 ? COLORS.green : effectiveScore === 2 ? COLORS.amber : 'rgba(255,255,255,0.5)';
  const glowColor = effectiveScore >= 3 ? 'rgba(51,255,102,0.4)' : effectiveScore === 2 ? 'rgba(255,204,0,0.4)' : 'rgba(255,255,255,0.15)';
  const signalTextColor = effectiveScore >= 3 ? COLORS.green : effectiveScore === 2 ? COLORS.amber : '#ccc';

  const yahooUrl = `https://finance.yahoo.com/quote/${stock.sym}`;
  const gaugeInfo = calcGauge(stock.price, stock.w52h, stock.w52l);

  // Period color
  const periodColor = periodInfo.period === 'QUIET' ? COLORS.red : periodInfo.period === 'CRUSH' ? COLORS.blue : COLORS.green;

  // Floor reason
  const floorApplied = sig.floor1 || sig.floor3;
  const floorLabel = sig.floor3 ? 'CRISIS' : sig.floor1 ? 'NEAR LOW' : '';

  // Shared styles
  const rowSep = { height: 1, background: COLORS.dimmer, opacity: 0.4 };
  const labelStyle = { fontFamily: MONO, fontSize: 11, color: COLORS.dim, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' };
  const scoreStyle = (val) => ({ fontFamily: MONO, fontSize: 14, color: val >= 0 ? COLORS.green : COLORS.red, fontWeight: 700 });
  const reasonStyle = { fontFamily: MONO, fontSize: 11, color: COLORS.dim, lineHeight: 1.5, marginTop: 4 };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '85%',
          maxWidth: 580,
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: COLORS.screen,
          borderRadius: 6,
          border: `1.5px solid ${borderColor}`,
          boxShadow: `0 0 20px ${glowColor}, 0 0 60px ${glowColor}, inset 0 0 30px rgba(0,0,0,0.3)`,
          animation: 'sp1000overlayOpen 0.2s ease-out',
          padding: '24px 28px',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 16,
          borderBottom: `1px solid ${borderColor}`,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 18, color: '#fff', fontFamily: MONO, fontWeight: 600, letterSpacing: 2 }}>
            {stock.sym} <span style={{ fontWeight: 400, color: COLORS.dim, fontSize: 13 }}>— SIGNAL ANALYSIS</span>
          </span>
          <span style={{ fontSize: 14, color: signalTextColor, fontFamily: MONO, fontWeight: 600, letterSpacing: 2 }}>
            {signalLabel}
          </span>
        </div>

        {/* ── PRICE SCORE ── */}
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={labelStyle}>PRICE SCORE</span>
            <span style={scoreStyle(sig.priceScore)}>{sig.priceScore >= 0 ? '+' : ''}{sig.priceScore}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <GaugeVertical
              filled={gaugeInfo.filled}
              color={gaugeInfo.color}
              rangePct={gaugeInfo.pct}
              isExpensive={gaugeInfo.isExpensive}
              price={stock.price}
              w52l={stock.w52l}
            />
            <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.dim }}>
              <span style={{ color: '#fff' }}>${stock.price.toFixed(2)}</span>
              {' · 52W LOW '}
              <span style={{ color: COLORS.red }}>${stock.w52l.toFixed(2)}</span>
            </span>
          </div>
          <div style={reasonStyle}>
            Trading <span style={{ color: sig.pctAboveLow <= 20 ? COLORS.green : sig.pctAboveLow <= 50 ? COLORS.amber : COLORS.red }}>{sig.pctAboveLow.toFixed(0)}%</span> above 52-week low
          </div>
        </div>
        <div style={rowSep} />

        {/* ── HIGH PENALTY ── */}
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={labelStyle}>HIGH PENALTY</span>
            <span style={scoreStyle(sig.nearHighPenalty)}>{sig.nearHighPenalty >= 0 ? '+' : ''}{sig.nearHighPenalty}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <GaugeVertical
              filled={gaugeInfo.filled}
              color={gaugeInfo.color}
              rangePct={gaugeInfo.pct}
              isExpensive={gaugeInfo.isExpensive}
              price={stock.price}
              w52l={stock.w52l}
            />
            <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.dim }}>
              <span style={{ color: '#fff' }}>${stock.price.toFixed(2)}</span>
              {' · 52W HIGH '}
              <span style={{ color: COLORS.green }}>${stock.w52h.toFixed(2)}</span>
            </span>
          </div>
          <div style={reasonStyle}>
            Trading <span style={{ color: sig.pctBelowHigh >= 20 ? COLORS.green : COLORS.red }}>{sig.pctBelowHigh.toFixed(0)}%</span> below 52-week high{sig.nearHighPenalty < 0 ? ' — near-high penalty' : ''}
          </div>
        </div>
        <div style={rowSep} />

        {/* ── CRISIS BONUS ── */}
        <div style={{ padding: '12px 0', position: 'relative', overflow: 'hidden' }}>
          {sig.isCrisis && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: -28, right: -28,
              background: 'linear-gradient(90deg, rgba(255,204,0,0.08) 0%, rgba(255,180,0,0.15) 30%, rgba(255,204,0,0.08) 70%, transparent 100%)',
              animation: 'sp1000crisisThrob 3s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'relative', zIndex: 1 }}>
            <span style={labelStyle}>CRISIS BONUS</span>
            <span style={scoreStyle(sig.crisisBonus)}>{sig.crisisBonus >= 0 ? '+' : ''}{sig.crisisBonus}</span>
          </div>
          <div style={{ ...reasonStyle, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            {sig.isCrisis ? (
              <>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: COLORS.amber,
                  boxShadow: '0 0 4px rgba(255,170,0,0.8), 0 0 8px rgba(255,170,0,0.4)',
                  animation: 'sp1000crisisThrob 3s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                <span>
                  <span style={{ color: COLORS.red }}>{Math.abs(drawdown.pctChange).toFixed(1)}%</span> drop in <span style={{ color: '#fff' }}>{drawdown.days}</span> trading days
                </span>
              </>
            ) : (
              <span>No rapid drawdown detected</span>
            )}
          </div>
        </div>
        <div style={rowSep} />

        {/* ── PERIOD ── */}
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={labelStyle}>PERIOD</span>
            <span style={scoreStyle(sig.periodBonus)}>{sig.periodBonus >= 0 ? '+' : ''}{sig.periodBonus}</span>
          </div>
          <div style={reasonStyle}>
            <span style={{ color: periodColor, fontWeight: 600 }}>{periodInfo.period}</span>
            {' · '}
            {periodInfo.period === 'QUIET' && (
              <span>{periodInfo.left} days to earnings (<span style={{ color: COLORS.blue }}>{stock.nextEarn}</span>)</span>
            )}
            {periodInfo.period === 'CRUSH' && (
              <span>Post-earnings crush window (<span style={{ color: COLORS.blue }}>{stock.lastEarn}</span>)</span>
            )}
            {periodInfo.period === 'OPEN' && (
              <span>{periodInfo.left} days to quarter end (<span style={{ color: COLORS.blue }}>{stock.qtrEnd}</span>)</span>
            )}
          </div>
        </div>

        {/* ── TOTAL ── */}
        <div style={{
          borderTop: `2px solid ${borderColor}`,
          paddingTop: 16,
          marginTop: 4,
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.dim, letterSpacing: 1 }}>TOTAL =</span>
            <span style={{ fontFamily: MONO, fontSize: 20, color: sig.score >= 0 ? COLORS.green : COLORS.red, fontWeight: 700 }}>{sig.score}</span>
          </div>
          {floorApplied && (
            <div style={{ textAlign: 'right', marginBottom: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: COLORS.amber, letterSpacing: 1 }}>
                FLOOR: {floorLabel} → MIN 2
              </span>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: COLORS.dim, marginRight: 8 }}>SIGNAL:</span>
            <span style={{
              fontFamily: MONO, fontSize: 13, color: signalTextColor, fontWeight: 700, letterSpacing: 2,
              textShadow: effectiveScore >= 3
                ? '0 0 8px rgba(51,255,102,0.6), 0 0 16px rgba(51,255,102,0.3)'
                : effectiveScore === 2
                  ? '0 0 8px rgba(255,204,0,0.6), 0 0 16px rgba(255,204,0,0.3)'
                  : 'none',
            }}>
              {signalLabel}
            </span>
          </div>
        </div>

        {/* ── Footer: verify + dismiss ── */}
        <div style={{
          borderTop: `1px solid ${COLORS.dimmer}`,
          marginTop: 16,
          paddingTop: 14,
          paddingBottom: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <a
            href={yahooUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: MONO, fontSize: 10, color: COLORS.dim, textDecoration: 'underline', opacity: 0.7 }}
            onClick={e => e.stopPropagation()}
          >
            Verify: Yahoo Finance ↗
          </a>
          <span
            onClick={onClose}
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: 3,
              color: '#fff',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.5)',
              padding: '6px 24px',
              borderRadius: 4,
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontWeight: 500,
              textShadow: '0 0 6px rgba(255,255,255,0.3)',
            }}
          >
            DISMISS
          </span>
        </div>
      </div>
    </div>
  );
}

// User Guide overlay with slide-in, display, then CRT death effect
// Typewriter component - authentic 70s IBM terminal character-by-character typing
function TypewriterText({ text, startDelay = 0, charDelay = 80, onComplete }) {
  const [displayedText, setDisplayedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let charIndex = 0;
    let startTimer;
    let charTimer;

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);

    startTimer = setTimeout(() => {
      const typeNext = () => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          charIndex++;
          charTimer = setTimeout(typeNext, charDelay);
        } else {
          setIsComplete(true);
          if (onComplete) onComplete();
        }
      };
      typeNext();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(charTimer);
      clearInterval(cursorInterval);
    };
  }, [text, startDelay, charDelay, onComplete]);

  return (
    <span>
      {displayedText}
      <span style={{ opacity: cursorVisible && !isComplete ? 1 : 0 }}>█</span>
    </span>
  );
}

// Aliens-style terminal message - all lines typed character-by-character
function TerminalMessage({ active, onTypingComplete }) {
  // phase tracks which line is currently being typed (0=waiting, 1-6=typing lines, 7=complete)
  const [phase, setPhase] = useState(0);

  // All lines in order with their timing
  // charDelay 50ms for disclaimer (shorter text density), 70ms for main messages
  const lines = [
    { text: 'UNAUTHORIZED USER DETECTED . . .', charDelay: 70, style: 'main' },
    { text: 'NOT FOR PUBLIC USE.', charDelay: 50, style: 'disclaimer' },
    { text: 'NOT TO BE RELIED UPON IN ANY WAY.', charDelay: 50, style: 'disclaimer' },
    { text: 'NOT INVESTMENT ADVICE.', charDelay: 50, style: 'disclaimer' },
    { text: 'CONSULT YOUR FINANCIAL ADVISOR BEFORE TAKING ANY ACTION.', charDelay: 50, style: 'disclaimer' },
    { text: 'POWERING DOWN', charDelay: 70, style: 'main' },
  ];

  // Cumulative timing: each line starts after the previous finishes + a pause
  // Line 0: "UNAUTHORIZED..." = 32 chars × 70ms = 2240ms + 800ms pause = 3040ms
  // Line 1: "NOT FOR PUBLIC USE." = 19 × 50 = 950ms + 300ms pause
  // Line 2: "NOT TO BE RELIED..." = 33 × 50 = 1650ms + 300ms pause
  // Line 3: "NOT INVESTMENT..." = 22 × 50 = 1100ms + 300ms pause
  // Line 4: "CONSULT YOUR..." = 56 × 50 = 2800ms + 800ms pause
  // Line 5: "POWERING DOWN" = 13 × 70 = 910ms + 500ms hold
  const schedule = [
    500,                    // Phase 1 start: 0.5s
    500 + 2240 + 800,      // Phase 2: after line 0 types + pause = 3540ms
    3540 + 950 + 300,      // Phase 3: 4790ms
    4790 + 1650 + 300,     // Phase 4: 6740ms
    6740 + 1100 + 300,     // Phase 5: 8140ms
    8140 + 2800 + 800,     // Phase 6: 11740ms
  ];
  const completeTime = 11740 + 910 + 500; // Phase 7 (complete): 13150ms

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }

    const timers = [];

    // Schedule each line's start
    schedule.forEach((ms, i) => {
      timers.push(setTimeout(() => setPhase(i + 1), ms));
    });

    // Complete
    timers.push(setTimeout(() => {
      setPhase(7);
      if (onTypingComplete) onTypingComplete();
    }, completeTime));

    return () => timers.forEach(t => clearTimeout(t));
  }, [active, onTypingComplete]);

  if (!active) return null;

  const mainStyle = {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 'normal',
    letterSpacing: 1,
    color: COLORS.green,
    textShadow: '0 0 8px rgba(51,255,102,0.5)',
  };

  const disclaimerStyle = {
    ...mainStyle,
    fontSize: 9,
    lineHeight: 2.0,
    color: '#dd8844',
    textShadow: '0 0 6px rgba(221,136,68,0.3)',
  };

  const getStyle = (idx) => lines[idx].style === 'disclaimer' ? disclaimerStyle : mainStyle;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: '54px 24px 18px',
      textAlign: 'left',
      lineHeight: 2.4,
      zIndex: 5,
    }}>
      {/* Blinking block cursor before typing starts */}
      {phase === 0 && (
        <div style={mainStyle}>
          <span style={{ animation: 'sp1000cursorBlink 0.8s step-end infinite' }}>█</span>
        </div>
      )}
      {lines.map((line, i) => {
        const linePhase = i + 1; // phase when this line types
        if (phase < linePhase) return null; // not yet reached
        const isTyping = phase === linePhase;
        const isDone = phase > linePhase;
        const isLast = i === lines.length - 1;
        const style = getStyle(i);
        return (
          <div key={i} style={style}>
            {isTyping && <TypewriterText text={line.text} charDelay={line.charDelay} />}
            {isDone && <span>{line.text}</span>}
            {isDone && isLast && (
              <span style={{ animation: 'sp1000cursorBlink 0.6s step-end infinite' }}>█</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PixelGlitchOverlay({ active, startAtGag, stocks: guideStocks, today: guideToday, onDismiss, onBlurStart, onReboot }) {
  const [phase, setPhase] = useState(0); // 0=slide-in, 1=hold, 2=fade-to-black, 3=black, 4=terminal-typing, 5=crt-death, 6=cursor-wait (click→reboot)
  const [gagFading, setGagFading] = useState(false); // CSS transition trigger for gag-only mode
  const guideScrollRef = React.useRef(null);
  const scrollDismissedRef = React.useRef(false);
  const [guideIsMobile, setGuideIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setGuideIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      setGagFading(false);
      return;
    }

    if (startAtGag) {
      // Skip guide — jump straight to blur/gag phase
      setPhase(2);
      if (onBlurStart) onBlurStart();
      return;
    }

    // Phase 0→1: Slide in guide immediately (0.3s transition)
    const timer = setTimeout(() => setPhase(1), 50);
    return () => clearTimeout(timer);
  }, [active, startAtGag]);

  // Gag-only mode: trigger CSS transition after one transparent frame
  useEffect(() => {
    if (!startAtGag || !active || phase !== 2) return;
    const id = requestAnimationFrame(() => setGagFading(true));
    return () => cancelAnimationFrame(id);
  }, [startAtGag, active, phase]);

  // Phase 2→3: wait for blur to complete, then show black screen
  useEffect(() => {
    if (phase !== 2) return;
    const timer = setTimeout(() => setPhase(3), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 3→4: brief black screen, then start terminal typing
  useEffect(() => {
    if (phase !== 3) return;
    const timer = setTimeout(() => setPhase(4), 500);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleTypingComplete = () => {
    setPhase(5); // CRT death
  };

  // Phase 5→6: CRT death animation, then cursor wait screen
  useEffect(() => {
    if (phase !== 5) return;
    const timer = setTimeout(() => setPhase(6), 3300);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleCursorClick = () => {
    if (phase !== 6) return;
    // Dismiss guide and trigger the real startup overlay
    if (onReboot) onReboot();
    if (onDismiss) onDismiss();
  };

  // ESC to skip entire guide/gag sequence
  useEffect(() => {
    if (!active) return;
    const handler = (e) => { if (e.key === 'Escape' && onDismiss) onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onDismiss]);


  // NOTE: Do NOT put an early return here — the useMemo below must always run
  // to maintain consistent React hook order. The guarded return is at line ~965.

  const ARROW_R = '►';
  const BLOCK = '█';
  const HALF = '▓';
  const DOT = '·';

  // Guide color system: 5 tiers — brightness encodes hierarchy, hue encodes semantics
  // Tier 1: green — section headers (structural landmarks)
  // Tier 2: amber — sub-headers (secondary structure)
  // Tier 3: blue (#00aaff) — table chrome, procedural keywords
  // Tier 4: light blue (#77bbff) — data labels, variable names
  // Tier 5: body text (#ccc) — prose, descriptions
  const GUIDE_TEXT = '#cccccc';
  const GUIDE_MUTED = '#888888';
  const GUIDE_LABEL = '#77bbff';

  const valGreen = { color: COLORS.green };
  const valRed = { color: COLORS.red };
  const valAmber = { color: COLORS.amber };
  const valCyan = { color: COLORS.blue };
  const valDim = { color: GUIDE_MUTED };

  // Guide typography — two tiers: F for above-fold (readable), Fs for technical (copy-paste)
  const F = guideIsMobile ? 11 : 13;  // above-fold body text
  const Fs = guideIsMobile ? 9 : 11;  // technical sections below TOC (smaller — users copy/paste)
  const sectionHeader = {
    fontFamily: MONO, fontSize: guideIsMobile ? 14 : 16, letterSpacing: guideIsMobile ? 2 : 3,
    color: COLORS.green, marginTop: guideIsMobile ? 10 : 14, marginBottom: 6,
    textShadow: '0 0 8px rgba(51,255,102,0.15)',
  };
  const subHeader = {
    fontFamily: MONO, fontSize: Fs, lineHeight: 1.6,
    color: COLORS.amber, marginBottom: 3, marginTop: 8, fontWeight: 'bold',
  };
  const prose = {
    fontFamily: MONO, fontSize: F, color: GUIDE_TEXT, lineHeight: 1.6,
    paddingLeft: 4,
  };
  const proseSm = {
    fontFamily: MONO, fontSize: Fs, color: GUIDE_TEXT, lineHeight: 1.6,
    paddingLeft: 4,
  };
  const bullet = {
    fontFamily: MONO, fontSize: Fs, lineHeight: 1.7,
    color: GUIDE_TEXT, paddingLeft: 12,
  };
  const tbl = { fontFamily: MONO, fontSize: Fs }; // shared table cell style
  const sectionBox = {
    border: `1px solid ${COLORS.dimmer}`,
    borderRadius: 8,
    padding: guideIsMobile ? '8px 6px' : '10px 10px',
    marginBottom: 10,
    background: 'rgba(255,255,255,0.01)',
  };

  // Pick the best teaching stock for the schematic diagram
  const exampleStock = React.useMemo(() => {
    if (!guideStocks || guideStocks.length === 0 || !guideToday) return null;

    const candidates = guideStocks.map(stock => {
      const periodInfo = calcPeriod(guideToday, stock);
      const gaugeInfo = calcGauge(stock.price, stock.w52h, stock.w52l);
      const drawdown = detectDrawdownMode(stock);
      const sig = calcSignalData(stock.price, stock.w52h, stock.w52l, stock.iv, periodInfo.period, drawdown.mode);
      const isTier2 = stock.tier === 2;
      const visible = isTier2 ? sig.score >= 3 : sig.score >= 2;
      const daysToEarn = daysBetween(guideToday, stock.nextEarn);
      return { stock, periodInfo, gaugeInfo, drawdown, sig, visible, daysToEarn };
    });

    // Prefer stock with visible signal + red gauge bars (near low)
    const withSignal = candidates.filter(c => c.visible);
    if (withSignal.length > 0) {
      return withSignal.sort((a, b) => b.gaugeInfo.filled - a.gaugeInfo.filled)[0];
    }
    // Fallback: most gauge activity
    return candidates.sort((a, b) => b.gaugeInfo.filled - a.gaugeInfo.filled)[0];
  }, [guideStocks, guideToday]);

  // Static fallback when no live data available
  const FALLBACK_EXAMPLE = {
    stock: { sym: 'PEGA', price: 38.53, w52h: 68.10, w52l: 29.84, iv: 70, tier: 1 },
    periodInfo: { period: 'QUIET', left: 6, color: COLORS.red },
    gaugeInfo: calcGauge(38.53, 68.10, 29.84),
    sig: { score: 2, pctAboveLow: 29.1 },
    drawdown: { mode: 'NORMAL' },
    daysToEarn: 6,
  };

  const example = exampleStock || FALLBACK_EXAMPLE;

  if (!active && phase === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        pointerEvents: 'auto',
        overflow: 'hidden',
        borderRadius: 6,
        backgroundColor: startAtGag
          ? (gagFading ? '#000' : 'transparent')
          : (phase >= 2 ? '#000' : 'transparent'),
        transition: startAtGag
          ? 'background-color 2s ease-in'
          : 'background-color 0.3s ease-in',
      }}
    >
      {/* Gag-only backdrop — blurs terminal content underneath */}
      {startAtGag && phase === 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backdropFilter: gagFading ? 'blur(12px)' : 'blur(0px)',
          WebkitBackdropFilter: gagFading ? 'blur(12px)' : 'blur(0px)',
          transition: 'backdrop-filter 1.5s ease-in, -webkit-backdrop-filter 1.5s ease-in',
        }} />
      )}

      {/* User Guide screen — two-column scrollable layout */}
      {!startAtGag && <div ref={guideScrollRef} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.screen,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px 12px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        transition: 'opacity 0.3s ease-in, filter 1.5s ease-in',
        filter: phase >= 2 ? 'blur(12px)' : 'blur(0px)',
        opacity: phase === 0 ? 0 : (phase >= 2 ? 0 : 1),
      }}>

        {/* ═══ SECTION 1: HEADER ═══ */}
        <div style={{ fontFamily: MONO, letterSpacing: guideIsMobile ? 2 : 3, color: COLORS.green, textAlign: 'center', textShadow: '0 0 8px rgba(51,255,102,0.3)', marginBottom: 14 }}>
          <div style={{ fontSize: guideIsMobile ? 14 : 17, marginBottom: 6 }}>SP-1000 LEAPS TERMINAL</div>
          <div style={{ fontSize: guideIsMobile ? 9 : 12, color: GUIDE_MUTED, letterSpacing: 2 }}>USER GUIDE v2.1</div>
        </div>

        {/* ═══ OVERVIEW ═══ */}
        <div style={{ ...prose, marginBottom: 10, fontSize: guideIsMobile ? 10 : 12, lineHeight: 1.6 }}>
          The <span style={{ color: COLORS.green, textShadow: '0 0 4px rgba(51,255,102,0.2)' }}>SP-1000 LEAPS TERMINAL</span> monitors a curated watchlist for potential opportunities. A composite signal score evaluates each position across price proximity, earnings period, and drawdown detection. When conditions align, the terminal issues a <span style={{ color: COLORS.green }}>GREEN</span> or <span style={{ color: COLORS.amber }}>YELLOW</span> signal. Signal frequency is intentionally low. Tap any ticker for a scoring breakdown.
        </div>
        <div style={{ ...prose, marginBottom: 10, color: '#dd8844', fontSize: guideIsMobile ? 8 : 10, lineHeight: 1.4 }}>
          NOT INVESTMENT ADVICE. NOT FOR PUBLIC USE. CONSULT YOUR FINANCIAL ADVISOR.
        </div>

        {/* ═══ READ THE DISPLAY ═══ */}
        <div style={{ ...sectionHeader, marginTop: 8 }}>READ THE DISPLAY</div>
        <div style={{ ...sectionBox }}>

          {/* ── SIGNAL + IV side by side on desktop, stacked on mobile ── */}
          <div style={{ display: 'flex', flexDirection: guideIsMobile ? 'column' : 'row', gap: 8 }}>
            {/* ── SIGNAL LEGEND ── */}
            <div style={{
              border: `1px solid ${COLORS.dimmer}`,
              borderRadius: 4,
              padding: guideIsMobile ? '6px 8px' : '6px 10px',
              background: 'rgba(255,255,255,0.015)',
              flex: 1,
            }}>
              <div style={{ fontFamily: MONO, fontSize: F, color: COLORS.amber, marginBottom: 4, fontWeight: 'bold' }}>
                SIGNAL
              </div>
              {[
                { color: '#00ff00', glow: '0 0 10px rgba(0,255,0,0.9), 0 0 20px rgba(0,255,0,0.5)', label: 'GREEN', desc: 'Score 3+. Row sweeps green.', pulse: true },
                { color: '#ddaa00', glow: '0 0 8px rgba(221,170,0,0.7), 0 0 16px rgba(221,170,0,0.4)', label: 'YELLOW', desc: 'Score 2. Tier 1 only.', pulse: true },
                { color: COLORS.dimmer, glow: 'none', label: 'DIM', desc: 'Score 0\u20131. LED off.', pulse: false },
              ].map((sig, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 2px' }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: sig.color, boxShadow: sig.glow,
                    animation: sig.pulse ? 'sp1000throb 2s ease-in-out infinite' : 'none',
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: F - 1, color: sig.color, fontWeight: 'bold', letterSpacing: 1 }}>{sig.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: F - 2, color: GUIDE_TEXT, marginLeft: 6 }}>{sig.desc}</span>
                  </div>
                </div>
              ))}
              <div style={{ fontFamily: MONO, fontSize: F - 3, color: GUIDE_MUTED, marginTop: 4, paddingLeft: 2 }}>
                Tap any ticker for scoring breakdown.
              </div>
            </div>

            {/* ── IV GAUGE LEGEND ── */}
            <div style={{
              border: `1px solid ${COLORS.dimmer}`,
              borderRadius: 4,
              padding: guideIsMobile ? '6px 8px' : '6px 10px',
              background: 'rgba(255,255,255,0.015)',
              flex: 1,
            }}>
              <div style={{ fontFamily: MONO, fontSize: F, color: COLORS.amber, marginBottom: 4, fontWeight: 'bold' }}>
                IV GAUGE
              </div>
              <div style={{ fontFamily: MONO, fontSize: F - 2, color: GUIDE_TEXT, lineHeight: 1.5, marginBottom: 4 }}>
                Implied volatility. Horizontal bar.
              </div>
              {[
                { label: '\u226440%', zone: 'AMBER', color: '#cc7700', filled: 5 },
                { label: '>40%', zone: 'RED', color: '#cc4444', filled: 10 },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 2px' }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
                    {Array.from({ length: 10 }, (_, j) => (
                      <div key={j} style={{
                        width: 3, height: 10,
                        backgroundColor: j < row.filled ? row.color : COLORS.unlit,
                        borderRadius: 1,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: F - 1, color: row.color, fontWeight: 'bold', letterSpacing: 1, flexShrink: 0 }}>{row.zone}</span>
                  <span style={{ fontFamily: MONO, fontSize: F - 2, color: GUIDE_TEXT }}>{row.label}</span>
                </div>
              ))}
              <div style={{ fontFamily: MONO, fontSize: F - 3, color: GUIDE_MUTED, marginTop: 4, paddingLeft: 2 }}>
                Higher IV = higher option premiums.
              </div>
            </div>
          </div>

          {/* ── 52W GAUGE SPECTRUM ── */}
          {(() => {
            const ex = example;
            const exStock = ex.stock;
            const exGauge = ex.gaugeInfo;

            return (
              <div style={{
                border: `1px solid ${COLORS.dimmer}`,
                borderRadius: 4,
                padding: guideIsMobile ? '6px 8px' : '6px 10px',
                background: 'rgba(255,255,255,0.015)',
                marginTop: 8,
              }}>
                <div style={{ fontFamily: MONO, fontSize: F, color: COLORS.amber, marginBottom: 4, fontWeight: 'bold' }}>
                  52W GAUGE
                </div>

                {/* Spectrum — vertical gauges with labels */}
                {(() => {
                  const exW52l = exStock.w52l || 30;
                  const exW52h = exStock.w52h || 68;
                  const midPrice = Math.round((exW52l + exW52h) / 2);

                  const spectrumRows = [
                    { pct: 0.0, price: `$${Math.round(exW52l)}`, label: 'AT 52W LOW' },
                    { pct: 0.2, price: '', label: 'NEAR LOW' },
                    { pct: 0.5, price: `$${midPrice}`, label: 'MIDPOINT' },
                    { pct: 0.8, price: '', label: 'NEAR HIGH' },
                    { pct: 1.0, price: `$${Math.round(exW52h)}`, label: 'AT 52W HIGH' },
                  ];

                  const exPct = exGauge.pct ?? 0.5;
                  let closestIdx = 0;
                  let closestDist = Infinity;
                  spectrumRows.forEach((row, i) => {
                    const d = Math.abs(row.pct - exPct);
                    if (d < closestDist) { closestDist = d; closestIdx = i; }
                  });

                  return spectrumRows.map((row, i) => {
                    const isExp = row.pct > 0.5;
                    const dist = Math.abs(row.pct - 0.5);
                    const bright = 0.5 + (dist * 1.0);
                    const bR = isExp ? { r: 51, g: 204, b: 85 } : { r: 255, g: 85, b: 85 };
                    const bColor = `rgb(${Math.round(bR.r * bright)}, ${Math.round(bR.g * bright)}, ${Math.round(bR.b * bright)})`;
                    const bars = Math.round(dist / 0.5 * 5);
                    const isCurrent = i === closestIdx;
                    const doPulse = row.pct <= 0.3 && bars > 0;

                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '2px 2px', gap: 6 }}>
                        <span style={{ fontFamily: MONO, fontSize: F - 3, color: 'transparent', width: 10, flexShrink: 0 }}>
                          {''}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: F - 2, color: GUIDE_MUTED, width: 32, textAlign: 'right', flexShrink: 0 }}>
                          {row.price}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', height: 20, width: 8, minWidth: 8, gap: 2, flexShrink: 0 }}>
                          {Array.from({ length: 5 }, (_, j) => {
                            const active = (5 - j) <= bars;
                            return (
                              <div key={j} style={{
                                flex: 1, width: 8,
                                backgroundColor: active ? bColor : COLORS.unlit,
                                borderRadius: 1,
                                animation: doPulse && active ? 'sp1000throb 2s ease-in-out infinite' : 'none',
                              }} />
                            );
                          })}
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: F - 2, color: GUIDE_TEXT, letterSpacing: 0.5 }}>{row.label}</span>
                      </div>
                    );
                  });
                })()}

                <div style={{ fontFamily: MONO, fontSize: F - 3, color: GUIDE_MUTED, marginTop: 4, paddingLeft: 2 }}>
                  Tap gauge for exact %. Tap price for 52W low.
                </div>

                {/* ── CRISIS MODE — sub-section within 52W Gauge box ── */}
                <div style={{ height: 1, background: COLORS.dimmer, margin: '8px 0', opacity: 0.5 }} />
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Crisis throb overlay */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(90deg, rgba(255,204,0,0.08) 0%, rgba(255,180,0,0.15) 30%, rgba(255,204,0,0.08) 70%, transparent 100%)',
                    animation: 'sp1000crisisThrob 3s ease-in-out infinite',
                    pointerEvents: 'none',
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontFamily: MONO, fontSize: F, color: COLORS.amber, letterSpacing: 2, fontWeight: 'bold' }}>
                      CRISIS MODE
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: F - 2, color: GUIDE_TEXT, marginTop: 2, lineHeight: 1.4 }}>
                      {'>'}8% drop in 7 trading days.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ═══ TABLE OF CONTENTS ═══ */}
        <div style={{
          borderTop: `1px solid ${COLORS.dimmer}`, borderBottom: `1px solid ${COLORS.dimmer}`,
          padding: '12px 4px', marginBottom: 14, marginTop: 8,
        }}>
          <div style={{ fontFamily: MONO, fontSize: F - 2, color: COLORS.dim, letterSpacing: 3, marginBottom: 10 }}>
            CONTENTS
          </div>
          {[
            ['1', 'CONTROLS'],
            ['2', 'SCORING ENGINE'],
            ['3', 'CLASSIFICATION'],
            ['4', 'TEMPORAL NAVIGATION'],
            ['5', 'SIGNAL REPLICATION SPECIFICATION'],
            ['6', 'AI ANALYSIS PROMPT'],
          ].map(([num, title]) => (
            <div key={num} style={{
              fontFamily: MONO, fontSize: F - 2, color: GUIDE_TEXT, lineHeight: 2.0,
              display: 'flex', paddingLeft: 4, whiteSpace: 'nowrap',
            }}>
              <span style={{ color: COLORS.dim, minWidth: 24, flexShrink: 0 }}>{num}.</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'clip' }}>
                {title}<span style={{ color: COLORS.dimmer }}>{' ·'.repeat(30)}</span>
              </span>
              <span style={{ color: COLORS.dim, marginLeft: 8, flexShrink: 0 }}>{num}</span>
            </div>
          ))}
        </div>

        {/* ═══ CONTROLS ═══ */}
        <div style={{ ...sectionHeader }}>CONTROLS</div>
        <div style={{ ...sectionBox }}><div style={{ display: 'flex', gap: 10 }}>
          {/* Left column — DASHBOARD */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...subHeader, marginTop: 0, letterSpacing: 2 }}>DASHBOARD TAPS</div>
            {[
              [<span style={{ color: GUIDE_LABEL }}>SYMBOL</span>, 'signal analysis + score'],
              [<span style={{ color: GUIDE_LABEL }}>PRICE/52W</span>, '52W low + % above'],
              [<span style={{ color: GUIDE_LABEL }}>GAUGE</span>, 'exact % above 52W low'],
              [<span style={{ color: GUIDE_LABEL }}>IV BAR</span>, 'exact IV percentage'],
              [<span style={{ color: GUIDE_LABEL }}>PERIOD</span>, <>cycles: name {'\u2192'} countdown {'\u2192'} event</>],
              [<span style={{ color: GUIDE_LABEL }}>IV HEADER</span>, 'toggle IV edit mode'],
            ].map((row, i) => (
              <div key={`ctrl-dash-${i}`} style={{ display: 'flex', padding: '2px 4px', alignItems: 'baseline', gap: 6 }}>
                <span style={{ ...tbl, flexShrink: 0 }}>{row[0]}</span>
                <span style={{ ...tbl, color: GUIDE_TEXT }}>{row[1]}</span>
              </div>
            ))}
          </div>
          {/* Right column — TOOLBAR */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...subHeader, marginTop: 0, letterSpacing: 2 }}>TOOLBAR</div>
            {[
              [<span style={{ color: GUIDE_LABEL }}>CONTACT</span>, 'trigger contact sequence'],
              [<span style={{ color: GUIDE_LABEL }}>REFRESH</span>, 're-sync market data'],
              [<span style={{ color: GUIDE_LABEL }}>GUIDE</span>, 'reopen this guide'],
              [<span style={{ color: GUIDE_LABEL }}>TIME MACHINE</span>, 'historical date entry'],
              [<span style={{ color: GUIDE_LABEL }}>SP-1000</span>, 'replay startup logo'],
              [<span style={{ color: GUIDE_LABEL }}>RETURN</span>, 'dismiss overlay / present'],
              [<span style={{ color: GUIDE_LABEL }}>ESC</span>, 'skip guide animation'],
            ].map((row, i) => (
              <div key={`ctrl-tool-${i}`} style={{ display: 'flex', padding: '2px 4px', alignItems: 'baseline', gap: 6 }}>
                <span style={{ ...tbl, flexShrink: 0 }}>{row[0]}</span>
                <span style={{ ...tbl, color: GUIDE_TEXT }}>{row[1]}</span>
              </div>
            ))}
          </div>
        </div></div>

        {/* ═══ TWO-COLUMN LAYOUT: SCORING + RIGHT COLUMN ═══ */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* LEFT COLUMN */}
          <div style={{ flex: 1.1, minWidth: 0 }}>
            {/* ═══ SCORING ENGINE ═══ */}
            <div style={{ ...sectionHeader }}>SCORING ENGINE</div>
            <div style={{ ...sectionBox }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', padding: '3px 8px', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ ...tbl, flex: 2, color: COLORS.blue, letterSpacing: 2 }}>COMPONENT</span>
                <span style={{ ...tbl, flex: 3, color: COLORS.blue, letterSpacing: 2 }}>CONDITION</span>
                <span style={{ ...tbl, flex: 0.7, color: COLORS.blue, letterSpacing: 2, textAlign: 'right' }}>PTS</span>
              </div>
              {[
                ['PRICE', '\u226410% above 52W low', '+3', valGreen],
                ['', '\u226420% above 52W low', '+2', valGreen],
                ['', '\u226450% above 52W low', '+1', valGreen],
                ['', 'Above 50%', '+0', valDim],
              ].map((row, i) => (
                <div key={`price-${i}`} style={{ display: 'flex', padding: '2px 8px', alignItems: 'center' }}>
                  <span style={{ ...tbl, flex: 2, color: GUIDE_LABEL, letterSpacing: 1 }}>{row[0]}</span>
                  <span style={{ ...tbl, flex: 3, color: GUIDE_TEXT }}>{row[1]}</span>
                  <span style={{ ...tbl, flex: 0.7, textAlign: 'right', ...row[3] }}>{row[2]}</span>
                </div>
              ))}
              <div style={{ display: 'flex', padding: '2px 8px', alignItems: 'center' }}>
                <span style={{ ...tbl, flex: 2, color: GUIDE_LABEL, letterSpacing: 1 }}>NEAR-HIGH</span>
                <span style={{ ...tbl, flex: 3, color: GUIDE_TEXT }}>&lt;20% below 52W high</span>
                <span style={{ ...tbl, flex: 0.7, textAlign: 'right', color: COLORS.red }}>{'\u2212'}1</span>
              </div>
              {[
                ['PERIOD', 'QUIET (pre-earn)', '+1', COLORS.green],
                ['', 'CRUSH (post-earn)', '0', GUIDE_MUTED],
                ['', 'OPEN (repurchase)', '\u22121', COLORS.red],
              ].map((row, i) => (
                <div key={`period-${i}`} style={{ display: 'flex', padding: '2px 8px', alignItems: 'center' }}>
                  <span style={{ ...tbl, flex: 2, color: GUIDE_LABEL, letterSpacing: 1 }}>{row[0]}</span>
                  <span style={{ ...tbl, flex: 3, color: GUIDE_TEXT }}>{row[1]}</span>
                  <span style={{ ...tbl, flex: 0.7, textAlign: 'right', color: row[3] }}>{row[2]}</span>
                </div>
              ))}
              <div style={{ display: 'flex', padding: '2px 8px', alignItems: 'center' }}>
                <span style={{ ...tbl, flex: 2, color: GUIDE_LABEL, letterSpacing: 1 }}>CRISIS</span>
                <span style={{ ...tbl, flex: 3, color: GUIDE_TEXT }}>&gt;8% drop in 7 trading days</span>
                <span style={{ ...tbl, flex: 0.7, textAlign: 'right', color: COLORS.green }}>+2</span>
              </div>
            </div>

            {/* SCORE → SIGNAL MAPPING */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ ...tbl, color: COLORS.blue, letterSpacing: 2 }}>SCORE {'\u2192'} SIGNAL</span>
              </div>
              <div style={{ display: 'flex', padding: '2px 8px', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={tbl}><span style={valGreen}>{BLOCK}{BLOCK}{BLOCK}</span> <span style={{ color: GUIDE_TEXT }}>GREEN</span></span>
                <span style={{ ...tbl, color: GUIDE_TEXT }}>{'\u2265'} 3</span>
              </div>
              <div style={{ display: 'flex', padding: '2px 8px', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={tbl}><span style={valAmber}>{HALF}{HALF}{HALF}</span> <span style={{ color: GUIDE_TEXT }}>YELLOW</span></span>
                <span style={{ ...tbl, color: GUIDE_TEXT }}>= 2</span>
              </div>
              <div style={{ display: 'flex', padding: '2px 8px', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={tbl}><span style={valDim}>{DOT}{DOT}{DOT}</span> <span style={{ color: GUIDE_TEXT }}>DIM</span></span>
                <span style={{ ...tbl, color: GUIDE_MUTED }}>{'\u2264'} 1</span>
              </div>
            </div>
          </div></div>

          {/* RIGHT COLUMN */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* ═══ CLASSIFICATION ═══ */}
            <div style={{ ...sectionHeader }}>CLASSIFICATION</div>
            <div style={{ ...sectionBox }}>
            <div style={{ ...proseSm, lineHeight: 1.9, marginBottom: 8 }}>
              Every stock in the watchlist is classified as either <span style={{ color: COLORS.green }}>GREEN</span> + <span style={{ color: COLORS.amber }}>YELLOW</span> or <span style={{ color: COLORS.green }}>GREEN ONLY</span> based on backtested forward returns.
            </div>
            <div style={{ ...proseSm, lineHeight: 1.9, marginBottom: 8 }}>
              A <span style={{ color: COLORS.amber }}>YELLOW</span> reading on a <span style={{ color: COLORS.green }}>GREEN-only</span> stock displays as <span style={{ color: GUIDE_MUTED }}>DIM</span> — the terminal shows only actionable signals.
            </div>
            <div style={{ ...proseSm, lineHeight: 1.9, marginBottom: 0 }}>
              Classifications are reviewed as new performance data becomes available.
            </div>
            </div>
          </div>
        </div>

        {/* ═══ TEMPORAL NAVIGATION (full width) ═══ */}
        <div style={{ ...sectionHeader }}>TEMPORAL NAVIGATION</div>
        <div style={{ ...sectionBox }}>
        <div style={{ ...proseSm, marginBottom: 8 }}>
          The Time Machine transports the display to any historical date. All signals are recomputed using actual market data — 52-week ranges, price positions, drawdown detection, and earnings periods are recalculated at the target date. Returns shown are price-only. The SPY benchmark return over the same period is provided for comparison.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Left: Activation + Navigator */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...subHeader }}>{ARROW_R} ACTIVATION</div>
            <div style={{ ...bullet }}>1. Tap <span style={valAmber}>TIME MACHINE</span></div>
            <div style={{ ...bullet }}>2. Enter date (YYYY-MM-DD)</div>
            <div style={{ ...bullet }}>3. Wormhole fires</div>
            <div style={{ ...bullet }}>4. Terminal reconstructs</div>
            <div style={{ ...subHeader, marginTop: 8 }}>{ARROW_R} NAVIGATOR</div>
            <div style={{ ...proseSm, lineHeight: 1.5, marginBottom: 4 }}>
              {'\u2190'} / {'\u2192'} arrows jump between signal dates. Pre-scans 600 trading days.
            </div>
            <div style={{ ...subHeader, marginTop: 8 }}>{ARROW_R} RETURN</div>
            <div style={{ ...proseSm, lineHeight: 1.5 }}>
              Tap RETURN to restore present date.
            </div>
          </div>
          {/* Right: Historical Data Fields */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...subHeader }}>{ARROW_R} DATA FIELDS</div>
            <div>
              {[
                ['SIGNAL', 'Recalculated at date'],
                ['PRICE', 'Stock price on date'],
                ['NOW', 'Current price'],
                ['RETURN', '% gain/loss to present'],
                ['AVG', 'Mean return of signals'],
                ['SPY', 'S&P 500 same period'],
                ['ALPHA', 'Outperformance vs SPY'],
              ].map((row, i, arr) => (
                <div key={row[0]} style={{ display: 'flex', padding: '3px 8px', alignItems: 'center' }}>
                  <span style={{ ...tbl, flex: 1.3, color: GUIDE_LABEL, letterSpacing: 1 }}>{row[0]}</span>
                  <span style={{ ...tbl, flex: 2.5, color: GUIDE_TEXT }}>{row[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* ═══ SIGNAL REPLICATION SPECIFICATION ═══ */}
        <div style={{ ...sectionHeader }}>SIGNAL REPLICATION SPECIFICATION</div>
        <div style={{ ...sectionBox }}>

        {/* ► SYSTEM CONSTANTS */}
        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} SYSTEM CONSTANTS</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>N</span> = 10 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>total tickers in watchlist</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>N_T1</span> = 5 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>tier 1 count</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>N_T2</span> = 5 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>tier 2 count</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>CRUSH_WINDOW</span> = 5 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>days</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>QUIET_WINDOW</span> = 21 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>days</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>CRISIS_THRESHOLD</span> = −8 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>% over {'≤'}7 trading days</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>FLOOR_MIN</span> = 2</div>
        </div>

        {/* ► INPUT VECTOR */}
        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} INPUT VECTOR PER TICKER S_i WHERE i ∈ [1,N]</div>
        <div style={{ marginBottom: 8 }}>
          {[
            ['P_i', 'FLOAT', 'price at evaluation date t'],
            ['H_i', 'FLOAT', '52-week high as of t'],
            ['L_i', 'FLOAT', '52-week low as of t'],
            ['IV_i', 'FLOAT', 'implied volatility %'],
            ['T_i', 'INT{1,2}', 'tier classification'],
            ['d_lastEarn', 'DATE', 'most recent earnings date'],
            ['d_nextEarn', 'DATE', 'next scheduled earnings date'],
            ['d_qtrEnd', 'DATE', 'fiscal quarter end date'],
            ['d_event', 'DATE|NULL', 'catalyst event date'],
            ['PH_i[0..k]', 'FLOAT[]', 'trailing price history (k≤5)'],
          ].map((row, i, arr) => (
            <div key={row[0]} style={{ display: 'flex', padding: '2px 10px', alignItems: 'center' }}>
              <span style={{ ...tbl, flex: 1.5, color: GUIDE_LABEL, letterSpacing: 1 }}>{row[0]}</span>
              <span style={{ ...tbl, flex: 1, color: GUIDE_MUTED }}>{row[1]}</span>
              <span style={{ ...tbl, flex: 2.5, color: GUIDE_TEXT }}>{row[2]}</span>
            </div>
          ))}
        </div>

        {/* ► PROCEDURE 1: PERIOD */}
        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} PROCEDURE 1: PERIOD_RESOLVE(t, S_i) → (period, daysLeft)</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>δ_event</span> = t − d_event &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// days since catalyst</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>δ_last</span> &nbsp;= t − d_lastEarn</div>
          <div><span style={{ color: GUIDE_LABEL }}>δ_next</span> &nbsp;= d_nextEarn − t</div>
          <div><span style={{ color: GUIDE_LABEL }}>δ_qtr</span> &nbsp;&nbsp;= d_qtrEnd − t</div>
          <div style={{ marginTop: 4, color: COLORS.blue }}>EVALUATE IN ORDER:</div>
          <div>&nbsp;&nbsp;1. δ_event ∈ [0, 5] → CRUSH, left = 5 − δ_event</div>
          <div>&nbsp;&nbsp;2. δ_last ∈ [0, 5] → CRUSH, left = 5 − δ_last</div>
          <div>&nbsp;&nbsp;3. δ_qtr {'≤'} 0 ∧ δ_next {'>'} 0 → QUIET, left = δ_next</div>
          <div>&nbsp;&nbsp;4. δ_next ∈ [0, 21] → QUIET, left = δ_next</div>
          <div>&nbsp;&nbsp;5. DEFAULT → OPEN, left = δ_qtr</div>
          <div style={{ marginTop: 2, color: GUIDE_MUTED }}>// first match wins; short-circuit</div>
        </div>

        {/* ► PROCEDURE 2: CRISIS */}
        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} PROCEDURE 2: CRISIS_DETECT(PH_i) → mode</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>k</span> = len(PH_i) − 1</div>
          <div><span style={{ color: GUIDE_LABEL }}>Δ</span> = ((PH_i[k] − PH_i[0]) / PH_i[0]) × 100</div>
          <div style={{ marginTop: 2 }}>
            <span style={{ color: COLORS.blue }}>IF</span> Δ {'≤'} CRISIS_THRESHOLD ∧ k {'≤'} 7 → CRISIS
          </div>
          <div>
            <span style={{ color: COLORS.blue }}>ELSE</span> → NORMAL
          </div>
        </div>

        {/* ► PROCEDURE 3: SCORE */}
        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} PROCEDURE 3: SCORE_COMPUTE(S_i, period, mode) → score</div>
        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>α</span> = ((P_i − L_i) / L_i) × 100 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// % above 52W low</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>β</span> = ((H_i − P_i) / H_i) × 100 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// % below 52W high</span></div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <span style={{ ...tbl, flex: 1.8, color: COLORS.blue, letterSpacing: 1 }}>VAR</span>
            <span style={{ ...tbl, flex: 2.5, color: COLORS.blue, letterSpacing: 1 }}>CONDITION</span>
            <span style={{ ...tbl, flex: 0.5, color: COLORS.blue, letterSpacing: 1, textAlign: 'right' }}>VAL</span>
          </div>
          {[
            ['C_price', 'α ≤ 10', '+3'],
            ['', '10 < α ≤ 20', '+2'],
            ['', '20 < α ≤ 50', '+1'],
            ['', 'α > 50', '0'],
            ['C_high', 'β < 20', '−1'],
            ['', 'β ≥ 20', '0'],
            ['C_crisis', 'mode = CRISIS', '+2'],
            ['', 'mode = NORMAL', '0'],
            ['C_period', 'period = QUIET', '+1'],
            ['', 'period = CRUSH', '0'],
            ['', 'period = OPEN', '−1'],
          ].map((row, i, arr) => (
            <div key={i} style={{ display: 'flex', padding: '2px 10px', alignItems: 'center' }}>
              <span style={{ ...tbl, flex: 1.8, color: GUIDE_LABEL, letterSpacing: 1 }}>{row[0]}</span>
              <span style={{ ...tbl, flex: 2.5, color: GUIDE_TEXT }}>{row[1]}</span>
              <span style={{ ...tbl, flex: 0.5, color: row[2].startsWith('+') ? COLORS.green : row[2].startsWith('−') ? COLORS.red : GUIDE_MUTED, textAlign: 'right', letterSpacing: 1 }}>{row[2]}</span>
            </div>
          ))}
        </div>
        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>R</span> = C_price + C_high + C_crisis + C_period</div>
          <div style={{ marginTop: 2, color: COLORS.blue }}>FLOOR OVERRIDE:</div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>F1</span> = (α {'≤'} 10) &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// near 52W low</span></div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>F3</span> = (mode = CRISIS)</div>
          <div>&nbsp;&nbsp;<span style={{ color: COLORS.blue }}>IF</span> F1 ∨ F3 → score = max(R, FLOOR_MIN)</div>
          <div>&nbsp;&nbsp;<span style={{ color: COLORS.blue }}>ELSE</span> → score = R</div>
        </div>

        {/* ► PROCEDURE 4: CLASSIFY */}
        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} PROCEDURE 4: SIGNAL_CLASSIFY(score, T_i) → signal</div>
        <div style={{ ...proseSm, marginBottom: 6, lineHeight: 1.8 }}>
          <div style={{ color: COLORS.blue }}>MAP:</div>
          <div>&nbsp;&nbsp;score {'≥'} 3 → GREEN</div>
          <div>&nbsp;&nbsp;score = 2 → YELLOW</div>
          <div>&nbsp;&nbsp;score {'≤'} 1 → DIM <span style={{ color: GUIDE_MUTED }}>// no signal</span></div>
          <div style={{ marginTop: 2, color: COLORS.blue }}>TIER GATE:</div>
          <div>&nbsp;&nbsp;T_i = 1 → emit if score {'≥'} 2 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// GREEN + YELLOW</span></div>
          <div>&nbsp;&nbsp;T_i = 2 → emit if score {'≥'} 3 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// GREEN only</span></div>
          <div>&nbsp;&nbsp;<span style={{ color: COLORS.blue }}>ELSE</span> → suppress</div>
        </div>

        {/* ► PROCEDURE 5: BACKTEST LOOP */}
        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} PROCEDURE 5: BACKTEST(t, t_now) → results</div>
        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8 }}>
          <div style={{ color: COLORS.blue }}>FOR EACH S_i WHERE i ∈ [1, N]:</div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>period_i</span> = PERIOD_RESOLVE(t, S_i)</div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>mode_i</span> &nbsp;= CRISIS_DETECT(PH_i)</div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>score_i</span> = SCORE_COMPUTE(S_i, period_i, mode_i)</div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>sig_i</span> &nbsp;&nbsp;= SIGNAL_CLASSIFY(score_i, T_i)</div>
          <div style={{ marginTop: 2 }}>&nbsp;&nbsp;<span style={{ color: COLORS.blue }}>IF</span> sig_i ≠ suppress:</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>r_i</span> = ((P_i(t_now) − P_i(t)) / P_i(t)) × 100</div>
        </div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div style={{ color: COLORS.blue }}>AGGREGATE:</div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>n</span> = |{'{'} i : sig_i ≠ suppress {'}'}| &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// count of active signals</span></div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>R_avg</span> = (1/n) × Σ r_i &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// mean return across signals</span></div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>R_spy</span> = ((SPY(t_now) − SPY(t)) / SPY(t)) × 100</div>
          <div>&nbsp;&nbsp;<span style={{ color: GUIDE_LABEL }}>α_net</span> = R_avg − R_spy &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>// alpha vs benchmark</span></div>
        </div>
        </div>

        {/* ═══ AI ANALYSIS PROMPT ═══ */}
        <div style={{ ...sectionHeader }}>AI ANALYSIS PROMPT</div>
        <div style={{ ...sectionBox }}>

        <div style={{ ...proseSm, marginBottom: 10 }}>
          Reference prompt for external AI analysis. Copy the text below and provide it to any large-language-model along with 3 ticker symbols to evaluate using the SP-1000 scoring methodology (simplified, without the classification signal filter).
        </div>

        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} SYSTEM CONTEXT</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div>Act as the <span style={{ color: GUIDE_LABEL }}>"SP-1000 LEAPS TERMINAL,"</span> a strict algorithmic investment assistant.</div>
          <div style={{ marginTop: 4 }}>Apply the Logic Specification below to <span style={{ color: GUIDE_LABEL }}>3 stock tickers</span> that the user will provide at the end of the prompt.</div>
        </div>

        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} LOGIC SPECIFICATION</div>

        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8, color: GUIDE_LABEL }}>1. CONSTANTS</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>CRISIS_THRESHOLD</span> = −8% &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>price drop over {'≤'}7 trading days</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>FLOOR_MIN</span> = 2</div>
          <div><span style={{ color: GUIDE_LABEL }}>t</span> = current date</div>
        </div>

        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8, color: GUIDE_LABEL }}>2. SCORING VARIABLES (PER TICKER)</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>α</span> = ((Price − 52W_Low) / 52W_Low) × 100 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>% above 52-week low</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>β</span> = ((52W_High − Price) / 52W_High) × 100 &nbsp;&nbsp; <span style={{ color: GUIDE_MUTED }}>% below 52-week high</span></div>
          <div><span style={{ color: GUIDE_LABEL }}>δ_last</span> = days since last earnings</div>
          <div><span style={{ color: GUIDE_LABEL }}>δ_next</span> = days until next earnings</div>
        </div>

        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8, color: GUIDE_LABEL }}>3. PERIOD_RESOLVE</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: COLORS.blue }}>IF</span> δ_last {'≤'} 5 <span style={{ color: COLORS.blue }}>OR</span> days since catalyst event {'≤'} 5 → <span style={{ color: GUIDE_LABEL }}>CRUSH</span></div>
          <div><span style={{ color: COLORS.blue }}>IF</span> δ_next {'≤'} 21 → <span style={{ color: GUIDE_LABEL }}>QUIET</span></div>
          <div><span style={{ color: COLORS.blue }}>ELSE</span> → <span style={{ color: GUIDE_LABEL }}>OPEN</span></div>
        </div>

        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8, color: GUIDE_LABEL }}>4. CRISIS_DETECT</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: COLORS.blue }}>IF</span> price dropped {'>'} 8% in last 7 trading days → <span style={{ color: GUIDE_LABEL }}>CRISIS</span></div>
          <div><span style={{ color: COLORS.blue }}>ELSE</span> → <span style={{ color: GUIDE_LABEL }}>NORMAL</span></div>
        </div>

        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8, color: GUIDE_LABEL }}>5. SCORE_COMPUTE</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: GUIDE_LABEL }}>PRICE_SCORE</span>: α {'≤'} 10 → +3 | α {'≤'} 20 → +2 | α {'≤'} 50 → +1 | else → 0</div>
          <div><span style={{ color: GUIDE_LABEL }}>HIGH_SCORE</span>: β {'<'} 20 → −1 | else → 0</div>
          <div><span style={{ color: GUIDE_LABEL }}>CRISIS_SCORE</span>: CRISIS → +2 | NORMAL → 0</div>
          <div><span style={{ color: GUIDE_LABEL }}>PERIOD_SCORE</span>: QUIET → +1 | CRUSH → 0 | OPEN → −1</div>
          <div style={{ marginTop: 4 }}><span style={{ color: GUIDE_LABEL }}>R</span> = PRICE + HIGH + CRISIS + PERIOD</div>
          <div style={{ marginTop: 4 }}><span style={{ color: COLORS.blue }}>FLOOR:</span> <span style={{ color: COLORS.blue }}>IF</span> (α {'≤'} 10) <span style={{ color: COLORS.blue }}>OR</span> (CRISIS) → Final = MAX(R, 2)</div>
          <div><span style={{ color: COLORS.blue }}>ELSE</span> → Final = R</div>
        </div>

        <div style={{ ...proseSm, marginBottom: 4, lineHeight: 1.8, color: GUIDE_LABEL }}>6. SIGNAL GENERATION</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div><span style={{ color: COLORS.green }}>GREEN</span>: Final {'≥'} 3</div>
          <div><span style={{ color: COLORS.amber }}>YELLOW</span>: Final = 2</div>
          <div><span style={{ color: GUIDE_MUTED }}>NO SIGNAL</span>: Final {'≤'} 1</div>
        </div>

        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} INSTRUCTIONS</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div>1. <span style={{ color: COLORS.blue }}>SEARCH</span> for current real-time data for the 3 tickers: Price, 52W High, 52W Low, Last Earnings Date, Next Earnings Date, and 7-day price history.</div>
          <div>2. <span style={{ color: COLORS.blue }}>CALCULATE</span> variables (α, β, Period, Mode) strictly per the Logic Specification above.</div>
          <div>3. <span style={{ color: COLORS.blue }}>OUTPUT</span> a summary table with columns: Ticker, Price, Dist to 52wL (α), Dist to 52wH (β), Period Status, Total Score, and FINAL SIGNAL (Green / Yellow / No Signal).</div>
        </div>

        <div style={{ ...subHeader, marginTop: 4, marginBottom: 4 }}>{ARROW_R} TICKERS</div>
        <div style={{ ...proseSm, marginBottom: 8, lineHeight: 1.8 }}>
          <div>1. [INSERT TICKER 1]</div>
          <div>2. [INSERT TICKER 2]</div>
          <div>3. [INSERT TICKER 3]</div>
        </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ fontFamily: MONO, fontSize: F, color: GUIDE_MUTED, marginTop: 'auto', paddingTop: 16, textAlign: 'center', lineHeight: 1.8 }}>
          <div>SOUTH END AI {DOT} LEAPS TERMINAL {DOT} SP-1000</div>
          <div>CONFIDENTIAL AND PROPRIETARY</div>
          <div>NOT FOR PUBLIC USE</div>
        </div>

      </div>}

      {/* Dark panel — appears after guide fades to black */}
      {phase >= 3 && phase <= 4 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: COLORS.screen,
        }}>
          {/* Terminal typing messages */}
          {phase === 4 && <TerminalMessage active={true} onTypingComplete={handleTypingComplete} />}
        </div>
      )}

      {/* CRT death - collapses to horizontal line after POWERING DOWN */}
      {phase === 5 && (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            animation: 'sp1000crtDeath 0.5s ease-in forwards',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '150%',
            height: 4,
            backgroundColor: '#fff',
            boxShadow: '0 0 40px 20px rgba(255,255,255,1), 0 0 80px 40px rgba(255,255,255,0.8)',
            animation: 'sp1000guideCrtLine 0.6s ease-out forwards',
          }} />
        </>
      )}

      {/* Black screen with blinking cursor — click to trigger startup */}
      {phase === 6 && (
        <div
          onClick={handleCursorClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.screen,
            cursor: 'pointer',
          }}
        >
          <div style={{
            padding: '54px 24px',
            fontFamily: MONO, fontSize: 11, color: COLORS.green,
            textShadow: '0 0 8px rgba(51,255,102,0.9), 0 0 16px rgba(51,255,102,0.6)',
          }}>
            <span style={{ animation: 'sp1000cursorBlink 0.8s step-end infinite' }}>█</span>
          </div>
        </div>
      )}



    </div>
  );
}

function CRTOverlay() {
  return (
    <>
      {/* IBM-style phosphor glow - subtle, clean amber/green tint */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(40,60,40,0.08) 0%, rgba(0,0,0,0) 60%)',
          pointerEvents: 'none',
          zIndex: 8,
          borderRadius: 6,
        }}
      />
      {/* Fine scanlines - subtle, high-quality CRT style */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 2px)',
          pointerEvents: 'none',
          zIndex: 10,
          borderRadius: 6,
        }}
      />
      {/* Subtle glass reflection - clean */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, transparent 30%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 11,
          borderRadius: 6,
        }}
      />
      {/* Clean inner shadow for recessed screen */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3), inset 0 0 40px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          zIndex: 12,
          borderRadius: 6,
        }}
      />
      {/* Subtle vignette - IBM monitors had very even illumination */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
          zIndex: 13,
          borderRadius: 6,
        }}
      />
    </>
  );
}

function StockRow({ children, isLast, hasGreenSignal, hasYellowSignal, compact, isMobile, booted }) {
  const h = compact ? 42 : 48;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: isLast ? 'none' : `1px solid ${COLORS.dimmer}`,
        height: h,
        minHeight: h,
        maxHeight: h,
        backgroundColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Green signal highlight — tight phosphor glow sweeping left-to-right */}
      {hasGreenSignal && booted && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '-60%',
          width: '60%',
          background: 'radial-gradient(ellipse 80% 100% at center, rgba(51,255,102,0.55) 0%, rgba(51,255,102,0.20) 30%, transparent 55%)',
          animation: 'sp1000greenSweep 3s ease-in-out infinite',
          filter: 'brightness(1.8)',
          pointerEvents: 'none',
        }} />
      )}
      {/* Yellow signal highlight — phosphor glow sweeping left-to-right, matching green intensity */}
      {hasYellowSignal && !hasGreenSignal && booted && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '-60%',
          width: '60%',
          background: 'radial-gradient(ellipse 80% 100% at center, rgba(255,204,0,0.38) 0%, rgba(255,204,0,0.14) 30%, transparent 55%)',
          animation: 'sp1000yellowSweep 3s ease-in-out infinite',
          filter: 'brightness(1.35)',
          pointerEvents: 'none',
        }} />
      )}
      {children}
    </div>
  );
}

function FrontFace({ stocks, today, loading, limitReached, lastSynced, showSyncTime, ivEditMode, onToggleIVEdit, onStockChange, booted, onSignalOverlayChange, signalCloseRef }) {
  // Detect mobile screen
  const [isMobile, setIsMobile] = useState(false);
  // Selected stock for explanation overlay
  const [selectedStock, setSelectedStock] = useState(null);

  // Notify parent when signal overlay opens/closes
  useEffect(() => {
    if (onSignalOverlayChange) onSignalOverlayChange(!!selectedStock);
  }, [selectedStock, onSignalOverlayChange]);

  // Expose close function to parent via ref
  useEffect(() => {
    if (signalCloseRef) signalCloseRef.current = () => setSelectedStock(null);
  }, [signalCloseRef]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 700);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cellBase = {
    fontFamily: MONO,
    fontSize: isMobile ? 15 : 18,
    fontWeight: 500,
    padding: isMobile ? '0 4px' : '0 8px',
    whiteSpace: 'nowrap',
    textShadow: '0 0 1px rgba(200,255,200,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Format last synced time
  const formatSyncTime = (date) => {
    if (!date) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[date.getMonth()]} ${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: COLORS.screen,
        borderRadius: 6,
        padding: isMobile ? '12px 12px 10px' : '18px 24px 30px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? 8 : 16,
          paddingBottom: isMobile ? 4 : 8,
          borderBottom: '1px solid #222',
          fontFamily: MONO,
          fontSize: isMobile ? 13 : 15,
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: COLORS.green, letterSpacing: 5, fontSize: isMobile ? 14 : 16, textShadow: '0 0 8px rgba(51,255,102,0.4), 0 0 20px rgba(51,255,102,0.15)' }}>
            LEAPS TERMINAL
          </span>
          {/* Loading indicator moved to REFRESH button location */}
          {limitReached && !loading && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: 1,
                color: COLORS.amber,
                border: `1px solid ${COLORS.amber}`,
                borderRadius: 8,
                padding: '2px 8px',
                marginLeft: 10,
                lineHeight: '16px',
                opacity: 0.8,
              }}
            >
              API LIMIT
            </span>
          )}
        </div>
        {/* Last synced timestamp - fades in/out on update */}
        <span
          style={{
            color: COLORS.dim,
            fontSize: 11,
            letterSpacing: 1,
            opacity: showSyncTime ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          SYNCED {formatSyncTime(lastSynced)}
        </span>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.dimmer}`, paddingBottom: isMobile ? 6 : 10, marginBottom: isMobile ? 4 : 8, position: 'relative', zIndex: 20 }}>
        {/* Empty spacer for signal + SYM columns (32 + 70 + padding) */}
        <div style={{ width: isMobile ? 72 : 134, flexShrink: 0 }} />
        {/* PRICE/52W header */}
        <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: isMobile ? 10 : 11, letterSpacing: 2, color: COLORS.dim }}>
          PRICE/52W
        </div>
        {/* IV header - invisible button to toggle edit mode */}
        <div
          onClick={onToggleIVEdit}
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: MONO,
            fontSize: isMobile ? 10 : 11,
            letterSpacing: 2,
            color: ivEditMode ? COLORS.amber : COLORS.dim,
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'color 0.2s ease',
            textShadow: ivEditMode ? '0 0 8px rgba(255,204,0,0.5)' : 'none',
          }}
        >
          IV{ivEditMode ? ' ✎' : ''}
        </div>
        {/* DTQ/ER header - hidden on mobile */}
        {!isMobile && (
          <div style={{ flex: 0.6, textAlign: 'center', fontFamily: MONO, fontSize: isMobile ? 10 : 11, letterSpacing: 2, color: COLORS.dim }}>
            DTQ/ER
          </div>
        )}
        {/* PERIOD header */}
        <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: isMobile ? 10 : 11, letterSpacing: 2, color: COLORS.dim }}>
          PERIOD
        </div>
      </div>

      <div style={{ overflow: 'hidden', position: 'relative', zIndex: 20, opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        {stocks.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLORS.green, fontFamily: MONO, fontSize: 11, letterSpacing: 3, opacity: 0.6 }}>
            ACQUIRING DATA...
          </div>
        )}
        {[...stocks].sort((a, b) => a.sym.localeCompare(b.sym)).map((stock, idx, sortedArr) => {
          const periodInfo = calcPeriod(today, stock);
          const gaugeInfo = calcGauge(stock.price, stock.w52h, stock.w52l);
          const daysToQtr = daysBetween(today, stock.qtrEnd);
          const daysToEarn = daysBetween(today, stock.nextEarn);
          const ic = ivColor(stock.iv);

          // Detect crisis mode (rapid drawdown >8% in 7 trading days)
          const drawdown = detectDrawdownMode(stock);
          const sig = calcSignalData(stock.price, stock.w52h, stock.w52l, stock.iv, periodInfo.period, drawdown.mode);

          // Debug: log signal calculations
          const floorReason = sig.floor1 ? 'nearLow' : sig.floor3 ? 'CRISIS' : '';
          console.log(`[Signal] ${stock.sym}: ${sig.pctAboveLow.toFixed(0)}% above low, ${sig.pctBelowHigh.toFixed(0)}% below high, 5d=${drawdown.pctChange.toFixed(1)}% ${drawdown.mode} | price=${sig.priceScore} high=${sig.nearHighPenalty} crisis=${sig.crisisBonus} period=${sig.periodBonus} = ${sig.rawScore}${floorReason ? ` (floor:${floorReason}→2)` : ''} → ${sig.score}`);

          // Tier 2 stocks only show GREEN signals
          const isTier2 = stock.tier === 2;
          const isGreenSig = sig.score >= 3;
          // YELLOW only shown for Tier 1 stocks
          const isYellowSig = !isTier2 && sig.score === 2;
          // Find original index for onStockChange
          const origIdx = stocks.indexOf(stock);
          return (
            <React.Fragment key={stock.sym}>
              <StockRow isLast={idx === sortedArr.length - 1} hasGreenSignal={isGreenSig} hasYellowSignal={isYellowSig} compact={isMobile} isMobile={isMobile} booted={booted}>
                <div
                  onClick={() => setSelectedStock({ stock, sig, periodInfo, drawdown })}
                  style={{ ...cellBase, width: isMobile ? 20 : 32, flexShrink: 0, padding: 0, cursor: 'pointer' }}
                >
                  <SignalLight sig={sig} tier={isTier2 ? 2 : 1} />
                </div>
                <div
                  onClick={() => setSelectedStock({ stock, sig, periodInfo, drawdown })}
                  style={{ ...cellBase, width: isMobile ? 48 : 70, flexShrink: 0, justifyContent: 'flex-start', cursor: 'pointer' }}
                >
                  <SymbolDisplay sym={stock.sym} />
                </div>
                <div style={{ ...cellBase, flex: 1 }}>
                  <PriceGaugeCell price={stock.price} w52h={stock.w52h} w52l={stock.w52l} gaugeInfo={gaugeInfo} dividendYield={stock.dividendYield} />
                </div>
                <div style={{ ...cellBase, flex: 1 }}>
                  <IVBar iv={stock.iv} editMode={ivEditMode} onIVChange={onStockChange} stockIdx={origIdx} />
                </div>
                {!isMobile && (
                  <div style={{ ...cellBase, flex: 0.6, color: COLORS.dim, fontSize: 13 }}>
                    {daysToQtr}/{daysToEarn}
                  </div>
                )}
                <div style={{ ...cellBase, flex: 1 }}>
                  <PeriodWithClick periodInfo={periodInfo} stock={stock} today={today} />
                </div>
              </StockRow>
            </React.Fragment>
          );
        })}
      </div>

      <CRTOverlay />

      {/* Signal explanation overlay */}
      {selectedStock && (
        <SignalExplainOverlay
          stock={selectedStock.stock}
          sig={selectedStock.sig}
          periodInfo={selectedStock.periodInfo}
          drawdown={selectedStock.drawdown}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}

// Startup overlay — logo splash + DOS boot sequence + CRT warm-up
function StartupOverlay({ onComplete, onFadeIn }) {
  // -1=unit off (black, instant), 0=white logo (backlight fading in), 2=boot text, 2.5=boot text final frame, 3=warm-up, 4=dismissing
  const [phase, setPhase] = useState(-1);
  const logo = '/south-end-ai-logo.png';

  // Phase -1 → 0: Unit off → begin backlight fade immediately
  useEffect(() => {
    if (phase !== -1) return;
    // Start fade on next frame so the black screen renders first (CSS transition needs initial state)
    const raf = requestAnimationFrame(() => setPhase(0));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Phase 0 → 1: Logo visible → bloom/wash-out
  useEffect(() => {
    if (phase !== 0) return;
    const timer = setTimeout(() => setPhase(1), 5500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 1 → 2: Brief hold → boot text
  useEffect(() => {
    if (phase !== 1) return;
    const timer = setTimeout(() => setPhase(2), 300);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 2 → 3: Boot text auto-advance — start green box immediately when last line appears
  // Last line (index 18): delay 18×0.35s=6.3s + 0.4s reveal = 6.7s; advance at 6.8s for instant transition
  useEffect(() => {
    if (phase !== 2) return;
    const timer = setTimeout(() => setPhase(3), 6800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 2.5 → 3: Boot text final frame → warm-up
  useEffect(() => {
    if (phase !== 2.5) return;
    const timer = setTimeout(() => setPhase(3), 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 3: Start terminal fade-in immediately, then begin overlay dismiss
  useEffect(() => {
    if (phase !== 3) return;
    // Fade terminal in right away so it's fully opaque before overlay is removed
    if (onFadeIn) onFadeIn();
    const phaseTimer = setTimeout(() => {
      setPhase(4);
    }, 1200);
    return () => { clearTimeout(phaseTimer); };
  }, [phase, onFadeIn]);

  // Phase 4: Overlay dismiss → complete (delay must be >= terminal fade duration)
  useEffect(() => {
    if (phase !== 4) return;
    const timer = setTimeout(() => onComplete(), 1600);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const handleClick = () => {
    if (phase === -1) setPhase(0);
    else if (phase === 0 || phase === 1) setPhase(2);
    else if (phase === 2) setPhase(2.5);
    else if (phase === 2.5) setPhase(3);
    else if (phase === 3 || phase === 4) onComplete();
  };

  const bootLines = [
    { text: 'SOUTH END AI' },
    { text: 'SP-1000 LEAPS TERMINAL v1.0' },
    { text: '' },
    { text: 'LOADING WATCHLIST............. 10 TICKERS' },
    { text: 'FETCHING MARKET PRICES....... OK' },
    { text: 'READING 52-WEEK RANGES....... OK' },
    { text: 'POLLING IMPLIED VOLATILITY... OK' },
    { text: 'MAPPING EARNINGS CALENDAR.... OK' },
    { text: '' },
    { text: 'COMPUTING PRICE PROXIMITY SCORES' },
    { text: 'APPLYING NEAR-HIGH PENALTY CHECK' },
    { text: 'EVALUATING EARNINGS PERIOD BONUS' },
    { text: 'RUNNING CRISIS DETECTOR (7-DAY)' },
    { text: 'ENFORCING SAFETY FLOOR OVERRIDES' },
    { text: '' },
    { text: 'CLASSIFYING TIER 1 / TIER 2 FILTERS' },
    { text: 'COMPOSITING SIGNAL: GREEN / YELLOW / DIM' },
    { text: '' },
    { text: 'LOADING LEGAL DISCLAIMERS' },
    { text: 'CONFIRMING ALL CALCULATIONS . . . READY' },
  ];

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: phase <= 1 ? '#000' : COLORS.screen,
        zIndex: 60,
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: 6,
      }}
    >
      {/* Phase -1: Unit off — pure black screen */}
      {/* Phase 0: White logo screen with CRT effects — backlight fades in */}
      {/* Phase 1: Hold before boot text */}
      {(phase === -1 || phase === 0 || phase === 1) && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          border: '3px solid #000',
        }}>
          {/* Black overlay — backlight effect: starts opaque (unit off), fades very slowly to reveal white */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000', zIndex: 10, pointerEvents: 'none',
            opacity: phase === -1 ? 1 : 0,
            transition: 'opacity 4.5s ease-in',
          }} />
          {/* CRT noise */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '150px 150px',
            opacity: 0.04, mixBlendMode: 'multiply',
            animation: 'sp1000logoFry 0.15s steps(4) infinite',
            pointerEvents: 'none',
          }} />
          {/* Logo */}
          <img src={logo} alt="South End AI" style={{
            maxWidth: '70%', maxHeight: '60%', objectFit: 'contain',
            position: 'relative', zIndex: 1,
          }} />
          {/* Rolling bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '8%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.04) 30%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.04) 70%, transparent 100%)',
              animation: 'sp1000logoRollingBar 6s linear infinite',
            }} />
          </div>
          {/* Vignette */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)',
            pointerEvents: 'none', zIndex: 4,
          }} />
          {/* Chromatic aberration */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none', zIndex: 5, mixBlendMode: 'multiply',
            opacity: 0.03, animation: 'sp1000logoChroma 0.1s steps(2) infinite',
          }}>
            <div style={{ position: 'absolute', top: 0, left: -1, right: 1, bottom: 0, background: 'rgba(255,0,0,0.5)' }} />
            <div style={{ position: 'absolute', top: 0, left: 1, right: -1, bottom: 0, background: 'rgba(0,255,255,0.5)' }} />
          </div>
          {/* Flicker */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.02)', pointerEvents: 'none', zIndex: 6,
            animation: 'sp1000logoFlicker 2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Scanline overlay — visible during DOS boot phases */}
      {phase >= 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          opacity: 0.5, pointerEvents: 'none', zIndex: 1,
        }} />
      )}

      {/* Phase 2: Boot text — DOS command lines, aligned with stock row start */}
      {phase === 2 && (
        <div style={{
          padding: '54px 24px 18px',
          fontFamily: MONO, fontSize: 13, color: COLORS.green,
          textShadow: '0 0 8px rgba(51,255,102,0.5)', zIndex: 2,
        }}>
          {bootLines.map((line, i) => (
            <div key={i} style={{
              marginBottom: line.text === '' ? 6 : 2,
              overflow: 'hidden', whiteSpace: 'nowrap',
              letterSpacing: line.bold ? 4 : 1,
              fontWeight: line.bold ? 'bold' : 'normal',
              fontSize: line.bold ? 13 : 11,
              animation: line.text === '' ? 'none' : `sp1000rowReveal 0.4s ease-out ${i * 0.35}s both`,
              height: line.text === '' ? 6 : 'auto',
            }}>
              {line.text}
            </div>
          ))}
        </div>
      )}

      {/* Phase 2.5: Final frame of boot list — all lines visible, no animation */}
      {phase === 2.5 && (
        <div style={{
          padding: '54px 24px 18px',
          fontFamily: MONO, fontSize: 13, color: COLORS.green,
          textShadow: '0 0 8px rgba(51,255,102,0.5)', zIndex: 2,
        }}>
          {bootLines.map((line, i) => (
            <div key={i} style={{
              marginBottom: line.text === '' ? 6 : 2,
              overflow: 'hidden', whiteSpace: 'nowrap',
              letterSpacing: line.bold ? 4 : 1,
              fontWeight: line.bold ? 'bold' : 'normal',
              fontSize: line.bold ? 13 : 11,
              height: line.text === '' ? 6 : 'auto',
            }}>
              {line.text}
            </div>
          ))}
        </div>
      )}

      {/* Phase 3: CRT warm-up — green block outlines reveal top-down */}
      {/* Phase 4: Overlay dissolving while terminal fades in beneath */}
      {(phase === 3 || phase === 4) && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: COLORS.screen, pointerEvents: 'none', zIndex: 2,
          ...(phase === 4 ? { animation: 'sp1000overlayDismiss 1.2s ease-out forwards' } : {}),
        }}>
          {/* Content wrapper — fades out when laser hits bottom */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            animation: 'sp1000contentFadeOut 0.6s ease-in 1.68s forwards',
          }}>
            {/* Phosphor warm-up glow */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(51,255,102,0.2) 0%, transparent 70%)',
              animation: 'sp1000phosphorWarmUp 3.8s ease-out forwards',
            }} />
            {/* Early RGB scan lines */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.03) 0px, rgba(0,255,0,0.03) 1px, rgba(0,0,255,0.03) 2px, transparent 3px, transparent 4px)',
              animation: 'sp1000rgbScanlines 2s ease-out 0.2s both',
              mixBlendMode: 'screen', opacity: 0,
            }} />
            {/* RGB scan lines — after rows populate */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.03) 0px, rgba(0,255,0,0.03) 1px, rgba(0,0,255,0.03) 2px, transparent 3px, transparent 4px)',
              animation: 'sp1000rgbScanlines 2s ease-out 1.5s both',
              mixBlendMode: 'screen', opacity: 0,
            }} />
            {/* Regular scanlines */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
              opacity: 0.5,
            }} />
            {/* Terminal placeholder rows */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', padding: '18px 24px', boxSizing: 'border-box',
            }}>
              {/* Header row */}
              <div style={{
                fontFamily: MONO, fontSize: 14, color: COLORS.green, letterSpacing: 5,
                marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #222',
                overflow: 'hidden', whiteSpace: 'nowrap',
                animation: 'sp1000topDownReveal 0.6s ease-out 0.1s both',
                textShadow: '0 0 8px rgba(51,255,102,0.4)',
              }}>
                LEAPS TERMINAL
              </div>
              {/* Data rows — green blocks only, 4 chars per column */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} style={{
                  height: 48, borderBottom: i < 10 ? `1px solid ${COLORS.dimmer}` : 'none',
                  display: 'flex', alignItems: 'center', overflow: 'hidden',
                }}>
                  <div style={{
                    fontFamily: MONO, fontSize: 16, color: COLORS.green, letterSpacing: 1,
                    animation: `sp1000topDownReveal 0.4s ease-out ${0.3 + i * 0.08}s both`,
                    textShadow: '0 0 6px rgba(51,255,102,0.3)',
                    display: 'flex', alignItems: 'center', width: '100%',
                  }}>
                    <span style={{ width: 32, flexShrink: 0 }} />
                    <span style={{ width: 58, flexShrink: 0 }}>{'████'}</span>
                    <span style={{ flex: 1.2, textAlign: 'center' }}>{'████'}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{'████'}</span>
                    <span style={{ flex: 0.6, textAlign: 'center' }}>{'████'}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{'████'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Horizontal laser sweep */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.9) 40%, rgba(51,255,102,1) 50%, rgba(255,255,255,0.9) 60%, transparent 100%)',
            boxShadow: '0 0 30px 15px rgba(51,255,102,0.6), 0 0 60px 30px rgba(51,255,102,0.3)',
            animation: 'sp1000laserSweep 1.38s ease-in-out 0.3s forwards',
            opacity: 0,
          }} />
        </div>
      )}
    </div>
  );
}

// Logo display - title card fade in/out like a video game splash
function WhiteFlashOverlay({ active, onDismiss }) {
  const [phase, setPhase] = useState(-1); // -1=hidden, 0=black hold, 1=fade-in, 2=hold, 3=fade-out, 4=crt-death

  // Single logo
  const logo = '/south-end-ai-logo.png';

  useEffect(() => {
    if (!active) {
      setPhase(-1);
      return;
    }

    // Start at phase 0 (black screen — build anticipation)
    setPhase(0);

    const timers = [];
    // Phase 1: Slow fade from black → white (after 800ms black hold)
    timers.push(setTimeout(() => setPhase(1), 800));
    // Phase 2: Hold on logo (after 2.5s fade completes at ~2.5s)
    timers.push(setTimeout(() => setPhase(2), 3300));
    // Phase 3: Fade back to black (title card fade-out after 2s hold)
    timers.push(setTimeout(() => setPhase(3), 5300));
    // Phase 4: CRT death dismiss (after 1.8s fade-out)
    timers.push(setTimeout(() => setPhase(4), 7100));

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [active]);

  // Call onDismiss after fade-to-black completes
  useEffect(() => {
    if (phase === 4) {
      const dismissTimer = setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 300);
      return () => clearTimeout(dismissTimer);
    }
  }, [phase, onDismiss]);

  // ESC to skip logo overlay
  useEffect(() => {
    if (!active) return;
    const handler = (e) => { if (e.key === 'Escape' && onDismiss) onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onDismiss]);

  // Click/tap anywhere to dismiss
  const handleClick = () => {
    if (onDismiss) onDismiss();
  };

  if (!active || phase === -1) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      pointerEvents: 'auto',
      overflow: 'hidden',
      borderRadius: 6,
      cursor: phase >= 1 ? 'pointer' : 'default',
    }}>
      {/* White panel with logo - click to dismiss */}
      <div
        onClick={handleClick}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: phase === 4 ? 'scaleY(0)' : 'none',
          animation: phase === 4 ? 'sp1000logoBrightnessPop 0.4s ease-out forwards' : 'none',
          transition: phase === 4
            ? 'transform 0.3s ease-in'
            : 'none',
          transformOrigin: 'center center',
          boxSizing: 'border-box',
          border: '3px solid #000',
        }}
      >
        {/* Black overlay — backlight effect: starts black, slowly reveals white */}
        {phase < 4 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: phase === 0 ? 1 : phase === 3 ? 1 : 0,
            transition: phase === 3
              ? 'opacity 1.8s ease-in'
              : 'opacity 2.5s ease-in-out',
          }} />
        )}
        {/* CRT fry/static noise overlay on background - active while logo visible */}
        {phase >= 1 && phase < 4 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '150px 150px',
            opacity: 0.04,
            mixBlendMode: 'multiply',
            animation: 'sp1000logoFry 0.15s steps(4) infinite',
            pointerEvents: 'none',
          }} />
        )}
        {/* Logo - stays visible during CRT death, collapses with panel */}
        <img
          src={logo}
          alt="South End AI"
          style={{
            maxWidth: '70%',
            maxHeight: '60%',
            objectFit: 'contain',
            position: 'relative',
            zIndex: 1,
            animation: phase === 4 ? 'sp1000logoShake 0.08s linear 3' : 'none',
          }}
        />
        {/* Rolling horizontal bar artifact */}
        {phase >= 1 && phase < 4 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 3,
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '8%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.04) 30%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.04) 70%, transparent 100%)',
              animation: 'sp1000logoRollingBar 6s linear infinite',
              pointerEvents: 'none',
            }} />
          </div>
        )}
        {/* CRT vignette - darker corners */}
        {phase >= 1 && phase < 4 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)',
            pointerEvents: 'none',
            zIndex: 4,
          }} />
        )}
        {/* Chromatic aberration overlay - subtle RGB shift */}
        {phase >= 1 && phase < 4 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 5,
            mixBlendMode: 'multiply',
            opacity: 0.03,
            animation: 'sp1000logoChroma 0.1s steps(2) infinite',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: -1,
              right: 1,
              bottom: 0,
              background: 'rgba(255,0,0,0.5)',
            }} />
            <div style={{
              position: 'absolute',
              top: 0,
              left: 1,
              right: -1,
              bottom: 0,
              background: 'rgba(0,255,255,0.5)',
            }} />
          </div>
        )}
        {/* Flicker effect on whole panel */}
        {phase >= 1 && phase < 4 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.02)',
            pointerEvents: 'none',
            zIndex: 6,
            animation: 'sp1000logoFlicker 2s ease-in-out infinite',
          }} />
        )}
        {/* CRT horizontal collapse line during death - inside pane to respect borders */}
        {phase === 4 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: 4,
            backgroundColor: '#fff',
            boxShadow: '0 0 40px 20px rgba(255,255,255,1), 0 0 80px 40px rgba(255,255,255,0.8)',
            animation: 'sp1000logoCrtLine 0.5s ease-out forwards',
            zIndex: 10,
          }} />
        )}
      </div>
    </div>
  );
}

function TimeMachineDateInput({ onSubmit, onCancel }) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');
  const yearRef = React.useRef(null);
  const monthRef = React.useRef(null);
  const dayRef = React.useRef(null);

  // Default to one year ago
  useEffect(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    setYear(String(d.getFullYear()));
    setMonth(String(d.getMonth() + 1).padStart(2, '0'));
    setDay(String(d.getDate()).padStart(2, '0'));
    if (yearRef.current) yearRef.current.focus();
  }, []);

  // ESC to cancel
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { resetViewport(); onCancel(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Pin body to prevent iOS keyboard from shifting viewport
  useEffect(() => {
    const scrollY = window.scrollY;
    const origStyle = document.body.style.cssText;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.style.cssText = origStyle;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Reset viewport after mobile keyboard dismissal
  const resetViewport = () => {
    if (document.activeElement) document.activeElement.blur();
    window.scrollTo(0, 0);
    // iOS sometimes needs a delayed nudge after keyboard animates away
    setTimeout(() => window.scrollTo(0, 0), 100);
    setTimeout(() => window.scrollTo(0, 0), 300);
  };

  const handleSubmit = () => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      setError('INVALID DATE FORMAT');
      return;
    }
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const dateObj = new Date(dateStr);
    const today = new Date();
    if (dateObj >= today) {
      setError('DATE MUST BE IN THE PAST');
      return;
    }
    const earliest = new Date();
    earliest.setFullYear(earliest.getFullYear() - 10);
    earliest.setMonth(earliest.getMonth() + 3); // Need ~252 days lookback
    if (dateObj < earliest) {
      const rangeStart = earliest.toISOString().slice(0, 7);
      const rangeEnd = today.toISOString().slice(0, 7);
      setError(`OUTSIDE RANGE: ${rangeStart} \u2013 ${rangeEnd}`);
      return;
    }
    setError('');
    resetViewport();
    onSubmit(dateStr);
  };

  const segmentStyle = {
    background: '#0a0a0a',
    border: '1px solid #333',
    color: COLORS.green,
    fontFamily: MONO,
    fontSize: 22,
    textAlign: 'center',
    padding: '8px 4px',
    outline: 'none',
    caretColor: COLORS.green,
    textShadow: '0 0 8px rgba(51,255,102,0.4)',
    letterSpacing: 2,
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Tab') return; // natural tab behavior
  };

  const handleYearChange = (v) => {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    setYear(clean);
    if (clean.length === 4 && monthRef.current) monthRef.current.focus();
  };

  const handleMonthChange = (v) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setMonth(clean);
    if (clean.length === 2 && dayRef.current) dayRef.current.focus();
  };

  const handleDayChange = (v) => {
    setDay(v.replace(/\D/g, '').slice(0, 2));
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) { resetViewport(); onCancel(); } }}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 100,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        borderRadius: 6,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 11, color: COLORS.amber, letterSpacing: 3, marginBottom: 20, textShadow: '0 0 8px rgba(255,170,0,0.4)' }}>
        DESTINATION TIME
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input ref={yearRef} inputMode="numeric" value={year} onChange={(e) => handleYearChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'year')} style={{ ...segmentStyle, width: 80 }} placeholder="YYYY" />
        <span style={{ color: COLORS.dim, fontFamily: MONO, fontSize: 22 }}>/</span>
        <input ref={monthRef} inputMode="numeric" value={month} onChange={(e) => handleMonthChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'month')} style={{ ...segmentStyle, width: 48 }} placeholder="MM" />
        <span style={{ color: COLORS.dim, fontFamily: MONO, fontSize: 22 }}>/</span>
        <input ref={dayRef} inputMode="numeric" value={day} onChange={(e) => handleDayChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'day')} style={{ ...segmentStyle, width: 48 }} placeholder="DD" />
      </div>

      {(() => {
        const e = new Date(); e.setFullYear(e.getFullYear() - 10); e.setMonth(e.getMonth() + 3);
        return (
          <div style={{ fontFamily: MONO, fontSize: 9, color: COLORS.dim, letterSpacing: 1, marginBottom: 8 }}>
            RANGE: {e.toISOString().slice(0, 7)} {'\u2013'} {new Date().toISOString().slice(0, 7)}
          </div>
        );
      })()}

      {error && (
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#ff4444', letterSpacing: 2, marginBottom: 12, textShadow: '0 0 6px rgba(255,68,68,0.4)' }}>
          {error}
        </div>
      )}

      <div
        onClick={handleSubmit}
        style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: 3,
          color: COLORS.amber, cursor: 'pointer', padding: '8px 24px',
          border: `1px solid ${COLORS.amber}`, borderRadius: 2,
          textShadow: '0 0 8px rgba(255,170,0,0.4)',
          transition: 'all 0.2s ease',
          marginTop: 8,
        }}
      >
        ENGAGE
      </div>

      <div style={{ fontFamily: MONO, fontSize: 9, color: COLORS.dim, marginTop: 20, letterSpacing: 1 }}>
        ESC TO CANCEL
      </div>
    </div>
  );
}

function WormholeTransition({ active, onComplete }) {
  const [phase, setPhase] = useState(-1);
  const [fadeIn, setFadeIn] = useState(1); // 1 = fully opaque overlay, fades to 0
  const canvasRef = React.useRef(null);
  const animRef = React.useRef(null);

  useEffect(() => {
    if (active) {
      setPhase(0);
      setFadeIn(1);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setPhase(-1);
      setFadeIn(1);
    }
  }, [active]);

  // ESC to skip wormhole animation
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        if (onComplete) onComplete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onComplete]);

  useEffect(() => {
    if (phase < 0) return;
    const timers = [];

    if (phase === 0) {
      // Trigger fade-in after a microtask so CSS transition picks up
      requestAnimationFrame(() => setFadeIn(0));
      timers.push(setTimeout(() => setPhase(1), 100));
    } else if (phase === 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // High-DPI: scale canvas buffer to device pixel ratio for crystal clear rendering
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const cx = w / 2;
      const cy = h / 2;
      const startTime = Date.now();
      const duration = 1800; // Shorter — flash comes in sooner
      // Scale star count with resolution for consistent density
      const numStars = Math.max(500, Math.round(400 * dpr));

      // Pre-generate stars in 3D space — pure white only
      const stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: (Math.random() - 0.5) * w * 4,
          y: (Math.random() - 0.5) * h * 4,
          z: Math.random() * 1200 + 50,
          baseSize: (0.2 + Math.random() * 0.6) * dpr,
        });
      }

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth ease-in-out acceleration
        const speed = progress < 0.2
          ? progress * progress * 25
          : progress < 0.6
            ? 1 + (progress - 0.2) * 7
            : 3 + (progress - 0.6) * 25;

        // Stars stay at full brightness — flash cuts in directly over the starfield
        const dimFactor = 1;

        // Deep black with motion blur
        const trail = speed > 2 ? 0.2 : 0.35;
        ctx.fillStyle = `rgba(0, 0, 0, ${trail})`;
        ctx.fillRect(0, 0, w, h);

        // Move and draw stars
        for (const star of stars) {
          const prevZ = star.z;
          star.z -= speed * 18;

          if (star.z <= 0) {
            star.x = (Math.random() - 0.5) * w * 4;
            star.y = (Math.random() - 0.5) * h * 4;
            star.z = 1000 + Math.random() * 400;
            continue;
          }

          // 3D perspective projection
          const sx = cx + (star.x / star.z) * (w * 0.5);
          const sy = cy + (star.y / star.z) * (h * 0.5);

          if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;

          const depth = 1 - Math.min(star.z / 1200, 1);
          const radius = star.baseSize * (0.3 + depth * 2.5);
          const alpha = (0.2 + depth * 0.8) * dimFactor;

          if (alpha < 0.01) continue;

          // Pure white stars
          const c = Math.round(255 * dimFactor);

          // Glow for close stars
          if (depth > 0.5 && radius > 1 && dimFactor > 0.2) {
            const glowR = radius * 2.0;
            const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
            glow.addColorStop(0, `rgba(${c}, ${c}, ${c}, ${alpha * 0.15})`);
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(sx - glowR, sy - glowR, glowR * 2, glowR * 2);
          }

          // Star core
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.5, radius), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${c}, ${c}, ${c}, ${alpha})`;
          ctx.fill();

          // Streaks at speed — crisp anti-aliased lines
          if (speed > 1 && dimFactor > 0.1) {
            const prevSx = cx + (star.x / prevZ) * (w * 0.5);
            const prevSy = cy + (star.y / prevZ) * (h * 0.5);
            const streakAlpha = Math.min(0.5, (speed - 1) * 0.12) * depth * dimFactor;

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(prevSx, prevSy);
            ctx.strokeStyle = `rgba(${c}, ${c}, ${c}, ${streakAlpha})`;
            ctx.lineWidth = Math.max(0.5, radius * 0.7);
            ctx.stroke();
          }
        }

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          timers.push(setTimeout(() => setPhase(2), 30));
        }
      };

      // Clear canvas fully on first frame
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      animRef.current = requestAnimationFrame(animate);
    } else if (phase === 2) {
      // Flash plays for 0.5s — fire onComplete after flash finishes
      timers.push(setTimeout(() => {
        if (onComplete) onComplete();
      }, 500));
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase, onComplete]);

  if (!active) return null;

  const handleWormholeClick = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (onComplete) onComplete();
  };

  return (
    <div onClick={handleWormholeClick} style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'transparent', zIndex: 100, borderRadius: 6, overflow: 'hidden',
      cursor: 'pointer',
    }}>
      {/* Starfield layer — fades in from transparent over the TM results */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000',
        opacity: 1 - fadeIn,
        transition: 'opacity 0.8s ease-in',
        pointerEvents: 'none',
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: phase === 2 ? 'none' : 'block',
          }}
        />
      </div>
      {/* HDR white flash — maximum OLED brightness */}
      {phase === 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'color(display-p3 1.2 1.2 1.2)', backgroundColor: '#fff',
          zIndex: 4, pointerEvents: 'none',
          animation: 'sp1000wormholeFlash 0.5s ease-out forwards',
        }} />
      )}
    </div>
  );
}

function TimeMachineTransition({ active, targetDate, fromDate, onComplete, blueprintContent, skipRef, skipFlash }) {
  const [phase, setPhase] = useState(-1);
  const [displayDate, setDisplayDate] = useState('');
  const blueprintRef = React.useRef(null);
  const [countProgress, setCountProgress] = useState(0);

  // Expose skip function so parent can skip to results
  useEffect(() => {
    if (skipRef) {
      skipRef.current = () => {
        if (blueprintRef.current) {
          blueprintRef.current.style.opacity = '1';
        }
        setPhase(2);
      };
    }
    return () => { if (skipRef) skipRef.current = null; };
  }, [skipRef]);

  useEffect(() => {
    if (!active) { setPhase(-1); setDisplayDate(''); return; }
    setPhase(0);
  }, [active]);

  // Phase transitions
  useEffect(() => {
    if (phase < 0) return;
    const timers = [];
    let rafId = null;
    let cancelled = false;

    if (phase === 0) {
      // Init — brief pause before countdown starts
      timers.push(setTimeout(() => setPhase(1), 300));
    } else if (phase === 1) {
      // Flux capacitor: count from start date to target date
      // When fromDate is provided (nav between results), count from that date
      // Otherwise count from today (initial time travel)
      if (!targetDate) return; // guard: wait for targetDate to be set
      const startDate = fromDate ? new Date(fromDate + 'T00:00:00') : new Date();
      const target = new Date(targetDate + 'T00:00:00');
      const totalDays = Math.round((startDate - target) / (1000 * 60 * 60 * 24));
      const absDays = Math.abs(totalDays);
      const duration = Math.min(4000, Math.max(800, absDays * 8)); // Scale with distance, snappy for nearby dates
      const startTime = Date.now();

      const tick = () => {
        if (cancelled) return;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-in cubic — starts slow, accelerates rapidly
        const eased = progress * progress * progress;
        const daysDelta = Math.floor(eased * totalDays);
        const d = new Date(startDate);
        d.setDate(d.getDate() - daysDelta);
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const m = d.getMonth();
        if (isNaN(m)) return; // guard against invalid date during state transitions
        setDisplayDate(`${months[m]} ${String(d.getDate()).padStart(2,'0')} ${d.getFullYear()}`);
        setCountProgress(progress);

        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else if (skipFlash) {
          // Arrow navigation — no flash, hand off to external overlay immediately
          if (onComplete) onComplete();
        } else {
          // Go straight to flash — blueprint will be revealed behind it
          setPhase(2);
        }
      };
      rafId = requestAnimationFrame(tick);
    } else if (phase === 2) {
      // Flash is now covering the screen — reveal blueprint behind it
      rafId = requestAnimationFrame(() => {
        if (!cancelled && blueprintRef.current) {
          blueprintRef.current.style.opacity = '1';
        }
      });
      // Wait for flash to fully fade before firing onComplete
      timers.push(setTimeout(() => {
        if (onComplete) onComplete();
      }, 1100));
    }

    return () => {
      cancelled = true;
      timers.forEach(t => clearTimeout(t));
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [phase, targetDate, fromDate, onComplete, skipFlash]);

  if (!active && phase < 0) return null;

  // Click to skip animation — jump straight to HDR flash (blueprint revealed in phase 2 effect)
  const handleSkipClick = () => {
    if (phase === 0 || phase === 1) {
      setPhase(2);
    }
  };

  return (
    <div
      onClick={handleSkipClick}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000', zIndex: 100, borderRadius: 6, overflow: 'hidden',
        cursor: phase <= 1 ? 'pointer' : 'default',
      }}
    >
      {/* Blueprint content fading in behind the clock */}
      <div ref={blueprintRef} style={{
        opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
      }}>
        {blueprintContent}
      </div>

      {/* Countdown clock — centered, black bg prevents blueprint bleed-through */}
      {(phase === 0 || phase === 1) && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2,
          backgroundColor: '#000', pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: MONO, fontSize: 28, color: COLORS.amber, letterSpacing: 4,
            textShadow: '0 0 12px rgba(255,170,0,0.8), 0 0 30px rgba(255,170,0,0.4)',
          }}>
            {displayDate || '--- -- ----'}
          </div>
        </div>
      )}

      {/* Bright HDR flash when clock reaches target — fades to reveal pre-rendered blueprint */}
      {phase === 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'color(display-p3 1.5 1.5 1.5)', backgroundColor: '#fff', zIndex: 3,
          animation: 'sp1000tmFlash 1s ease-out forwards',
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 200px rgba(255,255,255,1), 0 0 100px 50px rgba(255,255,255,0.8)',
        }} />
      )}
    </div>
  );
}

function TimeMachineBlueprintOverlay({ stocks, historicalDate, onReturn, onEnterNewDate, loading, benchmarkReturn, onNavigate, signalDatesIndex }) {
  if (!stocks || stocks.length === 0) return null;

  // Compute signals for each stock at the historical date
  const signalResults = stocks.map(stock => {
    const periodInfo = calcPeriod(historicalDate, stock);
    const period = periodInfo.period;
    const drawdownMode = stock.drawdownMode || 'NORMAL';
    const sig = calcSignalData(stock.price, stock.w52h, stock.w52l, stock.iv, period, drawdownMode);

    const isTier2 = stock.tier === 2;
    const isGreen = sig.score >= 3;
    const isYellow = !isTier2 && sig.score === 2;

    return { stock, sig, periodInfo, isGreen, isYellow, isTier2 };
  });

  const greenSignals = signalResults.filter(r => r.isGreen);
  const yellowSignals = signalResults.filter(r => r.isYellow);

  // avgReturn helper removed — combined average computed below in signalSection

  // Format the date for display
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = new Date(historicalDate);
  const dateDisplay = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  // Compute portfolio average and alpha
  const allSignals = [...greenSignals, ...yellowSignals];
  const portfolioAvg = allSignals.length > 0
    ? allSignals.reduce((sum, r) => sum + r.stock.historicalReturn, 0) / allSignals.length
    : null;
  const hasBenchmark = benchmarkReturn !== null && benchmarkReturn !== undefined;
  const alpha = hasBenchmark && portfolioAvg !== null ? portfolioAvg - benchmarkReturn : null;
  const alphaColor = alpha !== null ? (alpha >= 0 ? COLORS.green : '#ff4444') : COLORS.dim;
  const portfolioColor = portfolioAvg !== null ? (portfolioAvg >= 0 ? COLORS.green : '#ff4444') : COLORS.dim;
  const benchColor = '#fff';

  // Sparkline — simple SVG price chart
  const Sparkline = ({ data, color, width = 120, height = 32 }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
    );
  };

  // Signal card — tall rounded rectangle with vertical stack
  const signalCard = (result) => {
    const { stock, sig, isGreen } = result;
    const returnPct = stock.historicalReturn;
    const returnColor = returnPct >= 0 ? COLORS.green : '#ff4444';
    const signalColor = isGreen ? COLORS.green : COLORS.amber;
    const signalLabel = isGreen ? 'GREEN' : 'YELLOW';

    return (
      <div key={stock.sym} style={{
        border: `1px solid ${signalColor}55`,
        borderRadius: 8,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.015)',
        boxShadow: `0 0 8px ${signalColor}15, inset 0 0 8px ${signalColor}08`,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minWidth: 0,
        overflow: 'hidden',
      }}>
        {/* Stock symbol — large */}
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#fff', letterSpacing: 2, fontWeight: 'bold' }}>
          {stock.sym}
        </div>
        {/* Price on date */}
        <div style={{ fontFamily: MONO, fontSize: 7, color: COLORS.dim, letterSpacing: 1 }}>
          PRICE ${stock.price.toFixed(2)}
        </div>
        {/* NOW price */}
        <div style={{ fontFamily: MONO, fontSize: 7, color: COLORS.dim, letterSpacing: 1 }}>
          NOW ${stock.currentPrice.toFixed(2)}
        </div>
        {/* Return % — prominent */}
        <div style={{
          fontFamily: MONO, fontSize: 13, color: returnColor, fontWeight: 'bold',
          textShadow: `0 0 8px ${returnColor}44`,
          marginTop: 2,
        }}>
          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
        </div>
        {/* Sparkline chart — price from signal date to now */}
        {stock.chartData && stock.chartData.length >= 2 && (
          <div style={{ margin: '4px 0 2px', opacity: 0.9 }}>
            <Sparkline data={stock.chartData} color={returnColor} />
          </div>
        )}
        {/* Separator */}
        <div style={{ height: 1, background: `${signalColor}33`, margin: '4px 0' }} />
        {/* Score badge */}
        <div style={{ fontFamily: MONO, fontSize: 7, color: signalColor, letterSpacing: 1 }}>
          {signalLabel} {sig.score}
        </div>
      </div>
    );
  };

  // Combined signal grid — all GREEN and YELLOW cards in one row
  const signalGrid = (allSigs) => {
    if (allSigs.length === 0) return null;
    // Use fixed equal columns — 1fr ensures all cards are same width and aligned
    const cols = Math.min(allSigs.length, 3);
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: MONO, fontSize: 7, color: COLORS.dim, letterSpacing: 3, marginBottom: 8,
        }}>
          SIGNALS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 8,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {allSigs.map((r) => signalCard(r))}
        </div>
      </div>
    );
  };

  // Combined average return of all signals (green + yellow)
  const combinedAvg = allSignals.length > 0
    ? allSignals.reduce((sum, r) => sum + r.stock.historicalReturn, 0) / allSignals.length
    : null;
  const combinedAvgColor = combinedAvg !== null ? (combinedAvg >= 0 ? COLORS.green : '#ff4444') : COLORS.dim;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0a0a0a', zIndex: 100, borderRadius: 6,
      overflowX: 'hidden', overflowY: 'auto',
    }}>
      {/* Subtle CRT scanline overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{ padding: '18px 20px', position: 'relative', zIndex: 2, maxWidth: 680, margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{
          fontFamily: MONO, fontSize: 9, color: COLORS.amber, letterSpacing: 4,
          textAlign: 'center', marginBottom: 6,
          animation: 'sp1000tmHeaderPulse 3s ease-in-out infinite',
        }}>
          TIME MACHINE: {dateDisplay}
        </div>
        <div style={{
          height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.amber}44, transparent)`,
          marginBottom: 16,
        }} />

        {loading && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: COLORS.amber, textAlign: 'center', letterSpacing: 2, padding: 40 }}>
            COMPUTING HISTORICAL SIGNALS...
          </div>
        )}

        {!loading && greenSignals.length === 0 && yellowSignals.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 20px 18px', margin: '12px 16px',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#ffffff', letterSpacing: 3, marginBottom: 14, textShadow: '0 0 8px rgba(255,255,255,0.3)' }}>
              NO SIGNAL DETECTED
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: '#ffffff', lineHeight: 2.0, maxWidth: 420, margin: '0 auto', textAlign: 'justify', padding: '0 12px', textIndent: 0 }}>
              On this date, the <span style={{ color: COLORS.green }}>SP-1000 LEAPS TRACKER</span> did not produce a signal. The system is designed to identify high-conviction conditions, not continuous trading activity. Favorable conditions must align across price position, drawdown velocity, and the corporate calendar before the system activates.
            </div>
            {hasBenchmark && (
              <div style={{ fontFamily: MONO, fontSize: 8, color: '#888', letterSpacing: 2, marginTop: 18 }}>
                S&P 500 RETURN: <span style={{ color: COLORS.green, letterSpacing: 1 }}>{benchmarkReturn >= 0 ? '+' : ''}{benchmarkReturn.toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Combined Average Return hero box */}
        {!loading && combinedAvg !== null && (
          <div style={{
            border: `1px solid ${combinedAvgColor}55`,
            borderRadius: 8,
            padding: '12px 16px',
            marginTop: 4,
            marginBottom: 14,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.015)',
            boxShadow: `0 0 12px ${combinedAvgColor}15, inset 0 0 12px ${combinedAvgColor}08`,
          }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, color: '#fff', letterSpacing: 4, marginBottom: 10,
              textShadow: '0 0 6px rgba(255,255,255,0.15)',
            }}>
              AVERAGE RETURN OF SIGNALS
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 19, color: combinedAvgColor, fontWeight: 'bold', letterSpacing: 2,
              textShadow: `0 0 12px ${combinedAvgColor}88, 0 0 24px ${combinedAvgColor}44`,
            }}>
              {combinedAvg >= 0 ? '+' : ''}{combinedAvg.toFixed(1)}%
            </div>
          </div>
        )}

        {/* Signal Grid — GREEN and YELLOW cards in one row */}
        {!loading && signalGrid(allSignals)}

        {/* Performance Delta */}
        {!loading && (greenSignals.length > 0 || yellowSignals.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: MONO, fontSize: 7, color: COLORS.dim, letterSpacing: 3, marginBottom: 8,
            }}>
              PERFORMANCE DELTA
            </div>
            <div style={{
              border: `1px solid ${alphaColor}66`,
              borderRadius: 8,
              padding: '14px 16px',
              boxShadow: `0 0 10px ${alphaColor}15, inset 0 0 10px ${alphaColor}08`,
            }}>
            {/* Tug-of-war: S&P 500 vs Alpha vs LEAPS TRACKER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {/* S&P 500 — left side */}
              <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO }}>
                <div style={{ fontSize: 7, color: COLORS.dim, letterSpacing: 2, marginBottom: 4 }}>
                  S&P 500
                </div>
                <div style={{
                  fontSize: 11, color: benchColor, letterSpacing: 1,
                  opacity: 0.7,
                }}>
                  {hasBenchmark ? `${benchmarkReturn >= 0 ? '+' : ''}${benchmarkReturn.toFixed(1)}%` : '—'}
                </div>
              </div>
              {/* Alpha — center, hero glow */}
              <div style={{ flex: 1.2, textAlign: 'center', fontFamily: MONO }}>
                <div style={{ fontSize: 7, color: COLORS.dim, letterSpacing: 3, marginBottom: 4 }}>
                  ALPHA
                </div>
                <div style={{
                  fontSize: 18, color: alphaColor, fontWeight: 'bold', letterSpacing: 2,
                  textShadow: `0 0 12px ${alphaColor}88, 0 0 24px ${alphaColor}44`,
                  filter: `drop-shadow(0 0 6px ${alphaColor}66)`,
                }}>
                  {alpha !== null ? `${alpha >= 0 ? '+' : ''}${alpha.toFixed(1)}%` : '—'}
                </div>
              </div>
              {/* LEAPS TRACKER — right side, bright with subtle sweep */}
              <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, position: 'relative' }}>
                {/* Subtle radial sweep behind LEAPS TRACKER */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '140%', height: '200%',
                  background: `radial-gradient(ellipse at center, ${portfolioColor}12 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{ fontSize: 7, color: COLORS.dim, letterSpacing: 2, marginBottom: 4, position: 'relative' }}>
                  LEAPS TRACKER
                </div>
                <div style={{
                  fontSize: 11, color: portfolioColor, fontWeight: 'bold', letterSpacing: 1,
                  textShadow: `0 0 10px ${portfolioColor}88, 0 0 20px ${portfolioColor}44`,
                  position: 'relative',
                }}>
                  {portfolioAvg !== null ? `${portfolioAvg >= 0 ? '+' : ''}${portfolioAvg.toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>
            {/* Dual bar visualization */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 2 }}>
              {/* S&P bar — grows left from center */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                {hasBenchmark && (
                  <div style={{
                    height: 3,
                    width: `${Math.min(Math.abs(benchmarkReturn || 0), 80) / 80 * 100}%`,
                    backgroundColor: benchColor,
                    opacity: 0.5,
                    borderRadius: 1,
                    boxShadow: `0 0 4px ${benchColor}44`,
                  }} />
                )}
              </div>
              <div style={{ width: 2, height: 10, backgroundColor: COLORS.dimmer, flexShrink: 0 }} />
              {/* LEAPS TRACKER bar — grows right from center */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                {portfolioAvg !== null && (
                  <div style={{
                    height: 3,
                    width: `${Math.min(Math.abs(portfolioAvg), 80) / 80 * 100}%`,
                    backgroundColor: portfolioColor,
                    borderRadius: 1,
                    boxShadow: `0 0 6px ${portfolioColor}44`,
                  }} />
                )}
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Footer — INPUT NEW DATE + nav buttons */}
        <div style={{ marginTop: 18, marginBottom: 4 }}>
          {(() => {
            let prev = null;
            let next = null;
            let fmtDisplay = () => '';

            if (onNavigate && historicalDate && signalDatesIndex && signalDatesIndex.length > 0) {
              prev = findPrevSignalDate(signalDatesIndex, historicalDate);
              const nextRaw = findNextSignalDate(signalDatesIndex, historicalDate);
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
              const oneYearAgoStr = oneYearAgo.toISOString().slice(0, 10);
              next = nextRaw && nextRaw < oneYearAgoStr ? nextRaw : null;

              const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
              fmtDisplay = (dateStr) => {
                const d = new Date(dateStr + 'T00:00:00');
                return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
              };
            }

            const tmNavBtnStyle = {
              fontFamily: MONO, fontSize: 10, letterSpacing: 1,
              color: COLORS.amber, cursor: 'pointer',
              padding: '5px 12px',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              textShadow: '0 0 6px rgba(255,170,0,0.4)',
              transition: 'all 0.2s ease',
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                {/* Travel to new date button */}
                {onEnterNewDate && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span
                      onClick={onEnterNewDate}
                      style={{
                        fontFamily: MONO, fontSize: 9, letterSpacing: 4,
                        color: '#fff', cursor: 'pointer', padding: '5px 14px',
                        border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: 6,
                        display: 'inline-block',
                        textShadow: '0 0 6px rgba(255,255,255,0.4)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      TRAVEL TO NEW DATE
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: 7, letterSpacing: 2,
                      color: '#fff', opacity: 0.5,
                    }}>
                      2016 – 2026
                    </span>
                  </div>
                )}
                {/* Time travel navigation — back only */}
                {prev && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', padding: '0 12px', boxSizing: 'border-box' }}>
                    <span
                      onClick={() => onNavigate(prev)}
                      style={tmNavBtnStyle}
                    >
                      {'\u25C2'} JUMP BACK IN TIME
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default function Terminal({ stocks = [], today, onRefresh, loading, limitReached, onStockChange, timeMachineDate, timeMachineStocks, timeMachineLoading, onTimeMachineActivate, onReturnToPresent, benchmarkReturn, onTimeMachineNavigate, signalDatesIndex }) {
  const [glitching, setGlitching] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [showSyncTime, setShowSyncTime] = useState(false);
  const [refreshHidden, setRefreshHidden] = useState(false);
  const [ivEditMode, setIvEditMode] = useState(false);
  const [booted, setBooted] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);
  const [timeMachineInput, setTimeMachineInput] = useState(false);
  const [timeMachineAnimating, setTimeMachineAnimating] = useState(false);
  const [timeMachineTarget, setTimeMachineTarget] = useState(null);
  const [timeMachineFromDate, setTimeMachineFromDate] = useState(null);
  const [wormholeActive, setWormholeActive] = useState(false);
  const [tmFadingOut, setTmFadingOut] = useState(false);
  const [tmSkipFlash, setTmSkipFlash] = useState(false);
  const [tmNavigating, setTmNavigating] = useState(false);
  const [guideBlurred, setGuideBlurred] = useState(false);
  const [contactGag, setContactGag] = useState(false);
  const [returnSliding, setReturnSliding] = useState(false);
  const [returnSlidePop, setReturnSlidePop] = useState(false);
  const [returnDimming, setReturnDimming] = useState(false);
  const [navRevealing, setNavRevealing] = useState(false);
  const [navPopping, setNavPopping] = useState(false);
  const [navSweepKey, setNavSweepKey] = useState(0); // Increment to retrigger nav button sweep animation
  const [navSlideButton, setNavSlideButton] = useState(null); // Which nav button is sliding to center ('contact'|'guide'|'timemachine')
  const [navFlicker, setNavFlicker] = useState(false); // Electrical flicker on contact click
  const [navSurge, setNavSurge] = useState(false); // Brightness surge when SP-1000 pressed on home
  const [restartVisible, setRestartVisible] = useState(false); // Delayed reveal of RESTART during contact gag
  const [returnScreenFade, setReturnScreenFade] = useState(false); // Gentle screen fade when RETURN dismisses overlay
  const [signalOverlayOpen, setSignalOverlayOpen] = useState(false); // Signal analysis card is showing
  const signalCloseRef = React.useRef(null); // Ref to close signal overlay from toolbar

  // Clear returnSliding once the overlay conditions have resolved
  const overlayActive = !!(timeMachineDate || timeMachineAnimating || timeMachineInput || (glitching && (!guideBlurred || contactGag)));
  React.useEffect(() => {
    if (returnSliding && !overlayActive) {
      // Start SP-1000 brightness pop while RETURN is still slid right
      setReturnSlidePop(true);
      // After pop completes, switch to normal toolbar — SP-1000 dims first, then nav fades in
      // NOTE: Do NOT increment navSweepKey here. The toolbar switches from overlay→normal,
      // which remounts the nav buttons naturally — their fade-in animation plays on mount.
      // Incrementing navSweepKey would remount them AGAIN mid-fade, causing a visible blink.
      setTimeout(() => {
        setReturnSliding(false);
        setReturnSlidePop(false);
        setReturnDimming(true);
        setNavRevealing(true);
        setTimeout(() => setReturnDimming(false), 600);
        setTimeout(() => {
          setNavRevealing(false);
          setNavPopping(true);
          setTimeout(() => setNavPopping(false), 500);
        }, 800);
      }, 500);
    }
  }, [returnSliding, overlayActive]);

  const [screenRelight, setScreenRelight] = useState(false);
  const tmSkipRef = React.useRef(null);
  const [bootFade, setBootFade] = useState(false);
  const prevLoadingRef = React.useRef(loading);

  // Boot animation plays on every page load
  useEffect(() => {
    setBootChecked(true);
  }, []);

  const handleBootFadeIn = React.useCallback(() => {
    // Start terminal fade-in while overlay is still visible
    setBootFade(true);
  }, []);

  const handleBootComplete = React.useCallback(() => {
    // Overlay is fully dismissed — remove it from DOM and ensure terminal is visible
    setBootFade(true);
    setBooted(true);
  }, []);

  const triggerReturnToPresent = React.useCallback(() => {
    setWormholeActive(true);
  }, []);

  const handleWormholeComplete = React.useCallback(() => {
    setWormholeActive(false);
    setTmFadingOut(true);
    // Allow crossfade to complete before clearing TM data
    setTimeout(() => {
      setTmFadingOut(false);
      onReturnToPresent();
    }, 600);
  }, [onReturnToPresent]);

  const triggerNewDate = React.useCallback(() => {
    // Clear TM results and go straight to date input (no wormhole)
    onReturnToPresent();
    setTimeMachineInput(true);
  }, [onReturnToPresent]);

  // No-signal dates: user stays on TM screen to navigate via arrows or enter new date

  const triggerTimeMachine = React.useCallback(() => {
    if (showLogo || timeMachineAnimating || wormholeActive) return;
    // Dismiss guide if in gag phase and open time machine
    if (glitching) {
      setGlitching(false);
      setGuideBlurred(false);
      setTimeMachineInput(true);
      return;
    }
    if (timeMachineInput) { setTimeMachineInput(false); return; }
    if (timeMachineDate) {
      // Already in time machine mode — return to present via wormhole
      triggerReturnToPresent();
      return;
    }
    // Skip startup if still booting
    if (!booted) { setBooted(true); requestAnimationFrame(() => setBootFade(true)); }
    setTimeMachineInput(true);
  }, [glitching, showLogo, timeMachineAnimating, timeMachineInput, wormholeActive, timeMachineDate, triggerReturnToPresent, booted]);

  const handleDateConfirm = React.useCallback((dateStr) => {
    setTimeMachineInput(false);
    setTimeMachineTarget(dateStr);
    setTimeMachineAnimating(true);
    onTimeMachineActivate(dateStr);
  }, [onTimeMachineActivate]);

  const handleTimeMachineNav = React.useCallback((dateStr) => {
    // Arrow navigation — cycle active false→true to reset TimeMachineTransition
    const departFrom = timeMachineDate;
    // tmNavigating keeps the black underlay alive across the reset gap
    setTmNavigating(true);
    setTimeMachineAnimating(false);
    onReturnToPresent();
    // Next frame: reactivate with new target — ensures clean transition reset
    requestAnimationFrame(() => {
      setTimeMachineFromDate(departFrom);
      setTimeMachineTarget(dateStr);
      setTmSkipFlash(true);
      setTimeMachineAnimating(true);
      onTimeMachineActivate(dateStr);
    });
  }, [onReturnToPresent, onTimeMachineActivate, timeMachineDate]);

  const handleFireComplete = React.useCallback(() => {
    // Delay clearing animation state to prevent terminal flash during handoff
    requestAnimationFrame(() => {
      setTimeMachineAnimating(false);
      setTimeMachineTarget(null);
      setTimeMachineFromDate(null);
      setTmSkipFlash(false);
      setTmNavigating(false);
    });
  }, []);

  // Track when loading completes to show sync timestamp
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      // Loading just finished - update timestamp and show it
      setLastSynced(new Date());
      setShowSyncTime(true);
      setRefreshHidden(true);
      // Hide sync time after 4 seconds, then reveal refresh after a beat
      const timeout = setTimeout(() => {
        setShowSyncTime(false);
        setTimeout(() => setRefreshHidden(false), 800);
      }, 4000);
      return () => clearTimeout(timeout);
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  const triggerGlitch = () => {
    if (showLogo || timeMachineAnimating || timeMachineDate) return;
    if (timeMachineInput) setTimeMachineInput(false);
    // Skip startup if still booting
    if (!booted) { setBooted(true); requestAnimationFrame(() => setBootFade(true)); }
    // If already in gag phase, restart the guide
    if (glitching) {
      setGlitching(false);
      setGuideBlurred(false);
      requestAnimationFrame(() => setGlitching(true));
      return;
    }
    setGlitching(true);
  };

  const triggerContact = () => {
    if (showLogo || timeMachineAnimating || timeMachineDate || glitching) return;
    if (timeMachineInput) setTimeMachineInput(false);
    if (!booted) { setBooted(true); requestAnimationFrame(() => setBootFade(true)); }
    setContactGag(true);
    setRestartVisible(false);
    setGlitching(true);
    setTimeout(() => setRestartVisible(true), 3500);
  };

  const triggerLogo = () => {
    // SP-1000 is a universal "go to terminal" override
    if (!booted) {
      // Skip startup animation entirely
      setBooted(true);
      requestAnimationFrame(() => setBootFade(true));
      return;
    }
    // Dismiss any active overlay and return to terminal
    if (showLogo) { setShowLogo(false); return; }
    if (glitching) { setGlitching(false); setGuideBlurred(false); setContactGag(false); setRestartVisible(false); return; }
    if (timeMachineInput) { setTimeMachineInput(false); return; }
    if (timeMachineDate && !wormholeActive) { triggerReturnToPresent(); return; }
    // Already on main terminal — surge all buttons and relight the screen
    if (screenRelight) return;
    setNavSurge(true);
    setScreenRelight(true);
    // Clear surge after animation completes
    setTimeout(() => setNavSurge(false), 650);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        fontFamily: MONO,
      }}
    >
      <style>{`
        .sp1000-shell {
          padding-top: max(24px, env(safe-area-inset-top, 24px)) !important;
          padding-bottom: max(20px, env(safe-area-inset-bottom, 20px)) !important;
          padding-left: max(20px, env(safe-area-inset-left, 20px)) !important;
          padding-right: max(20px, env(safe-area-inset-right, 20px)) !important;
        }
        @keyframes sp1000pulse { 0%,100%{opacity:1; filter: brightness(1.3);} 50%{opacity:0.9; filter: brightness(1);} }
        @keyframes sp1000danger { 0%,100%{opacity:1; filter: brightness(1.3);} 50%{opacity:0.7; filter: brightness(0.9);} }
        @keyframes sp1000throb {
          0%, 100% { opacity: 1; filter: brightness(1.3); }
          50% { opacity: 0.9; filter: brightness(1); }
        }
        @keyframes sp1000flicker {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.02; }
          52% { opacity: 0; }
          54% { opacity: 0.01; }
          56% { opacity: 0; }
        }
        @keyframes sp1000backlightOn {
          0% { opacity: 0.3; filter: brightness(0.5); }
          100% { opacity: 1; filter: brightness(1); }
        }
        @keyframes sp1000ibmFlicker {
          0%, 92% { opacity: 1; }
          93% { opacity: 0.85; }
          94% { opacity: 1; }
          96% { opacity: 0.9; }
          97% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes sp1000cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes sp1000greenSweep {
          0% { transform: translateX(0%); opacity: 0; }
          6% { opacity: 1; filter: brightness(2.2); }
          50% { filter: brightness(1.5); }
          80% { opacity: 1; filter: brightness(1.2); }
          100% { transform: translateX(320%); opacity: 0; filter: brightness(1); }
        }
        @keyframes sp1000yellowSweep {
          0% { transform: translateX(0%); opacity: 0; }
          6% { opacity: 0.75; filter: brightness(1.65); }
          50% { filter: brightness(1.12); }
          80% { opacity: 0.75; filter: brightness(0.9); }
          100% { transform: translateX(320%); opacity: 0; filter: brightness(1); }
        }
        @keyframes sp1000crisisThrob {
          0%, 100% { opacity: 0.2; filter: brightness(1); }
          50% { opacity: 0.7; filter: brightness(1.4); }
        }
        @keyframes sp1000greenThrob {
          0%, 100% { opacity: 0.7; text-shadow: 0 0 4px rgba(51,255,102,0.3); }
          50% { opacity: 1; text-shadow: 0 0 10px rgba(51,255,102,0.7), 0 0 20px rgba(51,255,102,0.3); }
        }
        @keyframes sp1000lightSweep {
          0%, 100% { transform: translateX(-150%); }
          50% { transform: translateX(150%); }
        }
        @keyframes sp1000guideCrtLine {
          0% { opacity: 1; width: 150%; filter: brightness(25); }
          30% { opacity: 1; width: 80%; filter: brightness(20); }
          60% { opacity: 1; width: 30%; filter: brightness(12); }
          85% { opacity: 1; width: 8%; filter: brightness(6); }
          100% { opacity: 0; width: 0; filter: brightness(0); }
        }
        @keyframes sp1000logoCrtLine {
          0% { opacity: 1; width: 100%; filter: brightness(25); }
          30% { opacity: 1; width: 60%; filter: brightness(20); }
          60% { opacity: 1; width: 25%; filter: brightness(12); }
          85% { opacity: 1; width: 8%; filter: brightness(6); }
          100% { opacity: 0; width: 0; filter: brightness(0); }
        }
        @keyframes sp1000logoShake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-3px, 2px); }
          50% { transform: translate(3px, -1px); }
          75% { transform: translate(-2px, -2px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes sp1000logoBrightnessPop {
          0% { filter: brightness(1); }
          15% { filter: brightness(4); }
          40% { filter: brightness(2); }
          100% { filter: brightness(3); }
        }
        @keyframes sp1000navFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes sp1000returnGlow {
          0% { filter: brightness(0.4); text-shadow: 0 0 2px rgba(255,255,255,0.2); }
          50% { filter: brightness(1.8); text-shadow: 0 0 12px rgba(255,255,255,1), 0 0 24px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.3); }
          100% { filter: brightness(1); text-shadow: 0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(255,255,255,0.3); }
        }
        @keyframes sp1000navSurge {
          0% { filter: brightness(1); }
          12% { filter: brightness(2); text-shadow: 0 0 12px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.5); }
          30% { filter: brightness(1.6); text-shadow: 0 0 10px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.3); }
          60% { filter: brightness(1.2); text-shadow: 0 0 10px rgba(255,255,255,0.52), 0 0 20px rgba(255,255,255,0.22); }
          100% { filter: brightness(1); text-shadow: 0 0 10px rgba(255,255,255,0.52), 0 0 20px rgba(255,255,255,0.22), 0 0 40px rgba(255,255,255,0.08); }
        }
        @keyframes sp1000navCrossfade {
          0% { opacity: 1; filter: brightness(1); }
          20% { opacity: 0.8; filter: brightness(0.9); }
          50% { opacity: 0.4; filter: brightness(0.7); }
          80% { opacity: 0.1; filter: brightness(0.5); }
          100% { opacity: 0; filter: brightness(0.3); }
        }
        @keyframes sp1000navFlicker0 {
          0% { opacity: 1; }
          6% { opacity: 0; }
          12% { opacity: 0.8; }
          18% { opacity: 0; }
          28% { opacity: 1; }
          34% { opacity: 0; }
          42% { opacity: 0.6; }
          48% { opacity: 0; }
          58% { opacity: 0.4; }
          64% { opacity: 0; }
          74% { opacity: 0.2; }
          80% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sp1000navFlicker1 {
          0% { opacity: 1; }
          10% { opacity: 0.9; }
          16% { opacity: 0; }
          24% { opacity: 0.7; }
          30% { opacity: 0; }
          40% { opacity: 1; }
          46% { opacity: 0; }
          54% { opacity: 0.5; }
          60% { opacity: 0; }
          68% { opacity: 0.3; }
          76% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sp1000navFlicker2 {
          0% { opacity: 1; }
          8% { opacity: 0; }
          14% { opacity: 0.6; }
          20% { opacity: 0; }
          32% { opacity: 0.9; }
          38% { opacity: 0; }
          48% { opacity: 0.7; }
          56% { opacity: 0; }
          66% { opacity: 0.2; }
          72% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sp1000navFlicker3 {
          0% { opacity: 1; }
          4% { opacity: 0; }
          10% { opacity: 1; }
          18% { opacity: 0; }
          26% { opacity: 0.5; }
          32% { opacity: 0; }
          44% { opacity: 0.8; }
          52% { opacity: 0; }
          62% { opacity: 0.3; }
          70% { opacity: 0; }
          82% { opacity: 0.1; }
          88% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sp1000restartThrob {
          0%, 100% { text-shadow: 0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(255,255,255,0.3); }
          50% { text-shadow: 0 0 12px rgba(255,255,255,1), 0 0 24px rgba(255,255,255,0.7), 0 0 36px rgba(255,255,255,0.3); }
        }
        @keyframes sp1000returnDim {
          0% { filter: brightness(4); text-shadow: 0 0 8px #fff, 0 0 16px rgba(255,255,255,0.95), 0 0 32px rgba(255,255,255,0.7), 0 0 48px rgba(255,255,255,0.4); }
          100% { filter: brightness(1.2); text-shadow: 0 0 6px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.6), 0 0 28px rgba(255,255,255,0.3), 0 0 48px rgba(255,255,255,0.1); }
        }
        @keyframes sp1000logoFadeFromBlack {
          0% { opacity: 1; }
          40% { opacity: 0.6; }
          70% { opacity: 0.15; }
          100% { opacity: 0; }
        }
        @keyframes sp1000logoFadeToBlack {
          0% { opacity: 0; }
          30% { opacity: 0.15; }
          60% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes sp1000logoFry {
          0%, 100% { opacity: 0.03; background-position: 0% 0%; }
          10% { opacity: 0.05; background-position: -5% -5%; }
          20% { opacity: 0.02; background-position: 10% 10%; }
          30% { opacity: 0.06; background-position: -10% 5%; }
          40% { opacity: 0.03; background-position: 5% -10%; }
          50% { opacity: 0.04; background-position: -5% 10%; }
          60% { opacity: 0.02; background-position: 10% -5%; }
          70% { opacity: 0.05; background-position: 0% 5%; }
          80% { opacity: 0.03; background-position: -10% -10%; }
          90% { opacity: 0.04; background-position: 5% 0%; }
        }
        @keyframes sp1000logoScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes sp1000logoFlicker {
          0%, 100% { opacity: 1; }
          3% { opacity: 0.85; }
          6% { opacity: 1; }
          42% { opacity: 1; }
          44% { opacity: 0.9; }
          46% { opacity: 1; }
          78% { opacity: 1; }
          80% { opacity: 0.92; }
          82% { opacity: 1; }
        }
        @keyframes sp1000logoRollingBar {
          0% { top: 40%; }
          40% { top: 110%; }
          40.01% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes sp1000logoChroma {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(1px, 0); }
          50% { transform: translate(0, 1px); }
          75% { transform: translate(-1px, 0); }
        }
        @keyframes sp1000logoRotate {
          0%, 45% { transform: rotateY(0deg); }
          50%, 95% { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes sp1000logoFade1 {
          0%, 40% { opacity: 1; }
          50%, 90% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes sp1000logoFade2 {
          0%, 40% { opacity: 0; }
          50%, 90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp1000fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes sp1000crtDeath {
          0% { clip-path: inset(0 0 0 0); filter: brightness(1); }
          50% { clip-path: inset(40% 0 40% 0); filter: brightness(2); }
          75% { clip-path: inset(48% 0 48% 0); filter: brightness(3); }
          90% { clip-path: inset(49.5% 0 49.5% 0); filter: brightness(4); }
          100% { clip-path: inset(50% 0 50% 0); filter: brightness(5); }
        }
        @keyframes sp1000crtWarmUp {
          0% { transform: scaleY(0); filter: brightness(0); opacity: 0; }
          5% { transform: scaleY(0.01); filter: brightness(0.5); opacity: 0.3; }
          10% { transform: scaleY(0.01); filter: brightness(0.2); opacity: 0.5; }
          20% { transform: scaleY(0.02); filter: brightness(0.3); opacity: 0.6; }
          35% { transform: scaleY(0.03); filter: brightness(0.4); opacity: 0.7; }
          50% { transform: scaleY(0.08); filter: brightness(0.6); opacity: 0.8; }
          65% { transform: scaleY(0.2); filter: brightness(0.8); opacity: 0.9; }
          80% { transform: scaleY(0.5); filter: brightness(0.9); opacity: 0.95; }
          90% { transform: scaleY(0.8); filter: brightness(1); opacity: 1; }
          100% { transform: scaleY(1); filter: brightness(1); opacity: 1; }
        }
        @keyframes sp1000phosphorWarmUp {
          0% { opacity: 0; }
          20% { opacity: 0.1; }
          40% { opacity: 0.4; }
          60% { opacity: 0.8; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp1000scanlineWarmUp {
          0% { opacity: 0; }
          30% { opacity: 0.5; }
          60% { opacity: 0.8; }
          80% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes sp1000rowReveal {
          0% { clip-path: inset(0 100% 0 0); opacity: 0; }
          100% { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes sp1000warmUpFadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          90% { opacity: 0.4; }
          100% { opacity: 0; }
        }
        @keyframes sp1000rgbScanlines {
          0% { opacity: 0; }
          20% { opacity: 0.8; }
          50% { opacity: 1; }
          80% { opacity: 0.6; }
          100% { opacity: 0; }
        }
        @keyframes sp1000laserSweep {
          0% { top: 0%; opacity: 1; }
          100% { top: 100%; opacity: 0.3; }
        }
        @keyframes sp1000returnScreenFade {
          0% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes sp1000screenRelight {
          0% { opacity: 0; }
          15% { opacity: 0.92; }
          30% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes sp1000crtFlash {
          0% { opacity: 0; }
          30% { opacity: 0.4; }
          50% { opacity: 0.1; }
          100% { opacity: 0; }
        }
        @keyframes sp1000topDownReveal {
          0% { clip-path: inset(0 0 100% 0); opacity: 0; }
          100% { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes sp1000contentFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp1000overlayDismiss {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp1000bandReveal {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp1000rollDownReveal {
          0% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(100% 0 0 0); }
        }
        @keyframes sp1000scanlineFadeOut {
          0% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        @keyframes sp1000overlayOpen {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sp1000blueprintFadeIn {
          0% { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sp1000tmFlash {
          0% { opacity: 1; filter: brightness(30); }
          5% { opacity: 1; filter: brightness(40); }
          20% { opacity: 1; filter: brightness(25); }
          40% { opacity: 1; filter: brightness(10); }
          65% { opacity: 0.8; filter: brightness(4); }
          100% { opacity: 0; filter: brightness(1); }
        }
        @keyframes sp1000wormholeFlash {
          0% { opacity: 0; filter: brightness(1); }
          20% { opacity: 1; filter: brightness(5); }
          35% { opacity: 1; filter: brightness(3); }
          100% { opacity: 0; filter: brightness(1); }
        }
        @keyframes sp1000tmHeaderPulse {
          0%, 100% { text-shadow: 0 0 8px rgba(255,170,0,0.6); }
          50% { text-shadow: 0 0 16px rgba(255,170,0,0.9), 0 0 32px rgba(255,170,0,0.4); }
        }
      `}</style>
      <div className="sp1000-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: '100vh', padding: '24px 20px' }}>
        {/* Housing — matte black anodized aluminum with stainless steel trim */}
        <div
          style={{
            width: '90vw',
            maxWidth: 1260,
            background: 'linear-gradient(180deg, #2d2d2d 0%, #242424 4%, #1e1e1e 50%, #1a1a1a 100%)',
            borderRadius: 16,
            padding: '12px 12px 20px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            /* Glass-like gloss border — reflective translucent edge */
            border: '1.5px solid rgba(255,255,255,0.15)',
            /* Layered shadows: top gloss reflection, inner glow, contact, spread, deep ambient */
            boxShadow: `
              inset 0 1px 1px rgba(255,255,255,0.12),
              inset 0 -1px 1px rgba(0,0,0,0.2),
              0 0 0 1px rgba(255,255,255,0.06),
              0 2px 3px rgba(0,0,0,0.3),
              0 6px 20px rgba(0,0,0,0.35),
              0 20px 50px rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* Glass gloss — specular highlight across top edge */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '5%',
            right: '5%',
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.22) 60%, rgba(255,255,255,0.08) 85%, transparent)',
            borderRadius: '0 0 50% 50%',
            pointerEvents: 'none',
            zIndex: 5,
          }} />

          {/* Screen bezel — recessed cavity with stainless inner rim */}
          <div
            style={{
              backgroundColor: '#080808',
              borderRadius: 10,
              padding: 2,
              position: 'relative',
              /* Screen sits recessed — glow bleeds onto housing */
              boxShadow: `
                inset 0 2px 6px rgba(0,0,0,0.9),
                inset 0 0 0 0.5px rgba(255,255,255,0.08),
                0 0 12px rgba(40,80,40,0.15),
                0 0 30px rgba(30,60,30,0.08)
              `,
              perspective: 1200,
              /* Thin stainless rim around screen opening */
              border: '0.5px solid rgba(150,150,150,0.15)',
            }}
          >
            {/* REFRESH / SYNCING — etched at top edge of screen; only visible on main terminal */}
            {onRefresh && booted && !glitching && !timeMachineDate && !timeMachineAnimating && !timeMachineInput && !showLogo && !refreshHidden && (
              <div
                onClick={() => {
                  if (!loading) onRefresh();
                }}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 26,
                  fontFamily: MONO,
                  fontSize: 7,
                  letterSpacing: 2,
                  color: loading ? COLORS.amber : 'rgba(255,255,255,0.35)',
                  cursor: loading ? 'default' : 'pointer',
                  textTransform: 'uppercase',
                  zIndex: 110,
                  textShadow: loading ? 'none' : '0 1px 0 rgba(255,255,255,0.06)',
                  transition: 'color 0.3s ease, opacity 1.4s ease-in',
                  opacity: bootFade ? 1 : 0,
                }}
              >
                {loading ? 'SYNCING' : 'REFRESH'}
              </div>
            )}
            <div
              style={{
                width: '100%',
                position: 'relative',
              }}
            >
              <div style={{ opacity: bootFade ? 1 : 0, transition: 'opacity 1.4s ease-in' }}>
                <FrontFace stocks={stocks} today={today} loading={loading} limitReached={limitReached} lastSynced={lastSynced} showSyncTime={showSyncTime} ivEditMode={ivEditMode} onToggleIVEdit={() => setIvEditMode(!ivEditMode)} onStockChange={onStockChange} booted={booted} onSignalOverlayChange={setSignalOverlayOpen} signalCloseRef={signalCloseRef} />
              </div>
              {/* Screen relight overlay — dims then relights when SP-1000 tapped on home screen */}
              {screenRelight && (
                <div
                  onAnimationEnd={() => setScreenRelight(false)}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: COLORS.screen,
                    zIndex: 55, borderRadius: 6, pointerEvents: 'none',
                    animation: 'sp1000screenRelight 1.2s ease-out forwards',
                  }}
                />
              )}
              {/* Gentle fade overlay when RETURN dismisses an overlay — softens the pop */}
              {returnScreenFade && (
                <div
                  onAnimationEnd={() => setReturnScreenFade(false)}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: COLORS.screen,
                    zIndex: 55, borderRadius: 6, pointerEvents: 'none',
                    animation: 'sp1000returnScreenFade 0.8s ease-out forwards',
                  }}
                />
              )}
              {bootChecked && !booted && <StartupOverlay onComplete={handleBootComplete} onFadeIn={handleBootFadeIn} />}
              <PixelGlitchOverlay active={glitching} startAtGag={contactGag} stocks={stocks} today={today} onDismiss={() => { setGlitching(false); setGuideBlurred(false); setContactGag(false); setRestartVisible(false); }} onBlurStart={() => setGuideBlurred(true)} onReboot={() => setBooted(false)} />
              {/* WhiteFlashOverlay removed — logo splash now part of StartupOverlay */}
              {timeMachineInput && (
                <TimeMachineDateInput
                  onSubmit={handleDateConfirm}
                  onCancel={() => setTimeMachineInput(false)}
                />
              )}
              {/* Black underlay — prevents terminal from peeking through during TM flash-to-results handoff */}
              {(timeMachineAnimating || timeMachineDate || timeMachineLoading || timeMachineTarget || tmFadingOut || tmNavigating) && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: '#000', zIndex: 99, borderRadius: 6,
                  opacity: tmFadingOut ? 0 : 1,
                  transition: tmFadingOut ? 'opacity 0.6s ease-out' : 'none',
                }} />
              )}
              <TimeMachineTransition
                active={timeMachineAnimating}
                targetDate={timeMachineTarget}
                fromDate={timeMachineFromDate}
                onComplete={handleFireComplete}
                skipFlash={tmSkipFlash}
                skipRef={tmSkipRef}
                blueprintContent={
                  timeMachineStocks ? (
                    <TimeMachineBlueprintOverlay
                      stocks={timeMachineStocks}
                      historicalDate={timeMachineTarget || timeMachineDate}
                      onReturn={triggerReturnToPresent}
                      onEnterNewDate={triggerNewDate}
                      loading={timeMachineLoading}
                      benchmarkReturn={benchmarkReturn}
                      onNavigate={handleTimeMachineNav}
                      signalDatesIndex={signalDatesIndex}
                    />
                  ) : null
                }
              />
              {(timeMachineDate || tmFadingOut) && timeMachineStocks && !timeMachineAnimating && (
                <div style={{
                  opacity: (tmFadingOut || wormholeActive) ? 0 : 1,
                  transition: tmFadingOut ? 'opacity 0.6s ease-out' : 'none',
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                }}>
                  <TimeMachineBlueprintOverlay
                    stocks={timeMachineStocks}
                    historicalDate={timeMachineDate}
                    onReturn={triggerReturnToPresent}
                    onEnterNewDate={triggerNewDate}
                    loading={timeMachineLoading}
                    benchmarkReturn={benchmarkReturn}
                    onNavigate={handleTimeMachineNav}
                    signalDatesIndex={signalDatesIndex}
                  />
                </div>
              )}
              <WormholeTransition
                active={wormholeActive}
                onComplete={handleWormholeComplete}
              />
            </div>
          </div>

          {/* Bottom control strip — biased toward bottom of housing */}
          {timeMachineDate || timeMachineAnimating || timeMachineInput || (glitching && (!guideBlurred || contactGag)) || returnSliding || returnSlidePop || tmNavigating ? (
            /* Overlay active: centered RETURN only */
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 'auto',
              padding: '14px 20px 0',
              position: 'relative',
              minHeight: 20,
            }}>
              <span
                onClick={() => {
                  if (returnSliding) return;
                  const doReturn = () => {
                    if (timeMachineDate) {
                      triggerReturnToPresent();
                    } else if (timeMachineAnimating) {
                      if (tmSkipRef.current) tmSkipRef.current();
                    } else if (timeMachineInput) {
                      setTimeMachineInput(false);
                    } else if (glitching) {
                      const wasContact = contactGag;
                      setGlitching(false);
                      setGuideBlurred(false);
                      setContactGag(false);
                      setRestartVisible(false);
                      if (wasContact) setBooted(false);
                    }
                  };
                  setReturnSliding(true);
                  setReturnScreenFade(true);
                  setTimeout(() => setReturnSlidePop(true), 550);
                  setTimeout(() => {
                    doReturn();
                  }, 800);
                }}
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: '#fff',
                  cursor: returnSliding || (contactGag && !restartVisible) ? 'default' : 'pointer',
                  textTransform: 'uppercase',
                  textShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(255,255,255,0.3)',
                  animation: contactGag && restartVisible && !returnSliding
                    ? 'sp1000restartThrob 1.5s ease-in-out 0.8s infinite'
                    : (!returnSliding && !contactGag ? 'sp1000returnGlow 1.5s ease-out forwards' : 'none'),
                  transition: contactGag
                    ? 'left 0.7s ease-in-out, opacity 1.2s ease-in'
                    : 'left 0.7s ease-in-out, opacity 0.25s ease-in 0.45s',
                  position: 'absolute',
                  left: returnSliding ? 'calc(100% - 70px)' : 'calc(50% - 25px)',
                  opacity: returnSliding ? 0 : (contactGag && !restartVisible ? 0 : 1),
                  pointerEvents: contactGag && !restartVisible ? 'none' : 'auto',
                }}
              >
                {contactGag ? 'RESTART' : 'RETURN'}
              </span>
              {/* SP-1000 reveals at destination as RETURN arrives */}
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  pointerEvents: 'none',
                  position: 'absolute',
                  right: 20,
                  color: returnSlidePop ? '#fff' : 'transparent',
                  textShadow: returnSlidePop
                    ? '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(255,255,255,0.4)'
                    : 'none',
                  transition: 'color 0.25s ease-out, text-shadow 0.25s ease-out',
                  animation: returnSlidePop ? 'sp1000logoBrightnessPop 0.4s ease-out forwards' : 'none',
                }}
              >
                SP-1000
              </span>
            </div>
          ) : (
            /* Normal/startup: CONTACT + GUIDE + TIME MACHINE left, SP-1000 right */
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 'auto',
              padding: '14px 20px 0',
              minHeight: 20,
              position: 'relative',
              opacity: signalOverlayOpen ? 0.25 : 1,
              transition: 'opacity 0.3s ease',
            }}>
              {/* Key wrapper — changing navSweepKey remounts buttons, restarting sweep animation */}
              <React.Fragment key={`nav-sweep-${navSweepKey}`}>
              {[
                { id: 'contact', label: 'CONTACT', noSlide: true, trigger: triggerContact, delay: '0.15s' },
                { id: 'guide', label: 'GUIDE', trigger: triggerGlitch, delay: '0.3s' },
                { id: 'timemachine', label: 'TIME MACHINE', trigger: triggerTimeMachine, delay: '0.45s' },
              ].map((btn, i) => {
                return (
                  <React.Fragment key={btn.id}>
                    {i > 0 && <span style={{ width: 16, opacity: navSlideButton ? 0 : 1, transition: 'opacity 0.2s ease' }} />}
                    <span
                      onClick={() => {
                        if (navSlideButton || navFlicker) return;
                        // If signal analysis is open, dismiss it instead of triggering nav action
                        if (signalOverlayOpen && signalCloseRef.current) {
                          signalCloseRef.current();
                          return;
                        }
                        if (glitching || showLogo || timeMachineAnimating) return;
                        if (btn.noSlide) {
                          // Contact: flicker all buttons like electrical disruption, then trigger
                          setNavFlicker(true);
                          setTimeout(() => {
                            setNavFlicker(false);
                            setNavSlideButton(btn.id);
                            setTimeout(() => { btn.trigger(); setNavSlideButton(null); }, 80);
                          }, 550);
                          return;
                        }
                        // Guide/TM: crossfade all buttons out from center, then trigger (overlay toolbar takes over with RETURN)
                        setNavSlideButton(btn.id);
                        setTimeout(() => {
                          btn.trigger();
                          setNavSlideButton(null);
                        }, 500);
                      }}
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#eee',
                        textShadow: '0 0 10px rgba(255,255,255,0.52), 0 0 20px rgba(255,255,255,0.22), 0 0 40px rgba(255,255,255,0.08)',
                        cursor: (glitching || showLogo || timeMachineAnimating || navSlideButton) ? 'default' : 'pointer',
                        textTransform: 'uppercase',
                        opacity: navSlideButton ? undefined : (!booted ? 0 : undefined),
                        transition: navSlideButton
                          ? 'none'
                          : 'color 0.3s ease, text-shadow 0.3s ease',
                        animationName: navFlicker
                          ? `sp1000navFlicker${i}`
                          : navSurge
                            ? 'sp1000navSurge'
                            : navSlideButton
                              ? 'sp1000navCrossfade'
                              : (booted ? 'sp1000navFadeIn' : 'none'),
                        animationDuration: navFlicker ? '0.5s' : (navSurge ? '0.6s' : (navSlideButton ? '0.35s' : '0.6s')),
                        animationTimingFunction: navFlicker ? 'steps(1)' : 'ease-out',
                        animationFillMode: navSurge ? 'none' : 'forwards',
                        animationDelay: navFlicker
                          ? `${i * 0.04}s`
                          : navSlideButton
                            ? `${(2 - i) * 0.06}s`
                            : '0s',
                      }}
                    >
                      {btn.label}
                    </span>
                  </React.Fragment>
                );
              })}
              </React.Fragment>
              <span style={{ flex: 1, opacity: navSlideButton ? 0 : 1, transition: navSlideButton ? 'opacity 0.2s ease-out 0.06s' : 'opacity 0.2s ease' }} />
              <span
                onClick={navSlideButton ? undefined : (signalOverlayOpen && signalCloseRef.current ? signalCloseRef.current : triggerLogo)}
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: 4,
                  color: '#fff',
                  textTransform: 'uppercase',
                  textShadow: (showLogo || guideBlurred)
                    ? '0 0 8px #fff, 0 0 16px rgba(255,255,255,0.95), 0 0 32px rgba(255,255,255,0.7), 0 0 48px rgba(255,255,255,0.4)'
                    : '0 0 6px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.6), 0 0 28px rgba(255,255,255,0.3), 0 0 48px rgba(255,255,255,0.1)',
                  filter: (showLogo || guideBlurred) ? 'brightness(1.5)' : 'brightness(1.2)',
                  cursor: (glitching && (!guideBlurred || contactGag)) ? 'default' : navSlideButton ? 'default' : 'pointer',
                  transition: 'color 0.3s ease, text-shadow 0.3s ease, filter 0.3s ease, opacity 0.2s ease',
                  animation: navFlicker
                    ? 'sp1000navFlicker3 0.5s steps(1) 0.06s forwards'
                    : navSurge
                      ? 'sp1000navSurge 0.6s ease-out'
                      : navSlideButton
                        ? 'sp1000navCrossfade 0.35s ease-out 0s forwards'
                        : (returnDimming ? 'sp1000returnDim 0.6s ease-out forwards' : 'none'),
                  opacity: navSlideButton ? undefined : (navFlicker ? undefined : 1),
                }}
              >
                SP-1000
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
