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
  dim: '#888888',
  dimmer: '#444444',
  unlit: '#222222',
  screen: '#080808',
};

const MONO = "'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace";

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
    <div style={{ width: 70, flexShrink: 0, color: '#fff' }}>
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
          <div style={{ color: '#fff', textAlign: 'right', minWidth: 50 }}>
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
            animation: 'set100backlightOn 0.15s ease-out',
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
          animation: 'set100backlightOn 0.15s ease-out',
        }}>
          {pctAboveLowDisplay}%
        </div>
      ) : (
        Array.from({ length: 5 }, (_, i) => {
          // Both colors fill from bottom (index 4) to top
          const active = (5 - i) <= filledBars;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                width: 8,
                backgroundColor: active ? barColor : COLORS.unlit,
                borderRadius: 1,
                animation: shouldPulse && active ? 'set100throb 2s ease-in-out infinite' : 'none',
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
          animation: 'set100backlightOn 0.15s ease-out',
        }}>
          {iv}%
        </div>
      ) : (
        Array.from({ length: 10 }, (_, i) => {
          const active = i < filled || isOverLimit;
          // Throb red if over 50%
          const shouldThrob = isOverLimit;
          const animName = isOverLimit ? 'set100danger' : 'set100throb';
          return (
            <div
              key={i}
              style={{
                width: 4,
                height: 12,
                backgroundColor: active ? segmentColor : COLORS.unlit,
                borderRadius: 1,
                animation: shouldThrob && active ? `${animName} 2s ease-in-out infinite` : 'none',
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
        animation: clickState > 0 ? 'set100backlightOn 0.15s ease-out' : 'none',
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
        animation: 'set100throb 2s ease-in-out infinite',
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
  segments.push({ text: `$${stock.w52l.toFixed(2)}`, color: '#fff' });
  segments.push({ text: ' and ' });
  segments.push({ text: `${pctBelow.toFixed(0)}%`, color: pctBelow >= 20 ? '#33ff66' : '#ff5555' });
  segments.push({ text: ' below its 52-week high of ' });
  segments.push({ text: `$${stock.w52h.toFixed(2)}`, color: '#fff' });
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
    segments.push({ text: stock.nextEarn, color: '#fff' });
    segments.push({ text: ') ' });
    segments.push({ text: ' ', link: `${yahooUrl}/analysis/`, linkText: '(verify)' });
    segments.push({ text: '. ' });
  } else if (periodInfo.period === 'CRUSH') {
    segments.push({ text: 'In post-earnings CRUSH period following the ' });
    segments.push({ text: stock.lastEarn, color: '#fff' });
    segments.push({ text: ' report ' });
    segments.push({ text: ' ', link: `${yahooUrl}/analysis/`, linkText: '(view earnings)' });
    segments.push({ text: '. ' });
  } else if (periodInfo.period === 'OPEN') {
    segments.push({ text: 'OPEN window with ' });
    segments.push({ text: `${periodInfo.left}`, color: '#fff' });
    segments.push({ text: ' days to quarter end (' });
    segments.push({ text: stock.qtrEnd, color: '#fff' });
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
  const segments = generateNarrative(stock, sig, periodInfo, drawdown);
  const signalLabel = sig.score >= 3 ? 'GREEN' : sig.score === 2 ? 'YELLOW' : 'DIM';

  // Border glow color based on signal
  const borderColor = sig.score >= 3 ? COLORS.green : sig.score === 2 ? COLORS.amber : 'rgba(255,255,255,0.5)';
  const glowColor = sig.score >= 3 ? 'rgba(51,255,102,0.4)' : sig.score === 2 ? 'rgba(255,204,0,0.4)' : 'rgba(255,255,255,0.15)';
  const signalTextColor = sig.score >= 3 ? COLORS.green : sig.score === 2 ? COLORS.amber : '#ccc';

  const yahooUrl = `https://finance.yahoo.com/quote/${stock.sym}`;

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
          animation: 'set100overlayOpen 0.2s ease-out',
          padding: '24px 28px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 16,
          borderBottom: `1px solid ${borderColor}`,
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 18, color: '#fff', fontFamily: MONO, fontWeight: 600, letterSpacing: 2 }}>
            {stock.sym} <span style={{ fontWeight: 400, color: COLORS.dim, fontSize: 13 }}>— SIGNAL ANALYSIS</span>
          </span>
          <span style={{ fontSize: 14, color: signalTextColor, fontFamily: MONO, fontWeight: 600, letterSpacing: 2 }}>
            {signalLabel}
          </span>
        </div>

        {/* Narrative analysis */}
        <div style={{ marginBottom: 24 }}>
          <NarrativeText segments={segments} />
        </div>

        {/* Score calculation box */}
        <div style={{
          fontFamily: MONO,
          fontSize: 13,
          padding: 16,
          border: `1px solid ${COLORS.dimmer}`,
          borderRadius: 4,
          marginBottom: 20,
        }}>
          <div style={{ color: COLORS.dim, marginBottom: 8, fontSize: 11, letterSpacing: 1 }}>
            SCORE CALCULATION:
          </div>
          <div>
            {[
              { label: 'PRICE', val: sig.priceScore },
              { label: 'HIGH', val: sig.nearHighPenalty },
              { label: 'CRISIS', val: sig.crisisBonus },
              { label: 'PERIOD', val: sig.periodBonus },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <span style={{ color: COLORS.dimmer }}> + </span>}
                <span style={{ color: COLORS.dim }}>{item.label}(</span>
                <span style={{ color: item.val >= 0 ? COLORS.green : COLORS.red, fontWeight: 600 }}>{item.val}</span>
                <span style={{ color: COLORS.dim }}>)</span>
              </React.Fragment>
            ))}
            <span style={{ color: COLORS.dimmer }}> = </span>
            <span style={{ color: sig.score >= 0 ? COLORS.green : COLORS.red, fontWeight: 700 }}>{sig.score}</span>
          </div>
        </div>

        {/* Dismiss hint */}
        <div style={{
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: 11,
          color: COLORS.dimmer,
          letterSpacing: 1,
        }}>
          Click anywhere outside to close
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

// Aliens-style terminal message - UNAUTHORIZED USER DETECTED → POWERING DOWN
function TerminalMessage({ active, onTypingComplete }) {
  const [phase, setPhase] = useState(0); // 0=waiting, 1=typing first line, 2=first done, 3=typing second, 4=complete

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }

    const timers = [];

    // Phase 1: Start typing "UNAUTHORIZED USER DETECTED . . ." at 0.5s
    timers.push(setTimeout(() => setPhase(1), 500));

    // "UNAUTHORIZED USER DETECTED . . ." = 32 chars * 70ms = 2240ms
    // Complete at ~2.7s, wait 1s, then phase 2 at 4s
    timers.push(setTimeout(() => setPhase(2), 4000));

    // Phase 3: Start typing "POWERING DOWN" at 5s
    timers.push(setTimeout(() => setPhase(3), 5000));

    // "POWERING DOWN" = 13 chars * 70ms = 910ms
    // Complete at ~5.9s, signal complete at 6.5s
    timers.push(setTimeout(() => {
      setPhase(4);
      if (onTypingComplete) onTypingComplete();
    }, 6500));

    return () => timers.forEach(t => clearTimeout(t));
  }, [active, onTypingComplete]);

  if (!active) return null;

  const textStyle = {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: 2,
    color: COLORS.green,
    textShadow: '0 0 8px rgba(51,255,102,0.9), 0 0 16px rgba(51,255,102,0.6)',
    animation: 'set100ibmFlicker 0.1s infinite',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: '18px 24px',
      textAlign: 'left',
      lineHeight: 2.4,
      zIndex: 5,
    }}>
      {/* Blinking block cursor before typing starts — top-left like startup */}
      {phase === 0 && (
        <div style={textStyle}>
          <span style={{ animation: 'set100cursorBlink 0.8s step-end infinite' }}>█</span>
        </div>
      )}
      <div style={textStyle}>
        {phase === 1 && <TypewriterText text="UNAUTHORIZED USER DETECTED . . ." charDelay={70} />}
        {phase >= 2 && (
          <span>UNAUTHORIZED USER DETECTED . . .</span>
        )}
      </div>
      {phase >= 3 && (
        <div style={textStyle}>
          {phase === 3 && <TypewriterText text="POWERING DOWN" charDelay={70} />}
          {phase === 4 && (
            <span>POWERING DOWN<span style={{ animation: 'set100cursorBlink 0.6s step-end infinite' }}>█</span></span>
          )}
        </div>
      )}
    </div>
  );
}

