'use client';
// ─────────────────────────────────────────────────────────────
// Endgame.jsx — Backlot Mogul Legacy Report
// Cinematic end screen shown when all 8 lot plots are filled.
// Phased reveal: Wrap Title → Valuation → Filmography →
//   Archetype → Danny Letter → Nova Note → New Game
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react';
import useStore from '../../lib/pacific-dreams/store';
import { BUILDINGS } from '../../lib/pacific-dreams/store';
import { COLORS, MONO, DISPLAY } from './GameStyles';
import { DIALOGUE_BANKS } from '../../lib/pacific-dreams/dialogueEngine';
import { derivePlayStyle } from '../../lib/pacific-dreams/memoryLedger';
import JuicyButton from './JuicyButton';
import { useJuice } from '../../lib/pacific-dreams/juice';

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const fmt = n => {
  if (n < 0) return `-${fmt(-n)}`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
};

const CONFETTI_COLORS = [COLORS.green, COLORS.amber, COLORS.cyan, COLORS.accent, COLORS.white];

const VERDICT_COLORS = {
  blockbuster: COLORS.green,
  hit: COLORS.green,
  'modest hit': COLORS.amber,
  'cult classic': COLORS.cyan,
  flop: COLORS.red,
};

// ═══════════════════════════════════════════
// CONFETTI BLAST (local copy from Premiere)
// ═══════════════════════════════════════════

function ConfettiBlast() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.3,
      rotation: Math.random() * 360,
      size: 4 + Math.random() * 4,
      drift: (Math.random() - 0.5) * 60,
    }))
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 60, overflow: 'hidden',
    }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: -10,
          width: p.size, height: p.size, background: p.color,
          transform: `rotate(${p.rotation}deg)`,
          animation: `pdConfettiFall 2.5s ease-in ${p.delay}s forwards`,
          opacity: 0, animationFillMode: 'forwards',
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// SECTION REVEAL WRAPPER
// ═══════════════════════════════════════════

