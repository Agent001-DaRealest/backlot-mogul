'use client';
// ─────────────────────────────────────────────────────────────
// CombinedLot.jsx — Backlot Mogul Studio Lot Builder
// 2×4 grid with mountain landscape, building/ride placement,
// Danny messages, and "Next Film" continuation.
// Adapted from the prop-driven CombinedLot.jsx into store-driven.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import useStore, { valueToStars, BUILDINGS } from '../../lib/pacific-dreams/store';
import { COLORS, MONO, DISPLAY } from './GameStyles';
import JuicyButton from './JuicyButton';
import { useJuice } from '../../lib/pacific-dreams/juice';

// ═══════════════════════════════════════════
// RIDE ICONS — genre → emoji mapping
// ═══════════════════════════════════════════
const RIDE_ICONS = {
  action: '🎢', horror: '👻', comedy: '🎪', drama: '🎭',
  romance: '💕', scifi: '🚀', animated: '🎨',
};

// ═══════════════════════════════════════════
// FORMAT MONEY — compact display
// ═══════════════════════════════════════════
const fmt = n => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

// ═══════════════════════════════════════════
// STAR DISPLAY — Full stars, discrete steps
// ═══════════════════════════════════════════
function StarDisplay({ count, max = 5, size = 14, color = '#f1c40f', label }) {
  const [prevCount, setPrevCount] = useState(count);
  const [popIndex, setPopIndex] = useState(-1);

  useEffect(() => {
    if (count !== prevCount) {
      const changed = count > prevCount ? count - 1 : prevCount - 1;
      setPopIndex(changed);
      setPrevCount(count);
      const t = setTimeout(() => setPopIndex(-1), 400);
      return () => clearTimeout(t);
    }
  }, [count, prevCount]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {label && (
        <div style={{
          fontFamily: MONO, fontSize: 7,
          color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginRight: 2,
        }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', gap: 1 }}>
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < count;
          const popping = i === popIndex;
          return (
            <div key={i} style={{
              fontSize: size, lineHeight: 1,
              transition: 'all 0.3s',
              transform: popping ? 'scale(1.4)' : 'scale(1)',
              filter: filled ? `drop-shadow(0 0 4px ${color})` : 'none',
              opacity: filled ? 1 : 0.15,
            }}>★</div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MOUNTAIN LANDSCAPE — SVG frame
// Evolves as more plots are filled
// ═══════════════════════════════════════════
function MountainFrame({ plotsFilled }) {
  const wild = plotsFilled <= 2;
  const developing = plotsFilled <= 4;
  const established = plotsFilled <= 6;

  const skyColor = wild ? '#0a0e1a' : developing ? '#0c1020' : '#0e1428';
  const mountainColor = wild ? '#1a2a1a' : developing ? '#1e2e22' : '#1a2818';

  return (
    <svg width="100%" height="100%" viewBox="0 0 420 280" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <defs>
        <linearGradient id="pdLotSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060810" />
          <stop offset="40%" stopColor={skyColor} />
          <stop offset="100%" stopColor="#0a0e14" />
        </linearGradient>
        <linearGradient id="pdLotMtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3a2a" />
          <stop offset="100%" stopColor={mountainColor} />
        </linearGradient>
        <linearGradient id="pdLotMtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2e1e" />
          <stop offset="100%" stopColor="#0e1a0e" />
        </linearGradient>
      </defs>

      <rect width="420" height="280" fill="url(#pdLotSky)" />

      {/* Stars — fixed positions to avoid hydration mismatch */}
      {[
        { cx: 30, cy: 12, r: 0.8, o: 0.4 }, { cx: 85, cy: 25, r: 0.5, o: 0.3 },
        { cx: 140, cy: 8, r: 0.7, o: 0.5 }, { cx: 200, cy: 35, r: 0.4, o: 0.2 },
        { cx: 250, cy: 15, r: 0.9, o: 0.6 }, { cx: 310, cy: 42, r: 0.5, o: 0.3 },
        { cx: 360, cy: 10, r: 0.6, o: 0.4 }, { cx: 400, cy: 30, r: 0.4, o: 0.5 },
        { cx: 60, cy: 50, r: 0.3, o: 0.2 }, { cx: 120, cy: 60, r: 0.5, o: 0.3 },
        { cx: 180, cy: 18, r: 0.6, o: 0.4 }, { cx: 230, cy: 55, r: 0.4, o: 0.3 },
        { cx: 290, cy: 5, r: 0.7, o: 0.5 }, { cx: 340, cy: 65, r: 0.3, o: 0.2 },
        { cx: 380, cy: 48, r: 0.5, o: 0.4 }, { cx: 15, cy: 70, r: 0.4, o: 0.3 },
        { cx: 105, cy: 40, r: 0.6, o: 0.5 }, { cx: 270, cy: 28, r: 0.5, o: 0.4 },
        { cx: 330, cy: 22, r: 0.8, o: 0.6 }, { cx: 410, cy: 55, r: 0.3, o: 0.2 },
      ].map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r}
          fill="rgba(255,255,255,0.4)" opacity={s.o} />
      ))}

      {/* Far mountains */}
      <path d="M0,120 L40,70 L80,95 L130,50 L180,85 L210,40 L250,75 L290,55 L340,80 L380,45 L420,90 L420,180 L0,180 Z"
        fill="url(#pdLotMtn2)" opacity="0.6" />

      {/* Near mountains */}
      <path d="M0,140 L30,105 L70,125 L110,90 L160,120 L200,80 L240,110 L280,75 L330,100 L370,70 L420,110 L420,200 L0,200 Z"
        fill="url(#pdLotMtn1)" opacity="0.8" />

      {/* Trees (appear on mountains when wild) */}
      {wild && <>
        <text x="20" y="130" fontSize="10" opacity="0.5">🌲</text>
        <text x="55" y="118" fontSize="8" opacity="0.4">🌲</text>
        <text x="350" y="100" fontSize="10" opacity="0.5">🌲</text>
        <text x="385" y="112" fontSize="8" opacity="0.4">🌲</text>
        <text x="170" y="86" fontSize="7" opacity="0.3">🌲</text>
      </>}

      {/* Road/path at bottom */}
      <rect x="0" y="195" width="420" height="85" fill="#0a0e0a" opacity="0.5" />
      <line x1="0" y1="196" x2="420" y2="196" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Development markers */}
      {!wild && <>
        <line x1="40" y1="200" x2="40" y2="148" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <line x1="380" y1="200" x2="380" y2="148" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      </>}

      {/* Studio sign (only when established+) */}
      {established && !wild && !developing && (
        <text x="160" y="50" fontFamily={MONO} fontSize="6"
          fill="rgba(255,255,255,0.12)" letterSpacing="2">
          PACIFIC DREAMS
        </text>
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════
// PLOT TILE — Individual grid cell
// ═══════════════════════════════════════════
function PlotTile({ plot, index, onTap }) {
  const [hover, setHover] = useState(false);

  if (!plot) {
    return (
      <div
        onClick={() => onTap?.(index)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '100%', height: '100%',
          background: hover ? 'rgba(57,255,20,0.06)' : 'rgba(255,255,255,0.02)',
          border: `1px dashed ${hover ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, opacity: 0.15 }}>⛰️</div>
          <div style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.15)', marginTop: 2 }}>EMPTY</div>
        </div>
      </div>
    );
  }

  const isHome = plot.id === 'home';
  const isGate = plot.id === 'gate';
  const isRide = plot.type === 'ride';

  const bgColor = isHome ? 'rgba(57,255,20,0.06)' :
    isGate ? 'rgba(255,158,100,0.06)' :
    isRide ? 'rgba(241,196,15,0.06)' :
    'rgba(255,255,255,0.04)';

  const borderColor = isHome ? 'rgba(57,255,20,0.2)' :
    isGate ? 'rgba(255,158,100,0.2)' :
    isRide ? 'rgba(241,196,15,0.2)' :
    'rgba(255,255,255,0.1)';

  return (
    <div
      onClick={() => onTap?.(index)}
      style={{
        width: '100%', height: '100%',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.2s',
        padding: 3,
      }}
    >
      <div style={{ fontSize: 20, lineHeight: 1, filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.1))' }}>
        {plot.icon}
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.5)',
        textAlign: 'center', marginTop: 2, lineHeight: 1.2,
        maxWidth: '100%', overflow: 'hidden',
      }}>
        {plot.label || plot.filmTitle || plot.id}
      </div>
      {isRide && plot.income && (
        <div style={{ fontFamily: MONO, fontSize: 5, color: COLORS.green, marginTop: 1 }}>
          {fmt(plot.income)}/wk
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// BUILD MENU — Overlay for selecting what to build
// ═══════════════════════════════════════════
function BuildMenu({ funds, builtIds, availableRides, onBuild, onClose }) {
  const [tab, setTab] = useState('buildings');

  const unbuilt = Object.values(BUILDINGS).filter(b => !builtIds.includes(b.id));

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 10, color: '#fff', letterSpacing: 1 }}>BUILD</div>
        <div onClick={onClose} style={{
          fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
        }}>✕</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {['buildings', 'rides'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{
            flex: 1, textAlign: 'center', padding: '6px 0',
            fontFamily: MONO, fontSize: 8, letterSpacing: 1, cursor: 'pointer',
            color: tab === t ? COLORS.orange : 'rgba(255,255,255,0.25)',
            borderBottom: tab === t ? `2px solid ${COLORS.orange}` : '2px solid transparent',
          }}>
            {t.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px' }}>
        {tab === 'buildings' && unbuilt.map(b => {
          const canAfford = funds >= b.cost;
          return (
            <div key={b.id} onClick={() => canAfford && onBuild({ type: 'building', ...b })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${canAfford ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'}`,
                opacity: canAfford ? 1 : 0.35,
                cursor: canAfford ? 'pointer' : 'not-allowed',
              }}
            >
              <div style={{ fontSize: 18 }}>{b.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>{b.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>{b.desc}</div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: canAfford ? COLORS.green : COLORS.red }}>
                {fmt(b.cost)}
              </div>
            </div>
          );
        })}

        {tab === 'buildings' && unbuilt.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 20 }}>
            All buildings constructed!
          </div>
        )}

        {tab === 'rides' && availableRides.map((r, i) => {
          const canAfford = funds >= r.cost;
          return (
            <div key={i} onClick={() => canAfford && onBuild({
              type: 'ride', icon: RIDE_ICONS[r.genre] || '🎬', filmTitle: r.title,
              genre: r.genre, income: r.income, cost: r.cost, label: `${r.title} Ride`,
            })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                background: 'rgba(241,196,15,0.04)',
                border: '1px solid rgba(241,196,15,0.1)',
                cursor: canAfford ? 'pointer' : 'not-allowed',
                opacity: canAfford ? 1 : 0.35,
              }}
            >
              <div style={{ fontSize: 18 }}>{RIDE_ICONS[r.genre] || '🎬'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>{r.title} Ride</div>
                <div style={{ fontFamily: MONO, fontSize: 7, color: COLORS.amber }}>{fmt(r.income)}/wk</div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: canAfford ? COLORS.green : COLORS.red }}>
                {fmt(r.cost)}
              </div>
            </div>
          );
        })}

        {tab === 'rides' && availableRides.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 20 }}>
            Make a hit film to unlock rides!
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DANNY TEXT MESSAGE — iMessage-style display
// ═══════════════════════════════════════════
function DannyMessage({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      height: '100%', padding: '6px 8px', gap: 3,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 6, color: '#666', letterSpacing: 1 }}>🍺 DANNY</div>
      {lines.map((line, i) => (
        <div key={i} style={{
          background: 'rgba(57,255,20,0.1)',
          borderRadius: '8px 8px 8px 2px',
          padding: '4px 8px',
          maxWidth: '90%',
        }}>
          <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            {line}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// COMBINED LOT — Main component
// ═══════════════════════════════════════════

export default function CombinedLot() {
  // ── Store state ──
  const plots = useStore(s => s.plots);
  const funds = useStore(s => s.funds);
  const filmNumber = useStore(s => s.filmNumber);
  const history = useStore(s => s.history);
  const qualityInternal = useStore(s => s.qualityInternal);
  const hypeInternal = useStore(s => s.hypeInternal);
  const dannyLastMessage = useStore(s => s.dannyLastMessage);
  const novaState = useStore(s => s.novaState);

  // ── Store actions ──
  const buildOnPlot = useStore(s => s.buildOnPlot);
  const demolishPlot = useStore(s => s.demolishPlot);
  const setPhase = useStore(s => s.setPhase);

  // ── Store computed helpers ──
  const getRepStars = useStore(s => s.getRepStars);
  const getBuiltBuildings = useStore(s => s.getBuiltBuildings);
  const isLotFull = useStore(s => s.isLotFull);

  // ── Juice ──
  const { clickFeedback, cashFeedback, positiveFeedback } = useJuice();

  // ── Derived values ──
  const qualityStars = valueToStars(qualityInternal);
  const hypeStars = valueToStars(hypeInternal);
  const repStars = getRepStars();
  const builtIds = getBuiltBuildings();

  // ── Local state ──
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showPlotDetail, setShowPlotDetail] = useState(null);

  const plotsFilled = plots.filter(p => p !== null).length;

  // Available rides from hit/blockbuster films not yet placed
  const availableRides = history
    .filter(f => ['hit', 'blockbuster'].includes(f.verdict))
    .filter(f => !plots.some(p => p && p.type === 'ride' && p.filmTitle === f.title))
    .map(f => ({
      title: f.title || `Film #${f.number}`,
      genre: f.genre,
      income: f.verdict === 'blockbuster' ? 6000 : 4000,
      cost: f.verdict === 'blockbuster' ? 30000 : 15000,
    }));

  // Nova headline (stub — full integration in Phase 6)
  const novaHeadline = novaState?.introduced ? null : null;

  // Danny text (stub — full integration in Phase 6)
  const dannyText = dannyLastMessage || null;

  function handlePlotTap(index) {
    const plot = plots[index];
    if (!plot) {
      setSelectedPlot(index);
      setShowBuildMenu(true);
      clickFeedback();
    } else if (plot.id !== 'home' && plot.id !== 'gate') {
      setShowPlotDetail(index);
      clickFeedback();
    }
  }

  function handleBuild(item) {
    if (selectedPlot !== null) {
      buildOnPlot(selectedPlot, item);
      cashFeedback();
      setShowBuildMenu(false);
      setSelectedPlot(null);

      // Check endgame after build
      // Note: isLotFull() reads from the store which was just updated
      setTimeout(() => {
        if (isLotFull()) {
          setPhase('endgame');
        }
      }, 0);
    }
  }

  function handleContinue() {
    setPhase('preprod');
  }

  // Grid layout: 4 columns × 2 rows
  const GRID = [
    [0, 1, 2, 3],  // back row (farther from viewer)
    [4, 5, 6, 7],  // front row (Studio Home + Park Gate)
  ];

  const CELL_W = 88;
  const CELL_H = 60;
  const GAP = 6;
  const GRID_W = CELL_W * 4 + GAP * 3;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#060808',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Mountain landscape behind grid */}
      <MountainFrame plotsFilled={plotsFilled} />

      {/* TOP BAR — Stars + Studio Name */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px 4px',
      }}>
        <div>
          <div style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>
            PACIFIC DREAMS
          </div>
          <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
            Studios & Resort · Film #{filmNumber + 1}
          </div>
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 12, fontWeight: 700,
          color: COLORS.green,
          textShadow: `0 0 6px rgba(57,255,20,0.25)`,
        }}>
          {fmt(funds)}
        </div>
      </div>

      {/* STARS ROW */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', justifyContent: 'center', gap: 16,
        padding: '2px 12px 6px',
      }}>
        <StarDisplay count={qualityStars} label="QUALITY" size={12} color={COLORS.green} />
        <StarDisplay count={hypeStars} label="HYPE" size={12} color={COLORS.amber} />
        <StarDisplay count={repStars} label="REP" size={12} color={COLORS.orange} />
      </div>

      {/* GRID AREA */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 12px',
      }}>
        <div style={{
          width: GRID_W, maxWidth: '100%',
          display: 'flex', flexDirection: 'column', gap: GAP,
        }}>
          {GRID.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: GAP }}>
              {row.map(pi => (
                <div key={pi} style={{ width: CELL_W, height: CELL_H, flexShrink: 0 }}>
                  <PlotTile
                    plot={plots[pi]}
                    index={pi}
                    onTap={handlePlotTap}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* DANNY MESSAGE / NOVA NEWS — Bottom area */}
      <div style={{
        position: 'relative', zIndex: 5,
        height: 80, flexShrink: 0,
        padding: '0 12px 8px',
      }}>
        {novaHeadline ? (
          <div style={{
            height: '100%',
            background: 'rgba(255,158,100,0.04)',
            border: '1px solid rgba(255,158,100,0.1)',
            borderRadius: 8, padding: '6px 10px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: MONO, fontSize: 6, color: COLORS.orange, letterSpacing: 1, marginBottom: 3 }}>
              ⚡ NOVA PICTURES
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              {novaHeadline}
            </div>
          </div>
        ) : dannyText ? (
          <div style={{
            height: '100%',
            background: 'rgba(57,255,20,0.02)',
            border: '1px solid rgba(57,255,20,0.08)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            <DannyMessage text={dannyText} />
          </div>
        ) : (
          <div style={{
            height: '100%',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.15)' }}>
              {plotsFilled < 8 ? `${8 - plotsFilled} plots remaining` : 'LOT COMPLETE'}
            </div>
          </div>
        )}
      </div>

      {/* CONTINUE BUTTON — Make next film */}
      <div style={{ position: 'relative', zIndex: 5, padding: '0 12px 10px' }}>
        <JuicyButton
          onClick={handleContinue}
          soundOverride={positiveFeedback}
          style={{
            fontFamily: DISPLAY,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 3,
            padding: '12px',
            textAlign: 'center',
            width: '100%',
            color: COLORS.orange,
            borderColor: `${COLORS.orange}40`,
            background: `linear-gradient(180deg,rgba(255,158,100,0.12),rgba(255,158,100,0.06))`,
            border: `1px solid rgba(255,158,100,0.25)`,
          }}
        >
          ▶ NEXT FILM
          <div style={{ fontFamily: MONO, fontSize: 7, color: `${COLORS.orange}66`, marginTop: 2, fontWeight: 400, letterSpacing: 1 }}>
            {filmNumber === 0 ? 'Make your first movie' : `Film #${filmNumber + 1}`}
          </div>
        </JuicyButton>
      </div>

      {/* BUILD MENU OVERLAY */}
      {showBuildMenu && (
        <BuildMenu
          funds={funds}
          builtIds={builtIds}
          availableRides={availableRides}
          onBuild={handleBuild}
          onClose={() => { setShowBuildMenu(false); setSelectedPlot(null); }}
        />
      )}

      {/* PLOT DETAIL OVERLAY */}
      {showPlotDetail !== null && plots[showPlotDetail] && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setShowPlotDetail(null)}>
          <div style={{ fontSize: 40 }}>{plots[showPlotDetail].icon}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 14, color: '#fff', letterSpacing: 1, marginTop: 8 }}>
            {plots[showPlotDetail].label || plots[showPlotDetail].filmTitle}
          </div>
          {plots[showPlotDetail].desc && (
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 6, textAlign: 'center' }}>
              {plots[showPlotDetail].desc}
            </div>
          )}
          {plots[showPlotDetail].type === 'ride' && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: COLORS.amber, marginTop: 8 }}>
              Income: {fmt(plots[showPlotDetail].income)}/wk
            </div>
          )}
          {plots[showPlotDetail].id !== 'home' && plots[showPlotDetail].id !== 'gate' && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                demolishPlot(showPlotDetail);
                setShowPlotDetail(null);
              }}
              style={{
                marginTop: 16, padding: '8px 20px', borderRadius: 6,
                fontFamily: MONO, fontSize: 9, color: COLORS.red,
                border: `1px solid rgba(255,68,68,0.2)`,
                background: 'rgba(255,68,68,0.06)',
                cursor: 'pointer',
              }}
            >
              DEMOLISH
            </div>
          )}
          <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
            tap anywhere to close
          </div>
        </div>
      )}
    </div>
  );
}