function PixelGlitchOverlay({ active, onDismiss }) {
  const [phase, setPhase] = useState(0); // 0=slide-in, 1=hold, 2=blur, 3=panel-slide, 4=terminal, 5=crt-death, 6=black, 6.5=boot-text, 7=crt-poweron
  const blackScreenTimerRef = React.useRef(null);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      if (blackScreenTimerRef.current) {
        clearTimeout(blackScreenTimerRef.current);
      }
      return;
    }

    const timers = [];
    // Phase 0: Slide in guide (0-0.8s transition)
    // Phase 1: Hold guide visible, slide complete at 0.8s
    timers.push(setTimeout(() => setPhase(1), 800));
    // Phase 2: Start blur 5s AFTER slide completes (at 5.8s total) - allows reading
    timers.push(setTimeout(() => setPhase(2), 5800));
    // Phase 3: Dark panel slides up (blur complete at 8.8s, slide at 9s)
    timers.push(setTimeout(() => setPhase(3), 8800));
    // Phase 4: Terminal typing starts (after panel slide, 9.8s)
    timers.push(setTimeout(() => setPhase(4), 9800));

    return () => timers.forEach(t => clearTimeout(t));
  }, [active]);

  const handleTypingComplete = () => {
    setPhase(5); // CRT death (right after POWERING DOWN)
    // After CRT death animation, go to black screen
    setTimeout(() => {
      setPhase(6); // Black screen with blinking cursor
      // Auto-trigger boot text after 15 seconds on black screen
      blackScreenTimerRef.current = setTimeout(() => {
        triggerBootSequence();
      }, 15000);
    }, 600);
  };

  const triggerBootSequence = () => {
    setPhase(6.5); // Boot text sequence
    // After boot text finishes (6 lines × 0.5s each + 0.5s buffer = 3.5s), trigger warm-up
    setTimeout(() => {
      triggerWarmUp();
    }, 3800);
  };

  const triggerWarmUp = () => {
    setPhase(7); // CRT warm-up
    // Dismiss after warm-up animation completes (4s with RGB scanlines, laser sweep, and CRT flash)
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 4100);
  };

  const handleClick = () => {
    // Only allow dismiss when on black screen - trigger boot sequence
    if (phase === 6) {
      if (blackScreenTimerRef.current) {
        clearTimeout(blackScreenTimerRef.current);
      }
      triggerBootSequence();
    }
  };

  const rebootLines = [
    { text: 'SOUTH END AI SYSTEMS', indent: false, bold: true },
    { text: 'SP-1000 LEAPS TERMINAL v1.0', indent: false, bold: true },
    { text: '', indent: false, bold: false }, // blank line spacer
    { text: 'INITIALIZING DISPLAY...', indent: true, bold: false },
    { text: 'LOADING MARKET DATA.......... OK', indent: true, bold: false },
    { text: 'SYSTEM READY', indent: true, bold: false },
  ];

  if (!active) return null;

  const guideContent = [
    { label: 'SIGNAL', desc: 'GREEN ≥3pts, YELLOW =2pts (Tier 1 only). Click symbol for analysis' },
    { label: 'PRICE', desc: '≤10% above 52W low = +3, ≤20% = +2, ≤50% = +1' },
    { label: 'HIGH', desc: '<20% below 52W high = -1 penalty' },
    { label: 'PERIOD', desc: 'QUIET = +1, CRUSH = 0, OPEN = -1' },
    { label: 'CRISIS', desc: '>8% drop in 5 days = +2 bonus. Guarantees YELLOW floor' },
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
        zIndex: 100,
        pointerEvents: phase >= 1 ? 'auto' : 'none',
        overflow: 'hidden',
        borderRadius: 6,
        cursor: phase === 6 ? 'pointer' : 'default',
        // Transparent initially, then dark background fades in for typing phase
        backgroundColor: phase >= 3 ? COLORS.screen : 'transparent',
        transition: 'background-color 0.5s ease-in',
      }}
    >
      {/* User Guide screen - slides in from right as overlay, fits within screen */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.screen,
        transform: phase === 0 ? 'translateX(100%)' : 'translateX(0%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'transform 0.6s ease-out, filter 2s ease-in, opacity 0.5s ease-in',
        filter: phase >= 2 ? 'blur(12px)' : 'blur(0px)',
        opacity: phase >= 3 ? 0 : 1,
        boxShadow: phase < 3 ? '-8px 0 24px rgba(0,0,0,0.5)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          fontFamily: MONO,
          fontSize: 14,
          letterSpacing: 5,
          color: COLORS.green,
          textShadow: '0 0 8px rgba(51,255,102,0.4)',
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: `1px solid ${COLORS.dimmer}`,
          flexShrink: 0,
        }}>
          USER GUIDE
        </div>

        {/* Column Definitions */}
        <div style={{ marginBottom: 10, flexShrink: 0 }}>
          <div style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: 2,
            color: COLORS.amber,
            marginBottom: 6,
          }}>
            COLUMN DEFINITIONS
          </div>
          {guideContent.map((item, i) => (
            <div key={i} style={{
              fontFamily: MONO,
              fontSize: 11,
              marginBottom: 4,
              display: 'flex',
            }}>
              <span style={{
                color: COLORS.green,
                width: 70,
                flexShrink: 0,
                textShadow: '0 0 4px rgba(51,255,102,0.3)',
              }}>
                {item.label}
              </span>
              <span style={{ color: COLORS.dim }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Signal Legend */}
        <div style={{ marginBottom: 10, flexShrink: 0 }}>
          <div style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: 2,
            color: COLORS.amber,
            marginBottom: 6,
          }}>
            SIGNAL LIGHT LEGEND
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, display: 'flex', gap: 16 }}>
            <span><span style={{ color: COLORS.green }}>●</span> <span style={{ color: COLORS.dim }}>GREEN (3+)</span></span>
            <span><span style={{ color: COLORS.amber }}>●</span> <span style={{ color: COLORS.dim }}>WATCH (2)</span></span>
            <span><span style={{ color: COLORS.red }}>●</span> <span style={{ color: COLORS.dim }}>WAIT (0-1)</span></span>
          </div>
        </div>

        {/* Signal Scoring */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: 2,
            color: COLORS.amber,
            marginBottom: 6,
          }}>
            SIGNAL SCORING
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: COLORS.dim, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 2, color: COLORS.dim }}>PRICE (% above 52W low)</div>
            <div><span style={{ color: COLORS.green }}>+3</span> Within 10% of low</div>
            <div><span style={{ color: COLORS.green }}>+2</span> 10-20% above low</div>
            <div><span style={{ color: COLORS.green }}>+1</span> 20-50% above low</div>
            <div style={{ marginTop: 4, marginBottom: 2, color: COLORS.dim }}>NEAR HIGH PENALTY</div>
            <div><span style={{ color: COLORS.red }}>−1</span> Less than 20% below high</div>
            <div style={{ marginTop: 4, marginBottom: 2, color: COLORS.dim }}>PERIOD</div>
            <div><span style={{ color: COLORS.green }}>+1</span> QUIET (pre-earnings)</div>
            <div><span style={{ color: COLORS.red }}>−1</span> OPEN (repurchase window)</div>
            <div style={{ marginTop: 4, marginBottom: 2, color: COLORS.dim }}>CRISIS MODE</div>
            <div><span style={{ color: COLORS.green }}>+2</span> &gt;8% drop in 5 days</div>
          </div>
        </div>

      </div>

      {/* Dark panel slides up from bottom to cover guide */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.screen,
        transform: phase >= 3 ? 'translateY(0%)' : 'translateY(100%)',
        transition: 'transform 0.8s ease-out',
      }}>
        {/* Terminal typing messages */}
        {phase === 4 && <TerminalMessage active={true} onTypingComplete={handleTypingComplete} />}
      </div>

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
            animation: 'set100crtDeath 0.5s ease-in forwards',
            transformOrigin: 'center center',
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
            animation: 'set100guideCrtLine 0.6s ease-out forwards',
          }} />
        </>
      )}

      {/* Black screen — blinking cursor top-left, tap/click triggers warm-up */}
      {phase === 6 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          padding: '18px 24px',
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: 18,
            color: COLORS.green,
            textShadow: '0 0 8px rgba(51,255,102,0.5)',
            animation: 'set100cursorBlink 0.8s step-end infinite',
          }}>
            █
          </span>
        </div>
      )}

      {/* Boot text sequence — company name, app name, initialization */}
      {phase === 6.5 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          padding: '18px 24px',
        }}>
          {/* Scanline overlay */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
            opacity: 0.5,
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <div style={{
            fontFamily: MONO,
            fontSize: 14,
            color: COLORS.green,
            textShadow: '0 0 6px rgba(51,255,102,0.3)',
            zIndex: 2,
            position: 'relative',
          }}>
            {rebootLines.map((line, i) => (
              <div
                key={i}
                style={{
                  marginBottom: line.text === '' ? 12 : 4,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  animation: `set100rowReveal 0.5s ease-out ${i * 0.5}s both`,
                  paddingLeft: line.indent ? 16 : 0,
                  fontSize: line.bold ? 14 : 12,
                  opacity: line.bold ? 1 : 0.8,
                  minHeight: line.text === '' ? 8 : 'auto',
                }}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRT warm-up effect - Aliens DOS terminal style with block placeholders transitioning to real content */}
      {phase === 7 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: COLORS.screen,
          pointerEvents: 'none',
          zIndex: 50,
          animation: 'set100warmUpFadeOut 4s ease-out forwards',
        }}>
          {/* Phosphor warm-up glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(51,255,102,0.2) 0%, transparent 70%)',
            animation: 'set100phosphorWarmUp 3s ease-out forwards',
          }} />
          {/* RGB scan lines - adds color during transition */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.03) 0px, rgba(0,255,0,0.03) 1px, rgba(0,0,255,0.03) 2px, transparent 3px, transparent 4px)',
            animation: 'set100rgbScanlines 4s ease-out forwards',
            mixBlendMode: 'screen',
          }} />
          {/* Horizontal laser line sweep */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.9) 40%, rgba(51,255,102,1) 50%, rgba(255,255,255,0.9) 60%, transparent 100%)',
            boxShadow: '0 0 30px 15px rgba(51,255,102,0.6), 0 0 60px 30px rgba(51,255,102,0.3)',
            animation: 'set100laserSweep 1.8s ease-in-out 1.8s forwards',
            opacity: 0,
          }} />
          {/* CRT flash at transition */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#fff',
            animation: 'set100crtFlash 0.3s ease-out 3.5s forwards',
            opacity: 0,
          }} />
          {/* Regular scanlines */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
            opacity: 0.5,
          }} />
          {/* Terminal placeholder rows revealing left to right, then fading */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '18px 24px',
            boxSizing: 'border-box',
          }}>
            {/* Header row */}
            <div style={{
              fontFamily: MONO,
              fontSize: 14,
              color: COLORS.green,
              letterSpacing: 5,
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: '1px solid #222',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              animation: 'set100rowReveal 0.8s ease-out 0.1s both',
              textShadow: '0 0 8px rgba(51,255,102,0.4)',
            }}>
              LEAPS TERMINAL
            </div>
            {/* Column headers */}
            <div style={{
              display: 'flex',
              paddingBottom: 8,
              marginBottom: 4,
              borderBottom: `1px solid ${COLORS.dimmer}`,
              animation: 'set100rowReveal 0.6s ease-out 0.2s both',
            }}>
              <div style={{ width: 90, flexShrink: 0 }} />
              <div style={{ flex: 1.2, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ████████
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ██
              </div>
              <div style={{ flex: 0.6, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ██████
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ██████
              </div>
            </div>
            {/* Data rows - staggered reveal */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  borderBottom: i < 10 ? `1px solid ${COLORS.dimmer}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  color: COLORS.green,
                  letterSpacing: 1,
                  animation: `set100rowReveal 0.5s ease-out ${0.3 + i * 0.08}s both`,
                  textShadow: '0 0 6px rgba(51,255,102,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                }}>
                  <span style={{
                    width: 32,
                    display: 'flex',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.amber : COLORS.dim,
                      opacity: 0.8,
                    }} />
                  </span>
                  <span style={{ width: 58, flexShrink: 0 }}>████</span>
                  <span style={{ flex: 1.2, textAlign: 'center' }}>███ ▐▐▐▐▐</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>▐▐▐▐▐▐▐▐▐▐</span>
                  <span style={{ flex: 0.6, textAlign: 'center' }}>██/██</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>████</span>
                </div>
              </div>
            ))}
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

function StockRow({ children, isLast, hasGreenSignal, compact, isMobile }) {
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
      {/* Green signal highlight — static underlay on mobile, animated sweep on desktop */}
      {hasGreenSignal && (
        isMobile ? (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(51,255,102,0.08)',
            pointerEvents: 'none',
          }} />
        ) : (
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '-100%',
            width: '300%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(51,255,102,0.10) 20%, rgba(51,255,102,0.22) 35%, rgba(51,255,102,0.28) 50%, rgba(51,255,102,0.22) 65%, rgba(51,255,102,0.10) 80%, transparent 100%)',
            animation: 'set100greenSweep 4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )
      )}
      {children}
    </div>
  );
}

function FrontFace({ stocks, today, loading, limitReached, lastSynced, showSyncTime, ivEditMode, onToggleIVEdit, onStockChange }) {
  // Detect mobile screen
  const [isMobile, setIsMobile] = useState(false);
  // Selected stock for explanation overlay
  const [selectedStock, setSelectedStock] = useState(null);

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
          {loading && (
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
              }}
            >
              RX BUSY
            </span>
          )}
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

          // Detect crisis mode (rapid drawdown >15% in 5 days)
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
              <StockRow isLast={idx === sortedArr.length - 1} hasGreenSignal={isGreenSig} compact={isMobile} isMobile={isMobile}>
                <div style={{ ...cellBase, width: isMobile ? 20 : 32, flexShrink: 0, padding: 0 }}>
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

// Startup overlay — DOS boot sequence + CRT warm-up
function StartupOverlay({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0=cursor, 1=boot text, 2=warm-up

  useEffect(() => {
    // Phase 0: blinking cursor, waits for click
    // Phase 1→2 transition is timed
    if (phase === 1) {
      const timer = setTimeout(() => setPhase(2), 4500);
      return () => clearTimeout(timer);
    }
    if (phase === 2) {
      const timer = setTimeout(() => {
        onComplete();
      }, 4100);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const handleClick = () => {
    if (phase === 0) setPhase(1);
  };

  const bootLines = [
    { text: 'SOUTH END AI SYSTEMS', indent: false, bold: true },
    { text: 'SP-1000 LEAPS TERMINAL v1.0', indent: false, bold: true },
    { text: '', indent: false, bold: false }, // blank line spacer
    { text: 'INITIALIZING DISPLAY...', indent: true, bold: false },
    { text: 'LOADING MARKET DATA.......... OK', indent: true, bold: false },
    { text: 'SYSTEM READY', indent: true, bold: false },
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
        backgroundColor: COLORS.screen,
        zIndex: 60,
        cursor: phase === 0 ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        overflow: 'hidden',
        borderRadius: 6,
      }}
    >
      {/* Scanline overlay — always present for CRT authenticity */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        opacity: 0.5,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Phase 0: Blinking cursor — top-left like a real terminal */}
      {phase === 0 && (
        <span style={{
          fontFamily: MONO,
          fontSize: 18,
          color: COLORS.green,
          textShadow: '0 0 8px rgba(51,255,102,0.5)',
          animation: 'set100cursorBlink 0.8s step-end infinite',
          zIndex: 2,
          padding: '18px 24px',
        }}>
          █
        </span>
      )}

      {/* Phase 1: Boot text — top-left */}
      {phase === 1 && (
        <div style={{
          fontFamily: MONO,
          fontSize: 14,
          color: COLORS.green,
          textShadow: '0 0 6px rgba(51,255,102,0.3)',
          padding: '18px 24px',
          zIndex: 2,
        }}>
          {bootLines.map((line, i) => (
            <div
              key={i}
              style={{
                marginBottom: line.text === '' ? 12 : 4,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                animation: `set100rowReveal 0.5s ease-out ${i * 0.5}s both`,
                paddingLeft: line.indent ? 16 : 0,
                fontSize: line.bold ? 14 : 12,
                opacity: line.bold ? 1 : 0.8,
                minHeight: line.text === '' ? 8 : 'auto',
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
      )}

      {/* Phase 2: CRT warm-up (reuses PixelGlitchOverlay phase 7 effects) */}
      {phase === 2 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: COLORS.screen,
          pointerEvents: 'none',
          zIndex: 2,
          animation: 'set100warmUpFadeOut 4s ease-out forwards',
        }}>
          {/* Phosphor warm-up glow */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(51,255,102,0.2) 0%, transparent 70%)',
            animation: 'set100phosphorWarmUp 3s ease-out forwards',
          }} />
          {/* RGB scan lines */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.03) 0px, rgba(0,255,0,0.03) 1px, rgba(0,0,255,0.03) 2px, transparent 3px, transparent 4px)',
            animation: 'set100rgbScanlines 4s ease-out forwards',
            mixBlendMode: 'screen',
          }} />
          {/* Horizontal laser sweep */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.9) 40%, rgba(51,255,102,1) 50%, rgba(255,255,255,0.9) 60%, transparent 100%)',
            boxShadow: '0 0 30px 15px rgba(51,255,102,0.6), 0 0 60px 30px rgba(51,255,102,0.3)',
            animation: 'set100laserSweep 1.8s ease-in-out 1.8s forwards',
            opacity: 0,
          }} />
          {/* CRT flash */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#fff',
            animation: 'set100crtFlash 0.3s ease-out 3.5s forwards',
            opacity: 0,
          }} />
          {/* Regular scanlines */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
            opacity: 0.5,
          }} />
          {/* Placeholder rows revealing */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '18px 24px',
            boxSizing: 'border-box',
          }}>
            {/* Header row */}
            <div style={{
              fontFamily: MONO,
              fontSize: 14,
              color: COLORS.green,
              letterSpacing: 5,
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: '1px solid #222',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              animation: 'set100rowReveal 0.8s ease-out 0.1s both',
              textShadow: '0 0 8px rgba(51,255,102,0.4)',
            }}>
              LEAPS TERMINAL
            </div>
            {/* Column headers */}
            <div style={{
              display: 'flex',
              paddingBottom: 8,
              marginBottom: 4,
              borderBottom: `1px solid ${COLORS.dimmer}`,
              animation: 'set100rowReveal 0.6s ease-out 0.2s both',
            }}>
              <div style={{ width: 90, flexShrink: 0 }} />
              <div style={{ flex: 1.2, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ████████
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ██
              </div>
              <div style={{ flex: 0.6, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ██████
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: COLORS.dim }}>
                ██████
              </div>
            </div>
            {/* Data rows — staggered reveal */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  borderBottom: i < 10 ? `1px solid ${COLORS.dimmer}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  color: COLORS.green,
                  letterSpacing: 1,
                  animation: `set100rowReveal 0.5s ease-out ${0.3 + i * 0.08}s both`,
                  textShadow: '0 0 6px rgba(51,255,102,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                }}>
                  <span style={{
                    width: 32,
                    display: 'flex',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.amber : COLORS.dim,
                      opacity: 0.8,
                    }} />
                  </span>
                  <span style={{ width: 58, flexShrink: 0 }}>████</span>
                  <span style={{ flex: 1.2, textAlign: 'center' }}>███ ▐▐▐▐▐</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>▐▐▐▐▐▐▐▐▐▐</span>
                  <span style={{ flex: 0.6, textAlign: 'center' }}>██/██</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>████</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Logo display - slides up from bottom, click to dismiss with CRT death
function WhiteFlashOverlay({ active, onDismiss }) {
  const [phase, setPhase] = useState(-1); // -1=hidden, 0=ready, 1=slide-up, 2=hold, 3=crt-death

  // Single logo
  const logo = '/south-end-ai-logo.png';

  useEffect(() => {
    if (!active) {
      setPhase(-1);
      return;
    }

    // Start at phase 0 (ready position off-screen)
    setPhase(0);

    const timers = [];
    // Phase 1: Start slide up after a frame (10ms)
    timers.push(setTimeout(() => setPhase(1), 10));
    // Phase 2: Hold with logo (starts at 0.6s)
    timers.push(setTimeout(() => setPhase(2), 600));
    // Phase 3: Auto-trigger CRT death after 5 seconds if user hasn't clicked
    timers.push(setTimeout(() => setPhase(3), 5000));

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [active]);

  // Call onDismiss after CRT death animation completes
  useEffect(() => {
    if (phase === 3) {
      const dismissTimer = setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 500); // CRT death takes 0.5s
      return () => clearTimeout(dismissTimer);
    }
  }, [phase, onDismiss]);

  // Click handler to trigger CRT death
  const handleClick = () => {
    if (phase === 2) {
      setPhase(3);
    }
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
      pointerEvents: phase === 2 ? 'auto' : 'none',
      overflow: 'hidden',
      borderRadius: 6,
      cursor: phase === 2 ? 'pointer' : 'default',
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
          transform: phase <= 0 ? 'translateY(100%)' : (phase === 3 ? 'scaleY(0)' : 'translateY(0%)'),
          animation: phase === 3 ? 'set100logoBrightnessPop 0.4s ease-out forwards' : 'none',
          transition: phase === 3
            ? 'transform 0.4s ease-in'
            : 'transform 0.6s ease-out',
          transformOrigin: 'center center',
          boxSizing: 'border-box',
          border: '3px solid #000',
        }}
      >
        {/* CRT fry/static noise overlay on background - active during slide-up to avoid brightness pop */}
        {phase >= 1 && phase < 3 && (
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
            animation: 'set100logoFry 0.15s steps(4) infinite',
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
            animation: phase === 3 ? 'set100logoShake 0.08s linear 3' : 'none',
          }}
        />
        {/* Rolling horizontal bar artifact */}
        {phase >= 1 && phase < 3 && (
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
              animation: 'set100logoRollingBar 6s linear infinite',
              pointerEvents: 'none',
            }} />
          </div>
        )}
        {/* CRT vignette - darker corners */}
        {phase >= 1 && phase < 3 && (
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
        {phase >= 1 && phase < 3 && (
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
            animation: 'set100logoChroma 0.1s steps(2) infinite',
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
        {phase >= 1 && phase < 3 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.02)',
            pointerEvents: 'none',
            zIndex: 6,
            animation: 'set100logoFlicker 2s ease-in-out infinite',
          }} />
        )}
        {/* CRT horizontal collapse line during death - inside pane to respect borders */}
        {phase === 3 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: 4,
            backgroundColor: '#fff',
            boxShadow: '0 0 40px 20px rgba(255,255,255,1), 0 0 80px 40px rgba(255,255,255,0.8)',
            animation: 'set100logoCrtLine 0.5s ease-out forwards',
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
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

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
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    tenYearsAgo.setMonth(tenYearsAgo.getMonth() + 3); // Need ~252 days lookback
    if (dateObj < tenYearsAgo) {
      setError('DATE OUT OF RANGE');
      return;
    }
    setError('');
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
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
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
        <input ref={yearRef} value={year} onChange={(e) => handleYearChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'year')} style={{ ...segmentStyle, width: 80 }} placeholder="YYYY" />
        <span style={{ color: COLORS.dim, fontFamily: MONO, fontSize: 22 }}>/</span>
        <input ref={monthRef} value={month} onChange={(e) => handleMonthChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'month')} style={{ ...segmentStyle, width: 48 }} placeholder="MM" />
        <span style={{ color: COLORS.dim, fontFamily: MONO, fontSize: 22 }}>/</span>
        <input ref={dayRef} value={day} onChange={(e) => handleDayChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'day')} style={{ ...segmentStyle, width: 48 }} placeholder="DD" />
      </div>

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
  const canvasRef = React.useRef(null);
  const animRef = React.useRef(null);

  useEffect(() => {
    if (!active) { setPhase(-1); return; }
    setPhase(0);
  }, [active]);

  useEffect(() => {
    if (phase < 0) return;
    const timers = [];

    if (phase === 0) {
      // Brief pause then start wormhole
      timers.push(setTimeout(() => setPhase(1), 100));
    } else if (phase === 1) {
      // Run wormhole animation on canvas
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const startTime = Date.now();
      const duration = 2200;
      const numRings = 14;
      const numStreaks = 24;

      // Pre-generate streak angles
      const streakAngles = [];
      for (let i = 0; i < numStreaks; i++) {
        streakAngles.push({
          angle: (Math.PI * 2 * i) / numStreaks + Math.random() * 0.2,
          speed: 0.6 + Math.random() * 0.8,
          width: 1 + Math.random() * 2,
        });
      }

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Accelerating progression
        const eased = progress < 0.7
          ? progress * progress
          : 0.49 + (progress - 0.7) * (progress - 0.7) * 5.67;

        ctx.clearRect(0, 0, w, h);

        // Dark background with slight radial gradient
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
        bgGrad.addColorStop(0, `rgba(0, 8, 20, ${0.95 - eased * 0.3})`);
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Light streaks — radial lines converging to center
        for (const streak of streakAngles) {
          const streakProgress = (eased * streak.speed) % 1;
          const innerR = 10 + (1 - streakProgress) * Math.max(w, h) * 0.5 * eased;
          const outerR = innerR + 40 + streakProgress * 120;
          const alpha = Math.sin(streakProgress * Math.PI) * (0.3 + eased * 0.5);

          ctx.beginPath();
          ctx.moveTo(
            cx + Math.cos(streak.angle + eased * 2) * innerR,
            cy + Math.sin(streak.angle + eased * 2) * innerR
          );
          ctx.lineTo(
            cx + Math.cos(streak.angle + eased * 2) * outerR,
            cy + Math.sin(streak.angle + eased * 2) * outerR
          );
          ctx.strokeStyle = `rgba(255, 200, 50, ${alpha})`;
          ctx.lineWidth = streak.width * (1 + eased);
          ctx.stroke();
        }

        // Concentric rings — shrink inward over time
        for (let i = 0; i < numRings; i++) {
          const ringPhase = (i / numRings + eased * 1.5) % 1;
          const radius = Math.max(w, h) * 0.55 * (1 - ringPhase);
          const alpha = Math.sin(ringPhase * Math.PI) * (0.15 + eased * 0.25);

          if (radius < 3) continue;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 170, 0, ${alpha})`;
          ctx.lineWidth = 1 + (1 - ringPhase) * 2;
          ctx.stroke();
        }

        // Central glow — intensifies as animation progresses
        const glowR = 20 + eased * 60;
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        glowGrad.addColorStop(0, `rgba(255, 255, 255, ${eased * 0.9})`);
        glowGrad.addColorStop(0.3, `rgba(255, 200, 50, ${eased * 0.6})`);
        glowGrad.addColorStop(0.7, `rgba(255, 170, 0, ${eased * 0.2})`);
        glowGrad.addColorStop(1, 'rgba(255, 170, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

        // Date text rushing forward
        if (eased > 0.1) {
          const textAlpha = Math.min(1, (eased - 0.1) * 2);
          const textSize = 14 + eased * 18;
          ctx.font = `${textSize}px Monaco, "Menlo", "Courier New", monospace`;
          ctx.fillStyle = `rgba(255, 200, 50, ${textAlpha * (1 - eased * 0.5)})`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PRESENT DAY', cx, cy + glowR + 30 - eased * 20);
        }

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          // Final white flash
          timers.push(setTimeout(() => setPhase(2), 50));
        }
      };

      animRef.current = requestAnimationFrame(animate);
    } else if (phase === 2) {
      // White flash then complete
      timers.push(setTimeout(() => {
        if (onComplete) onComplete();
      }, 350));
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase, onComplete]);

  if (!active && phase < 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000', zIndex: 100, borderRadius: 6, overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        }}
      />
      {/* White flash at end */}
      {phase === 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#fff', zIndex: 3,
          animation: 'set100tmFlash 0.3s ease-out forwards',
        }} />
      )}
    </div>
  );
}

function TimeMachineTransition({ active, targetDate, onComplete, blueprintContent }) {
  const [phase, setPhase] = useState(-1);
  const [displayDate, setDisplayDate] = useState('');
  const blueprintRef = React.useRef(null);

  useEffect(() => {
    if (!active) { setPhase(-1); setDisplayDate(''); return; }
    setPhase(0);
  }, [active]);

  // Phase transitions
  useEffect(() => {
    if (phase < 0) return;
    const timers = [];

    if (phase === 0) {
      // Init — brief pause before countdown starts
      timers.push(setTimeout(() => setPhase(1), 300));
    } else if (phase === 1) {
      // Flux capacitor: count backwards from today to target (slow → fast)
      // Clock plays against black background — blueprint stays hidden
      const today = new Date();
      const target = new Date(targetDate);
      const totalDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));
      const duration = 3200; // 3.2 seconds
      const startTime = Date.now();

      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-in cubic — starts slow, accelerates rapidly
        const eased = progress * progress * progress;
        const daysBack = Math.floor(eased * totalDays);
        const d = new Date(today);
        d.setDate(d.getDate() - daysBack);
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        setDisplayDate(`${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')} ${d.getFullYear()}`);

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          // Settled on target date — trigger flash
          timers.push(setTimeout(() => setPhase(2), 100));
        }
      };
      requestAnimationFrame(tick);
    } else if (phase === 2) {
      // Flash — then reveal blueprint instantly
      if (blueprintRef.current) {
        blueprintRef.current.style.opacity = '1';
      }
      timers.push(setTimeout(() => {
        if (onComplete) onComplete();
      }, 300));
    }

    return () => timers.forEach(t => clearTimeout(t));
  }, [phase, targetDate, onComplete]);

  if (!active && phase < 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000', zIndex: 100, borderRadius: 6, overflow: 'hidden',
    }}>
      {/* Blueprint content fading in behind the clock */}
      <div ref={blueprintRef} style={{
        opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      }}>
        {blueprintContent}
      </div>

      {/* Clock overlay — centered on top */}
      {(phase === 0 || phase === 1) && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2,
        }}>
          <div style={{
            fontFamily: MONO, fontSize: 28, color: COLORS.amber, letterSpacing: 4,
            textShadow: '0 0 12px rgba(255,170,0,0.8), 0 0 30px rgba(255,170,0,0.4)',
          }}>
            {displayDate || '--- -- ----'}
          </div>
        </div>
      )}

      {/* White flash when clock reaches target */}
      {phase === 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#fff', zIndex: 3,
          animation: 'set100tmFlash 0.3s ease-out forwards',
        }} />
      )}
    </div>
  );
}