function Reveal({ phase, at, children, style = {} }) {
  return (
    <div style={{
      opacity: phase >= at ? 1 : 0,
      transform: phase >= at ? 'none' : 'translateY(12px)',
      transition: 'all 0.6s ease',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════
// ENDGAME COMPONENT
// ═══════════════════════════════════════════

export default function Endgame() {
  const funds = useStore(s => s.funds);
  const history = useStore(s => s.history);
  const plots = useStore(s => s.plots);
  const ledger = useStore(s => s.ledger);
  const novaIntroduced = useStore(s => s.novaIntroduced);
  const resetGame = useStore(s => s.resetGame);
  const filmNumber = useStore(s => s.filmNumber);

  const { clickFeedback, positiveFeedback, cashFeedback, stampFeedback } = useJuice();

  const [revealPhase, setRevealPhase] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const timersRef = useRef([]);

  // ── Compute all endgame data once ──
  const data = useMemo(() => {
    // Lot asset value
    const lotAssetValue = plots
      .filter(p => p !== null)
      .reduce((sum, plot) => {
        if (plot.type === 'building' && BUILDINGS[plot.id]) {
          return sum + (BUILDINGS[plot.id].cost || 0);
        }
        if (plot.type === 'ride') {
          return sum + (plot.cost || 0);
        }
        return sum; // studio home + park gate contribute 0
      }, 0);

    const totalValuation = funds + lotAssetValue;

    // Career stats
    const blockbusters = history.filter(f => f.verdict === 'blockbuster').length;
    const hits = history.filter(f => f.verdict === 'hit').length;
    const flops = history.filter(f => f.verdict === 'flop').length;
    const totalBoxOffice = history.reduce((sum, f) => sum + (f.earnings || 0), 0);

    // Play style archetype
    const playStyle = derivePlayStyle(ledger);

    // Danny: success vs struggle
    const successCount = blockbusters + hits;
    const isStrongCareer = successCount > flops && funds >= 100_000_000;
    const dannyLine = isStrongCareer
      ? DIALOGUE_BANKS.DANNY.endgame_success
      : DIALOGUE_BANKS.DANNY.endgame_struggle;

    // Nova's note
    const novaLine = novaIntroduced ? DIALOGUE_BANKS.NOVA.endgame : null;

    return {
      funds, lotAssetValue, totalValuation,
      blockbusters, hits, flops, totalBoxOffice,
      playStyle, isStrongCareer,
      dannyLine, novaLine,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer chain for phased reveal ──
  useEffect(() => {
    const schedule = (fn, delay) => {
      const t = setTimeout(fn, delay);
      timersRef.current.push(t);
    };

    // Phase 1: "THAT'S A WRAP" (800ms)
    schedule(() => { setRevealPhase(1); stampFeedback(); }, 800);

    // Phase 2: Studio Valuation (2400ms)
    schedule(() => { setRevealPhase(2); cashFeedback(); }, 2400);

    // Phase 3: Filmography (4000ms)
    schedule(() => { setRevealPhase(3); clickFeedback(); }, 4000);

    // Phase 4: Archetype Reveal (5800ms)
    schedule(() => { setRevealPhase(4); positiveFeedback(); }, 5800);

    // Phase 5: Danny's Letter (7600ms)
    schedule(() => { setRevealPhase(5); clickFeedback(); }, 7600);

    if (data.novaLine) {
      // Phase 6: Nova's Note (9200ms)
      schedule(() => { setRevealPhase(6); clickFeedback(); }, 9200);
      // Phase 7: NEW GAME (10800ms)
      schedule(() => {
        setRevealPhase(7);
        if (data.isStrongCareer) setShowConfetti(true);
      }, 10800);
    } else {
      // Skip Nova — go straight to NEW GAME
      schedule(() => {
        setRevealPhase(7);
        if (data.isStrongCareer) setShowConfetti(true);
      }, 9200);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div style={{
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      fontFamily: MONO,
    }}>

      {showConfetti && <ConfettiBlast />}

      {/* ── Section 1: THAT'S A WRAP ── */}
      <Reveal phase={revealPhase} at={1} style={{ textAlign: 'center', padding: '12px 0 8px' }}>
        <div style={{
          fontFamily: MONO, fontSize: 7, letterSpacing: 4,
          color: COLORS.textMuted, marginBottom: 6,
        }}>
          PACIFIC DREAMS STUDIOS PRESENTS
        </div>
        <div style={{
          fontFamily: DISPLAY, fontSize: 18, fontWeight: 700,
          letterSpacing: 4, color: COLORS.amber,
          textShadow: `0 0 20px ${COLORS.amber}44`,
          animation: revealPhase >= 1 ? 'pdStamp 0.4s ease-out both' : 'none',
        }}>
          THAT'S A WRAP
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 9, color: COLORS.textDim,
          marginTop: 6, letterSpacing: 1,
        }}>
          {history.length} FILMS COMPLETED
        </div>
      </Reveal>

      {/* ── Section 2: STUDIO VALUATION ── */}
      <Reveal phase={revealPhase} at={2}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <div style={{
            fontSize: 7, letterSpacing: 3, color: COLORS.textMuted,
            marginBottom: 8, textTransform: 'uppercase',
          }}>
            Studio Valuation
          </div>

          {/* Treasury */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: COLORS.textDim }}>Treasury</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: data.funds >= 0 ? COLORS.green : COLORS.red }}>
              {fmt(data.funds)}
            </span>
          </div>

          {/* Lot Assets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: COLORS.textDim }}>Lot Assets</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.amber }}>
              {fmt(data.lotAssetValue)}
            </span>
          </div>

          {/* Total Box Office */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: COLORS.textDim }}>Lifetime Box Office</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.cyan }}>
              {fmt(data.totalBoxOffice)}
            </span>
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, marginBottom: 6 }} />

          {/* Total Valuation */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, letterSpacing: 1 }}>
              TOTAL VALUATION
            </span>
            <span style={{
              fontSize: 12, fontWeight: 700, color: COLORS.green,
              textShadow: `0 0 8px ${COLORS.green}33`,
            }}>
              {fmt(data.totalValuation)}
            </span>
          </div>
        </div>
      </Reveal>

      {/* ── Section 3: FILMOGRAPHY ── */}
      <Reveal phase={revealPhase} at={3}>
        <div style={{
          fontSize: 7, letterSpacing: 3, color: COLORS.textMuted,
          textTransform: 'uppercase', marginBottom: 4,
        }}>
          Filmography
        </div>

        <div style={{
          maxHeight: 160, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          {history.slice().reverse().map((film, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6, padding: '5px 10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 9, color: COLORS.text }}>
                  <span style={{ color: COLORS.textMuted, marginRight: 4 }}>#{film.number}</span>
                  {film.title || 'UNTITLED'}
                </div>
                <div style={{ fontSize: 7, color: COLORS.textDim, marginTop: 1 }}>
                  {film.genre?.toUpperCase()} · {fmt(film.movieBudget || film.budget || 0)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: 1,
                  color: VERDICT_COLORS[film.verdict] || COLORS.text,
                }}>
                  {film.verdict?.toUpperCase()}
                </div>
                <div style={{ fontSize: 7, color: COLORS.textDim }}>
                  {fmt(film.earnings || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div style={{
          fontSize: 8, color: COLORS.textDim, textAlign: 'center',
          marginTop: 6, letterSpacing: 1,
        }}>
          {history.length} FILMS · {fmt(data.totalBoxOffice)} GROSS · {data.blockbusters} BLOCKBUSTER{data.blockbusters !== 1 ? 'S' : ''}
        </div>
      </Reveal>

      {/* ── Section 4: ARCHETYPE REVEAL ── */}
      <Reveal phase={revealPhase} at={4} style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{
          fontSize: 7, letterSpacing: 3, color: COLORS.textMuted,
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          Your Legacy
        </div>
        <div style={{
          fontFamily: DISPLAY, fontSize: 16, fontWeight: 700,
          color: COLORS.cyan, letterSpacing: 3,
          textShadow: `0 0 16px ${COLORS.cyan}44`,
          animation: revealPhase >= 4 ? 'pdStamp 0.4s ease-out both' : 'none',
        }}>
          {data.playStyle.label?.toUpperCase()}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 9, color: COLORS.textDim,
          marginTop: 8, lineHeight: 1.6, maxWidth: 320,
          marginLeft: 'auto', marginRight: 'auto',
          fontStyle: 'italic',
        }}>
          "{data.playStyle.description}"
        </div>
      </Reveal>

      {/* ── Section 5: DANNY'S LETTER ── */}
      <Reveal phase={revealPhase} at={5}>
        <div style={{
          fontSize: 7, letterSpacing: 3, color: COLORS.textMuted,
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          From: Danny Sullivan
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.dannyLine.split('\n').map((line, i) => (
            <div key={i} style={{
              background: `${COLORS.green}18`,
              border: `1px solid ${COLORS.green}22`,
              borderRadius: 12, borderBottomLeftRadius: i === data.dannyLine.split('\n').length - 1 ? 4 : 12,
              padding: '6px 10px',
              fontSize: 9, color: 'rgba(255,255,255,0.7)',
              maxWidth: '85%', lineHeight: 1.4,
            }}>
              {line}
            </div>
          ))}
        </div>
      </Reveal>

      {/* ── Section 6: NOVA'S NOTE (conditional) ── */}
      {data.novaLine && (
        <Reveal phase={revealPhase} at={6}>
          <div style={{
            background: `${COLORS.orange}08`,
            border: `1px solid ${COLORS.orange}18`,
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div style={{
              fontSize: 7, letterSpacing: 3, color: COLORS.orange,
              textTransform: 'uppercase', marginBottom: 6, opacity: 0.7,
            }}>
              A Letter from Nova Chase
            </div>
            <div style={{
              fontSize: 9, color: 'rgba(255,255,255,0.55)',
              fontStyle: 'italic', lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {data.novaLine}
            </div>
          </div>
        </Reveal>
      )}

      {/* ── Section 7: NEW GAME ── */}
      <Reveal phase={revealPhase} at={7} style={{ paddingTop: 4, paddingBottom: 8 }}>
        <JuicyButton
          onClick={resetGame}
          style={{
            width: '100%',
            fontFamily: DISPLAY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            padding: '14px 20px',
            textAlign: 'center',
            color: COLORS.amber,
            background: `${COLORS.amber}0a`,
            border: `1px solid ${COLORS.amber}33`,
            borderRadius: 8,
          }}
        >
          NEW GAME
        </JuicyButton>
      </Reveal>

    </div>
  );
}