function TimeMachineBlueprintOverlay({ stocks, historicalDate, onReturn, loading, benchmarkReturn, onNavigate, signalDatesIndex }) {
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

  const avgReturn = (signals) => {
    if (signals.length === 0) return 0;
    return signals.reduce((sum, r) => sum + r.stock.historicalReturn, 0) / signals.length;
  };

  const greenAvg = avgReturn(greenSignals);
  const yellowAvg = avgReturn(yellowSignals);

  // Format the date for display
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = new Date(historicalDate);
  const dateDisplay = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  const calloutBox = (result, idx) => {
    const { stock, sig, isGreen } = result;
    const returnPct = stock.historicalReturn;
    const returnColor = returnPct >= 0 ? COLORS.green : '#ff4444';
    const signalColor = isGreen ? COLORS.green : COLORS.amber;
    const signalLabel = isGreen ? 'GREEN' : 'YELLOW';

    return (
      <div key={stock.sym} style={{
        border: `1px solid ${signalColor}33`,
        borderRadius: 4,
        padding: '12px 14px',
        minWidth: 120,
        flex: '1 1 120px',
        maxWidth: 160,
        background: `linear-gradient(180deg, ${signalColor}08 0%, transparent 100%)`,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: '#fff', letterSpacing: 2, marginBottom: 8 }}>
          {stock.sym}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: COLORS.dim, marginBottom: 3 }}>
          ${stock.price.toFixed(2)}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: COLORS.dim, marginBottom: 6 }}>
          SCORE: {sig.score}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: signalColor, boxShadow: `0 0 6px ${signalColor}` }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: signalColor, letterSpacing: 1 }}>{signalLabel}</span>
        </div>
        <div style={{ borderTop: `1px solid ${COLORS.dimmer}`, paddingTop: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: COLORS.dim, marginBottom: 2 }}>
            NOW ${stock.currentPrice.toFixed(2)}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 14, color: returnColor, fontWeight: 'bold',
            textShadow: `0 0 8px ${returnColor}66`,
          }}>
            {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
          </div>
        </div>
      </div>
    );
  };

  const signalSection = (label, signals, avg, color) => {
    if (signals.length === 0) return null;
    const avgColor = avg >= 0 ? COLORS.green : '#ff4444';
    return (
      <div style={{
        border: `1px solid ${color}22`,
        borderRadius: 4,
        padding: '14px 16px',
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, color, letterSpacing: 3, marginBottom: 14,
          borderBottom: `1px solid ${color}22`, paddingBottom: 8,
        }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          {signals.map((r, i) => calloutBox(r, i))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: avgColor, letterSpacing: 2, textShadow: `0 0 8px ${avgColor}44` }}>
          AVG RETURN: {avg >= 0 ? '+' : ''}{avg.toFixed(1)}%
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0a0a0a', zIndex: 100, borderRadius: 6,
      overflow: 'auto',
      // Subtle grid lines
      backgroundImage: 'linear-gradient(rgba(255,170,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,170,0,0.03) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}>
      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{
          fontFamily: MONO, fontSize: 13, color: COLORS.amber, letterSpacing: 4,
          textAlign: 'center', marginBottom: 6,
          animation: 'set100tmHeaderPulse 3s ease-in-out infinite',
        }}>
          TIME MACHINE: {dateDisplay}
        </div>
        <div style={{
          height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.amber}44, transparent)`,
          marginBottom: 20,
        }} />

        {loading && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: COLORS.amber, textAlign: 'center', letterSpacing: 2, padding: 40 }}>
            COMPUTING HISTORICAL SIGNALS...
          </div>
        )}

        {!loading && greenSignals.length === 0 && yellowSignals.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: COLORS.dim, textAlign: 'center', letterSpacing: 2, padding: 40 }}>
            NO SIGNALS DETECTED ON THIS DATE
          </div>
        )}

        {!loading && signalSection('GREEN SIGNALS', greenSignals, greenAvg, COLORS.green)}
        {!loading && signalSection('YELLOW SIGNALS', yellowSignals, yellowAvg, COLORS.amber)}

        {/* SPY benchmark comparison */}
        {!loading && benchmarkReturn !== null && benchmarkReturn !== undefined && (
          <div style={{
            fontFamily: MONO, fontSize: 11,
            color: benchmarkReturn >= 0 ? COLORS.green : '#ff4444',
            letterSpacing: 2,
            textShadow: `0 0 8px ${benchmarkReturn >= 0 ? COLORS.green : '#ff4444'}44`,
            textAlign: 'center', marginBottom: 16, marginTop: 8,
            borderTop: `1px solid ${COLORS.dimmer}`, paddingTop: 12,
          }}>
            S&P 500 (SPY) RETURN: {benchmarkReturn >= 0 ? '+' : ''}{benchmarkReturn.toFixed(1)}%
          </div>
        )}

        {/* Estimation notice */}
        {!loading && (greenSignals.length > 0 || yellowSignals.length > 0) && (
          <div style={{ fontFamily: MONO, fontSize: 8, color: COLORS.dimmer, letterSpacing: 1, textAlign: 'center', marginBottom: 16 }}>
            IV AND PERIOD DATA ESTIMATED FROM CURRENT DEFAULTS
          </div>
        )}

        {/* Signal-date navigation */}
        {!loading && onNavigate && historicalDate && signalDatesIndex && signalDatesIndex.length > 0 && (() => {
          const prev = findPrevSignalDate(signalDatesIndex, historicalDate);
          const next = findNextSignalDate(signalDatesIndex, historicalDate);

          if (!prev && !next) return null;

          const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
          const fmtDisplay = (dateStr) => {
            const d = new Date(dateStr + 'T00:00:00');
            return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
          };

          return (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
              marginTop: 12, marginBottom: 8,
              borderTop: `1px solid ${COLORS.dimmer}`, paddingTop: 12,
            }}>
              {prev && (
                <span
                  onClick={() => onNavigate(prev)}
                  style={{
                    fontFamily: MONO, fontSize: 10, letterSpacing: 2,
                    color: COLORS.amber, cursor: 'pointer',
                    textShadow: `0 0 8px ${COLORS.amber}44`,
                    padding: '4px 12px',
                    border: `1px solid ${COLORS.amber}33`,
                    borderRadius: 2,
                  }}
                >
                  ← {fmtDisplay(prev)}
                </span>
              )}
              {next && (
                <span
                  onClick={() => onNavigate(next)}
                  style={{
                    fontFamily: MONO, fontSize: 10, letterSpacing: 2,
                    color: COLORS.amber, cursor: 'pointer',
                    textShadow: `0 0 8px ${COLORS.amber}44`,
                    padding: '4px 12px',
                    border: `1px solid ${COLORS.amber}33`,
                    borderRadius: 2,
                  }}
                >
                  {fmtDisplay(next)} →
                </span>
              )}
            </div>
          );
        })()}

        {/* Return to present button */}
        <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 8 }}>
          <span
            onClick={onReturn}
            style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: 3,
              color: COLORS.amber, cursor: 'pointer', padding: '8px 20px',
              border: `1px solid ${COLORS.amber}66`,
              borderRadius: 2,
              textShadow: '0 0 8px rgba(255,170,0,0.4)',
              display: 'inline-block',
            }}
          >
            RETURN TO PRESENT
          </span>
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
  const [ivEditMode, setIvEditMode] = useState(false);
  const [booted, setBooted] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);
  const [timeMachineInput, setTimeMachineInput] = useState(false);
  const [timeMachineAnimating, setTimeMachineAnimating] = useState(false);
  const [timeMachineTarget, setTimeMachineTarget] = useState(null);
  const [wormholeActive, setWormholeActive] = useState(false);
  const prevLoadingRef = React.useRef(loading);

  // Check sessionStorage on mount to skip boot animation if already booted this session
  // Uses bootChecked guard to prevent single-frame flash of StartupOverlay
  useEffect(() => {
    if (sessionStorage.getItem('sp1000-booted') === 'true') {
      setBooted(true);
    }
    setBootChecked(true);
  }, []);

  const handleBootComplete = React.useCallback(() => {
    setBooted(true);
    sessionStorage.setItem('sp1000-booted', 'true');
  }, []);

  const triggerReturnToPresent = React.useCallback(() => {
    setWormholeActive(true);
  }, []);

  const handleWormholeComplete = React.useCallback(() => {
    setWormholeActive(false);
    onReturnToPresent();
  }, [onReturnToPresent]);

  const triggerTimeMachine = React.useCallback(() => {
    if (glitching || showLogo || timeMachineAnimating || timeMachineInput || wormholeActive) return;
    if (timeMachineDate) {
      // Already in time machine mode — return to present via wormhole
      triggerReturnToPresent();
      return;
    }
    setTimeMachineInput(true);
  }, [glitching, showLogo, timeMachineAnimating, timeMachineInput, wormholeActive, timeMachineDate, triggerReturnToPresent]);

  const handleDateConfirm = React.useCallback((dateStr) => {
    setTimeMachineInput(false);
    setTimeMachineTarget(dateStr);
    setTimeMachineAnimating(true);
    onTimeMachineActivate(dateStr);
  }, [onTimeMachineActivate]);

  const handleFireComplete = React.useCallback(() => {
    setTimeMachineAnimating(false);
    setTimeMachineTarget(null);
  }, []);

  // Track when loading completes to show sync timestamp
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      // Loading just finished - update timestamp and show it
      setLastSynced(new Date());
      setShowSyncTime(true);
      // Hide after 4 seconds
      const timeout = setTimeout(() => setShowSyncTime(false), 4000);
      return () => clearTimeout(timeout);
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  const triggerGlitch = () => {
    if (glitching || showLogo || timeMachineAnimating || timeMachineInput) return;
    setGlitching(true);
    // onDismiss from PixelGlitchOverlay will set glitching=false
  };

  const triggerLogo = () => {
    if (glitching || showLogo || timeMachineAnimating || timeMachineInput) return;
    setShowLogo(true);
    // Logo will rotate until user clicks, then CRT death triggers and onDismiss is called
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#1a1a1a',
        fontFamily: MONO,
      }}
    >
      <style>{`
        @keyframes set100pulse { 0%,100%{opacity:1; filter: brightness(1.3);} 50%{opacity:0.9; filter: brightness(1);} }
        @keyframes set100danger { 0%,100%{opacity:1; filter: brightness(1.3);} 50%{opacity:0.7; filter: brightness(0.9);} }
        @keyframes set100throb {
          0%, 100% { opacity: 1; filter: brightness(1.3); }
          50% { opacity: 0.9; filter: brightness(1); }
        }
        @keyframes set100flicker {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.02; }
          52% { opacity: 0; }
          54% { opacity: 0.01; }
          56% { opacity: 0; }
        }
        @keyframes set100backlightOn {
          0% { opacity: 0.3; filter: brightness(0.5); }
          100% { opacity: 1; filter: brightness(1); }
        }
        @keyframes set100ibmFlicker {
          0%, 92% { opacity: 1; }
          93% { opacity: 0.85; }
          94% { opacity: 1; }
          96% { opacity: 0.9; }
          97% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes set100cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes set100greenSweep {
          0% { left: -100%; opacity: 0; }
          3% { opacity: 1; }
          50% { left: 0%; opacity: 1; }
          60% { left: 0%; opacity: 0; }
          100% { left: 0%; opacity: 0; }
        }
        @keyframes set100lightSweep {
          0%, 100% { transform: translateX(-150%); }
          50% { transform: translateX(150%); }
        }
        @keyframes set100guideCrtLine {
          0% { opacity: 1; width: 150%; filter: brightness(25); }
          30% { opacity: 1; width: 80%; filter: brightness(20); }
          60% { opacity: 1; width: 30%; filter: brightness(12); }
          85% { opacity: 1; width: 8%; filter: brightness(6); }
          100% { opacity: 0; width: 0; filter: brightness(0); }
        }
        @keyframes set100logoCrtLine {
          0% { opacity: 1; width: 100%; filter: brightness(25); }
          30% { opacity: 1; width: 60%; filter: brightness(20); }
          60% { opacity: 1; width: 25%; filter: brightness(12); }
          85% { opacity: 1; width: 8%; filter: brightness(6); }
          100% { opacity: 0; width: 0; filter: brightness(0); }
        }
        @keyframes set100logoShake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-3px, 2px); }
          50% { transform: translate(3px, -1px); }
          75% { transform: translate(-2px, -2px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes set100logoBrightnessPop {
          0% { filter: brightness(1); }
          15% { filter: brightness(4); }
          40% { filter: brightness(2); }
          100% { filter: brightness(3); }
        }
        @keyframes set100logoFry {
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
        @keyframes set100logoScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes set100logoFlicker {
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
        @keyframes set100logoRollingBar {
          0% { top: 40%; }
          100% { top: 120%; }
        }
        @keyframes set100logoChroma {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(1px, 0); }
          50% { transform: translate(0, 1px); }
          75% { transform: translate(-1px, 0); }
        }
        @keyframes set100logoRotate {
          0%, 45% { transform: rotateY(0deg); }
          50%, 95% { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes set100logoFade1 {
          0%, 40% { opacity: 1; }
          50%, 90% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes set100logoFade2 {
          0%, 40% { opacity: 0; }
          50%, 90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes set100crtDeath {
          0% { transform: scaleY(1); filter: brightness(1); }
          60% { transform: scaleY(0.1); filter: brightness(2); }
          80% { transform: scaleY(0.02); filter: brightness(3); }
          100% { transform: scaleY(0); filter: brightness(5); }
        }
        @keyframes set100crtWarmUp {
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
        @keyframes set100phosphorWarmUp {
          0% { opacity: 0; }
          20% { opacity: 0.1; }
          40% { opacity: 0.4; }
          60% { opacity: 0.8; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes set100scanlineWarmUp {
          0% { opacity: 0; }
          30% { opacity: 0.5; }
          60% { opacity: 0.8; }
          80% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes set100rowReveal {
          0% { clip-path: inset(0 100% 0 0); opacity: 0; }
          100% { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes set100warmUpFadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          90% { opacity: 0.4; }
          100% { opacity: 0; }
        }
        @keyframes set100rgbScanlines {
          0% { opacity: 0; }
          20% { opacity: 0.8; }
          50% { opacity: 1; }
          80% { opacity: 0.6; }
          100% { opacity: 0; }
        }
        @keyframes set100laserSweep {
          0% { top: 0%; opacity: 1; }
          100% { top: 100%; opacity: 0.3; }
        }
        @keyframes set100crtFlash {
          0% { opacity: 0; }
          30% { opacity: 0.4; }
          50% { opacity: 0.1; }
          100% { opacity: 0; }
        }
        @keyframes set100overlayOpen {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes set100blueprintFadeIn {
          0% { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes set100tmFlash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes set100tmHeaderPulse {
          0%, 100% { text-shadow: 0 0 8px rgba(255,170,0,0.6); }
          50% { text-shadow: 0 0 16px rgba(255,170,0,0.9), 0 0 32px rgba(255,170,0,0.4); }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: '100vh', padding: 12 }}>
        {/* Housing — matte black anodized aluminum with stainless steel trim */}
        <div
          style={{
            width: '95vw',
            maxWidth: 1300,
            background: 'linear-gradient(180deg, #2d2d2d 0%, #242424 4%, #1e1e1e 50%, #1a1a1a 100%)',
            borderRadius: 16,
            padding: '12px 12px 24px',
            position: 'relative',
            overflow: 'hidden',
            /* Stainless steel trim — bright thin edge all around */
            border: '1.5px solid rgba(180,180,180,0.25)',
            /* Layered shadows: contact shadow, medium spread, deep ambient */
            boxShadow: `
              0 1px 0 rgba(255,255,255,0.07) inset,
              0 2px 3px rgba(0,0,0,0.3),
              0 6px 20px rgba(0,0,0,0.35),
              0 20px 50px rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* Subtle top-edge glare — light catching the housing lip */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.15) 70%, transparent)',
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
            <div
              style={{
                width: '100%',
                position: 'relative',
              }}
            >
              <FrontFace stocks={stocks} today={today} loading={loading} limitReached={limitReached} lastSynced={lastSynced} showSyncTime={showSyncTime} ivEditMode={ivEditMode} onToggleIVEdit={() => setIvEditMode(!ivEditMode)} onStockChange={onStockChange} />
              {bootChecked && !booted && <StartupOverlay onComplete={handleBootComplete} />}
              <PixelGlitchOverlay active={glitching} onDismiss={() => setGlitching(false)} />
              <WhiteFlashOverlay active={showLogo} onDismiss={() => setShowLogo(false)} />
              {timeMachineInput && (
                <TimeMachineDateInput
                  onSubmit={handleDateConfirm}
                  onCancel={() => setTimeMachineInput(false)}
                />
              )}
              <TimeMachineTransition
                active={timeMachineAnimating}
                targetDate={timeMachineTarget}
                onComplete={handleFireComplete}
                blueprintContent={
                  timeMachineStocks ? (
                    <TimeMachineBlueprintOverlay
                      stocks={timeMachineStocks}
                      historicalDate={timeMachineTarget || timeMachineDate}
                      onReturn={triggerReturnToPresent}
                      loading={timeMachineLoading}
                      benchmarkReturn={benchmarkReturn}
                      onNavigate={onTimeMachineNavigate}
                      signalDatesIndex={signalDatesIndex}
                    />
                  ) : null
                }
              />
              {timeMachineDate && timeMachineStocks && !timeMachineAnimating && (
                <TimeMachineBlueprintOverlay
                  stocks={timeMachineStocks}
                  historicalDate={timeMachineDate}
                  onReturn={triggerReturnToPresent}
                  loading={timeMachineLoading}
                  benchmarkReturn={benchmarkReturn}
                  onNavigate={onTimeMachineNavigate}
                  signalDatesIndex={signalDatesIndex}
                />
              )}
              <WormholeTransition
                active={wormholeActive}
                onComplete={handleWormholeComplete}
              />
            </div>
          </div>

          {/* Bottom control strip — mechanical device layout */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 10,
            padding: '0 14px',
          }}>
            {/* Left: function controls — stacked or inline like device buttons */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {onRefresh && (
                <span
                  onClick={loading ? undefined : onRefresh}
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: 2,
                    color: loading ? '#333' : '#666',
                    cursor: loading ? 'default' : 'pointer',
                    textTransform: 'uppercase',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {loading ? 'SYNC…' : 'REFRESH'}
                </span>
              )}
              <span
                onClick={triggerGlitch}
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: glitching ? '#ff3333' : '#666',
                  cursor: glitching ? 'default' : 'pointer',
                  textTransform: 'uppercase',
                  textShadow: glitching ? '0 0 8px rgba(255,51,51,0.8)' : 'none',
                  transition: 'color 0.2s ease',
                }}
              >
                GUIDE
              </span>
              <span
                onClick={triggerTimeMachine}
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: timeMachineDate ? COLORS.amber : '#666',
                  cursor: (glitching || showLogo || timeMachineAnimating) ? 'default' : 'pointer',
                  textTransform: 'uppercase',
                  textShadow: timeMachineDate ? '0 0 8px rgba(255,170,0,0.6)' : 'none',
                  transition: 'color 0.2s ease',
                }}
              >
                {timeMachineDate ? 'RETURN' : 'TIME MACHINE'}
              </span>
            </div>

            {/* Right: SP-1000 model badge — bottom-right like a product logo */}
            <span
              onClick={triggerLogo}
              style={{
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: 3,
                color: showLogo ? '#fff' : '#ccc',
                textTransform: 'uppercase',
                textShadow: showLogo
                  ? '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(255,255,255,0.4)'
                  : '0 0 10px rgba(255,255,255,0.35), 0 0 20px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.05)',
                cursor: (glitching || showLogo) ? 'default' : 'pointer',
                transition: 'color 0.3s ease, text-shadow 0.3s ease',
              }}
            >
              SP-1000
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
