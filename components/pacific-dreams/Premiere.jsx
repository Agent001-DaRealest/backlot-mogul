'use client';
// ─────────────────────────────────────────────────────────────
// Premiere.jsx — Backlot Mogul Premiere Night
// Phased "loot box" reveal: dark → reviews → average → box office →
// profit → drumroll → verdict stamp → consequences → next button
// Uses new Backlot store (qualityInternal/hypeInternal, completeFilm)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react';
import useStore, { valueToStars } from '../../lib/pacific-dreams/store';
import { TAGS } from '../../lib/pacific-dreams/memoryLedger';
import { checkPremiereConsequences } from '../../lib/pacific-dreams/consequenceEngine';
import { COLORS, MONO, DISPLAY, sectionLabel } from './GameStyles';
import { NPCQuote } from './DialogueComponents';
import { getDialogue, CHARACTERS } from '../../lib/pacific-dreams/dialogueEngine';
import JuicyButton from './JuicyButton';
import { useJuice } from '../../lib/pacific-dreams/juice';

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const BOX_OFFICE_WEEKS = 12;
const WEEKLY_REVENUE_PER_THEATER = 25_000; // Calibrated for Hollywood-scale budgets ($15M-$120M)

const REVIEWERS = [
  { name: 'Pacific Herald', skew: 0.066, tone: 'generous' },
  { name: 'Sunset Tribune', skew: 0.1, tone: 'enthusiastic' },
  { name: 'Coast Weekly', skew: -0.18, tone: 'ruthless' },
  { name: 'Dream Factory Digest', skew: 0, tone: 'neutral' },
  { name: 'The Evening Reel', skew: -0.12, tone: 'skeptical' },
];

const VERDICT_COLORS = {
  BLOCKBUSTER: COLORS.green,
  HIT: COLORS.green,
  'MODEST HIT': COLORS.amber,
  'CULT CLASSIC': COLORS.cyan,
  FLOP: COLORS.red,
};

const CONFETTI_COLORS = [COLORS.green, COLORS.amber, COLORS.cyan, COLORS.accent, COLORS.white];

// ═══════════════════════════════════════════
// GAME MATH — box office, reviews, verdict, reputation
// All adapted from engine.js but using internal 0-100 values
// ═══════════════════════════════════════════

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function formatMoney(amount) {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

/**
 * Generate reviews using quality stars (1-5) as the basis.
 * Stars map to a base score: 1★=3, 2★=4.5, 3★=6, 4★=7.5, 5★=9
 * Each reviewer adds their skew for variety.
 */
function generateReviews(qualityInternal) {
  const qualityStars = valueToStars(qualityInternal);
  // Map stars to a base review score (1-10 scale)
  const BASE_MAP = [0, 3, 4.5, 6, 7.5, 9];
  const baseScore = BASE_MAP[qualityStars] || 5;

  const randomSeed = Math.random();

  const scores = REVIEWERS.map(reviewer => {
    const variation = (Math.random() - 0.5) * 2; // ±1 random noise
    const skewEffect = reviewer.skew * 10; // Scale skew to meaningful range
    const rawScore = baseScore + variation + skewEffect;
    const score = Math.min(10, Math.max(1, Math.round(rawScore)));
    return { name: reviewer.name, score, tone: reviewer.tone };
  });

  const averageScore = Math.round(
    (scores.reduce((sum, r) => sum + r.score, 0) / scores.length) * 10
  ) / 10;

  return { scores, averageScore };
}

/**
 * Simulate box office run using internal quality (0-100) and hype (0-100).
 * Returns earnings in Hollywood dollars (same scale as treasury/budget).
 * WEEKLY_REVENUE_PER_THEATER = 703 produces earnings in the $10M-$300M+ range.
 */
function simulateBoxOffice(qualityInternal, hypeInternal, budgetAmount) {
  // Scale internal values to theater counts
  // quality 0-100 → contributes 0-800 initial theaters
  // hype 0-100 → contributes 0-600 initial theaters
  const qualityTheaters = Math.round(qualityInternal * 8);
  const hypeTheaters = Math.round(hypeInternal * 6);
  const initialTheaters = qualityTheaters + hypeTheaters;

  let theaters = initialTheaters;
  let totalEarnings = 0;
  let totalFalloff = 0;
  const weeklyBreakdown = [];

  for (let week = 0; week < BOX_OFFICE_WEEKS; week++) {
    if (theaters <= 0) {
      weeklyBreakdown.push(0);
      continue;
    }

    const weekRevenue = theaters * WEEKLY_REVENUE_PER_THEATER;
    totalEarnings += weekRevenue;
    weeklyBreakdown.push(weekRevenue);

    // Theater falloff — higher quality = slower decay
    const qualityFactor = clamp(qualityInternal, 0, 100);
    const falloffPerWeek = 120 - qualityFactor * 0.8 - hypeInternal * 0.3;
    totalFalloff += clamp(falloffPerWeek, 10, 500);
    theaters = Math.max(0, initialTheaters - Math.floor(totalFalloff));
  }

  return {
    totalEarnings: Math.round(totalEarnings),
    peakTheaters: initialTheaters,
    weeklyBreakdown,
  };
}

/**
 * Determine verdict based on earnings vs budget.
 */
function getVerdict(earnings, budgetAmount, averageScore) {
  if (earnings > budgetAmount * 2.5) return 'BLOCKBUSTER';
  if (earnings > budgetAmount * 1.5) return 'HIT';
  if (earnings > budgetAmount) return 'MODEST HIT';
  if (averageScore >= 7 && earnings < budgetAmount) return 'CULT CLASSIC';
  return 'FLOP';
}

/**
 * Calculate reputation change from this film.
 * Returns -3 to +3.
 */
function calcReputation(budgetAmount, earnings) {
  if (earnings / 2 > budgetAmount) return 3;
  if (earnings > budgetAmount) return 2;
  if (budgetAmount > earnings && earnings > budgetAmount / 2) return -2;
  if (budgetAmount / 2 > earnings) return -3;
  return 0;
}

// ═══════════════════════════════════════════
// CONFETTI BLAST
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
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
      zIndex: 60,
      overflow: 'hidden',
    }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -10,
            width: p.size,
            height: p.size,
            background: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animation: `pdConfettiFall 2.5s ease-in ${p.delay}s forwards`,
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// REVIEW ROW (staggered reveal)
// ═══════════════════════════════════════════

function ReviewRow({ review, visible }) {
  const scoreColor = review.score >= 7 ? COLORS.green : review.score >= 5 ? COLORS.amber : COLORS.red;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '3px 0',
      borderBottom: `1px solid ${COLORS.border}`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-8px)',
      transition: 'all 0.3s ease',
    }}>
      <div>
        <span style={{ fontSize: 10, color: COLORS.text }}>{review.name}</span>
        <span style={{ fontSize: 8, color: COLORS.textMuted, marginLeft: 6 }}>{review.tone}</span>
      </div>
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: scoreColor,
        fontFamily: MONO,
      }}>
        {review.score}/10
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════

function AnimatedCounter({ target, duration = 1500, active = true }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;
    const startTime = Date.now();
    let raf;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return <span>{formatMoney(current)}</span>;
}

// ═══════════════════════════════════════════
// CONSEQUENCE HEADLINE (post-verdict events)
// ═══════════════════════════════════════════

function ConsequenceCard({ consequence, visible }) {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      padding: '8px 12px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'all 0.4s ease',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          color: consequence.type === 'warning' ? COLORS.red : COLORS.amber,
        }}>
          {consequence.pvmContent?.icon || '\u{1F4F0}'} {consequence.title}
        </span>
        {consequence.effects?.rep && (
          <span style={{
            fontSize: 8,
            fontWeight: 600,
            color: consequence.effects.rep > 0 ? COLORS.green : COLORS.red,
          }}>
            {consequence.effects.rep > 0 ? '+' : ''}{consequence.effects.rep} REP
          </span>
        )}
      </div>
      <div style={{
        fontSize: 9,
        color: COLORS.textDim,
        lineHeight: 1.4,
      }}>
        {consequence.description}
      </div>
      {consequence.dialogue && (
        <div style={{
          fontSize: 9,
          color: COLORS.orange,
          fontStyle: 'italic',
          marginTop: 4,
          paddingLeft: 8,
          borderLeft: `2px solid ${COLORS.orange}44`,
          whiteSpace: 'pre-line',
          lineHeight: 1.3,
        }}>
          {consequence.dialogue.line}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// PREMIERE COMPONENT
// ═══════════════════════════════════════════

export default function Premiere() {
  // ── Store selectors ──
  const currentFilm = useStore(s => s.currentFilm);
  const qualityInternal = useStore(s => s.qualityInternal);
  const hypeInternal = useStore(s => s.hypeInternal);
  const filmNumber = useStore(s => s.filmNumber);
  const ledger = useStore(s => s.ledger);
  const talentRelations = useStore(s => s.talentRelations);
  const completeFilm = useStore(s => s.completeFilm);
  const addReputation = useStore(s => s.addReputation);
  const adjustHype = useStore(s => s.adjustHype);
  const addFunds = useStore(s => s.addFunds);
  const setPhase = useStore(s => s.setPhase);

  const {
    clickFeedback, positiveFeedback, negativeFeedback,
    cashFeedback, drumrollFeedback, verdictFeedback,
  } = useJuice();

  // ── Compute all premiere data once on mount ──
  const premiereData = useMemo(() => {
    if (!currentFilm) return null;

    // budget in Hollywood dollars (e.g. 15_000_000 = $15M) — same scale as treasury and box office
    const budgetAmount = currentFilm.budget || 15_000_000;
    const isFirstFilm = filmNumber === 0;

    let reviews = generateReviews(qualityInternal);
    let boxOffice = simulateBoxOffice(qualityInternal, hypeInternal, budgetAmount);
    let verdict = getVerdict(boxOffice.totalEarnings, budgetAmount, reviews.averageScore);

    // ── FIRST FILM GUARANTEE ──
    // Film 1 is always a HIT. Boost reviews + box office if the natural
    // result would be lower, so the numbers feel consistent with the verdict.
    if (isFirstFilm && verdict !== 'BLOCKBUSTER' && verdict !== 'HIT') {
      // Regenerate reviews with a boosted base (7)
      reviews = {
        scores: REVIEWERS.map(reviewer => {
          const variation = (Math.random() - 0.5) * 2;
          const skewEffect = reviewer.skew * 10;
          const score = Math.min(10, Math.max(5, Math.round(7 + variation + skewEffect)));
          return { name: reviewer.name, score, tone: reviewer.tone };
        }),
        averageScore: 0,
      };
      reviews.averageScore = Math.round(
        (reviews.scores.reduce((sum, r) => sum + r.score, 0) / reviews.scores.length) * 10
      ) / 10;

      // Ensure box office exceeds 1.5× budget for HIT threshold
      const hitTarget = budgetAmount * 2;
      if (boxOffice.totalEarnings < hitTarget) {
        const scale = hitTarget / Math.max(boxOffice.totalEarnings, 1);
        boxOffice = {
          totalEarnings: Math.round(hitTarget),
          peakTheaters: Math.round(boxOffice.peakTheaters * Math.sqrt(scale)),
          weeklyBreakdown: boxOffice.weeklyBreakdown.map(w => Math.round(w * scale)),
        };
      }
      verdict = 'HIT';
    }

    const repChange = calcReputation(budgetAmount, boxOffice.totalEarnings);

    // Profit depends on funding type
    const revenueShare = currentFilm?.revenueShare ?? 0.5;
    const playerRevenue = Math.round(boxOffice.totalEarnings * revenueShare);
    // Self-funded: profit = revenue - budget invested (can be negative)
    // Distributor: profit = player's share of revenue (pure profit, distributor bore the cost)
    const profit = currentFilm?.fundingType === 'self'
      ? playerRevenue - budgetAmount  // both in Hollywood dollars
      : playerRevenue;

    // Check consequence engine
    const consequences = checkPremiereConsequences(
      ledger, talentRelations, currentFilm, verdict.toLowerCase()
    );

    // Capture film metadata now — completeFilm() will null currentFilm later
    const filmMeta = {
      title: currentFilm.title || 'UNTITLED',
      genreLabel: currentFilm.genreLabel || currentFilm.genre?.toUpperCase() || '',
      budgetTier: (currentFilm.budgetTier || '').toUpperCase(),
      rating: currentFilm.rating || '',
    };

    // ── NPC reactions (computed once, revealed via CSS opacity) ──
    const dialogueCtx = { ledger, film: filmNumber + 1 };
    const reviewKey = reviews.averageScore >= 8 ? 'rave' : reviews.averageScore >= 6 ? 'good' : reviews.averageScore >= 4 ? 'mixed' : 'bad';
    const boxOfficeKey = boxOffice.totalEarnings >= budgetAmount ? 'profit' : 'loss';
    const verdictKey = verdict.toLowerCase(); // blockbuster, hit, modest hit, cult classic, flop

    const npcLines = {
      reviewLine: getDialogue('ricky', 'premiere_reviews', { ...dialogueCtx, key: reviewKey }),
      boxOfficeLine: getDialogue('arthur', 'premiere_boxoffice', { ...dialogueCtx, key: boxOfficeKey }),
      verdictLine: getDialogue('max', 'premiere_verdict', { ...dialogueCtx, key: verdictKey }),
    };

    return { reviews, boxOffice, verdict, repChange, profit, budgetAmount, consequences, filmMeta, npcLines };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reveal state ──
  const [revealPhase, setRevealPhase] = useState(0);
  const [visibleReviews, setVisibleReviews] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [visibleConsequences, setVisibleConsequences] = useState(0);
  const [shakeClass, setShakeClass] = useState(false);
  const [storeUpdated, setStoreUpdated] = useState(false);
  const timersRef = useRef([]);

  // ── Timer chain for phased reveal ──
  useEffect(() => {
    if (!premiereData) return;
    const { reviews, verdict, consequences } = premiereData;

    const schedule = (fn, delay) => {
      const t = setTimeout(fn, delay);
      timersRef.current.push(t);
      return t;
    };

    // Phase 1: REVIEWS (800ms) — reveal one by one
    schedule(() => {
      setRevealPhase(1);
      reviews.scores.forEach((_, i) => {
        schedule(() => {
          setVisibleReviews(v => v + 1);
          clickFeedback();
        }, i * 250);
      });
    }, 800);

    // Phase 2: AVERAGE (after all reviews)
    const reviewsDuration = 800 + reviews.scores.length * 250 + 400;
    schedule(() => {
      setRevealPhase(2);
      if (reviews.averageScore >= 6) positiveFeedback();
      else negativeFeedback();
    }, reviewsDuration);

    // Phase 3: BOX OFFICE (600ms after average)
    schedule(() => setRevealPhase(3), reviewsDuration + 600);

    // Phase 4: PROFIT (2s after box office for counter)
    schedule(() => {
      setRevealPhase(4);
      cashFeedback();
    }, reviewsDuration + 2600);

    // Phase 5: BUILDUP (800ms after profit)
    schedule(() => {
      setRevealPhase(5);
      drumrollFeedback();
    }, reviewsDuration + 3400);

    // Phase 6: VERDICT (1.2s after buildup)
    schedule(() => {
      setRevealPhase(6);
      verdictFeedback(verdict);

      // Shake on verdict
      setShakeClass(true);
      setTimeout(() => setShakeClass(false), 500);

      if (verdict === 'BLOCKBUSTER' || verdict === 'HIT') {
        setShowConfetti(true);
      }
    }, reviewsDuration + 4600);

    // Phase 7: CONSEQUENCES (staggered, 500ms after verdict)
    if (consequences.length > 0) {
      consequences.forEach((_, i) => {
        schedule(() => setVisibleConsequences(v => v + 1), reviewsDuration + 5100 + i * 600);
      });
    }

    // Phase 8: COMPLETE (after consequences or 500ms after verdict if none)
    const consequencesDuration = consequences.length > 0 ? consequences.length * 600 + 400 : 0;
    schedule(() => setRevealPhase(8), reviewsDuration + 5100 + consequencesDuration);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premiereData]);

  // ── Commit results to store when verdict reveals ──
  useEffect(() => {
    if (revealPhase >= 6 && !storeUpdated && premiereData) {
      setStoreUpdated(true);
      const { verdict, boxOffice, repChange, consequences } = premiereData;

      // completeFilm handles: filmNumber++, move to history, log verdict,
      // update talent relations, reset quality/hype
      completeFilm(verdict.toLowerCase(), boxOffice.totalEarnings);

      // ── Revenue Calculation ──
      // Revenue share depends on funding type:
      // - Self-funded: player keeps 100% (they already paid from treasury)
      // - Distributor-funded: player keeps their negotiated share (40-55%)
      const revenueShare = currentFilm?.revenueShare ?? 0.5;
      // All money in Hollywood dollars — single scale, no conversion needed
      const studioEarnings = Math.round(boxOffice.totalEarnings * revenueShare);

      // Film 1 breakout: guaranteed HIT resets treasury to a playable level
      // The first film is always a narrative success that launches the studio
      if (filmNumber === 0) {
        const breakoutBonus = 150_000_000; // $150M — a healthy starting point
        const currentFunds = useStore.getState().funds;
        const targetFunds = Math.max(currentFunds + studioEarnings, breakoutBonus);
        addFunds(targetFunds - currentFunds);
      } else {
        addFunds(studioEarnings);
      }

      // Apply reputation change
      addReputation(repChange);

      // Apply consequence effects
      consequences.forEach(c => {
        if (c.effects?.rep) addReputation(c.effects.rep);
        if (c.effects?.hype) adjustHype(c.effects.hype);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealPhase]);

  // ── Handle "next" button ──
  const handleNext = () => {
    // Go to LOT phase (the Backlot Mogul game loop: preprod → production → premiere → lot → repeat)
    setPhase('lot');
  };

  if (!premiereData) return null;

  const { reviews, boxOffice, verdict, profit, budgetAmount, consequences, filmMeta, npcLines } = premiereData;
  const verdictColor = VERDICT_COLORS[verdict] || COLORS.text;

  return (
    <div style={{
      padding: '10px 14px',
      maxWidth: 480,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      fontFamily: MONO,
      animation: shakeClass ? 'pdShake 0.5s ease-in-out' : 'none',
    }}>
      {showConfetti && <ConfettiBlast />}

      {/* Header — always visible */}
      <div style={{
        textAlign: 'center',
        padding: '6px 0 8px',
        borderBottom: `1px solid ${COLORS.border}`,
        opacity: revealPhase >= 0 ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}>
        <div style={{
          fontSize: 8,
          letterSpacing: 3,
          color: COLORS.textMuted,
          marginBottom: 2,
        }}>
          FILM #{filmNumber + 1}
        </div>
        <div style={{
          fontFamily: DISPLAY,
          fontSize: 14,
          fontWeight: 700,
          color: COLORS.white,
          letterSpacing: 2,
        }}>
          {filmMeta.title}
        </div>
        <div style={{
          fontSize: 8,
          color: COLORS.textDim,
          marginTop: 2,
          letterSpacing: 1,
        }}>
          {filmMeta.genreLabel} {'\u2022'} {filmMeta.budgetTier} {'\u2022'} {filmMeta.rating}
        </div>
      </div>

      {/* Reviews — phase 1+ */}
      <div style={{
        opacity: revealPhase >= 1 ? 1 : 0,
        transform: revealPhase >= 1 ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ ...sectionLabel, marginBottom: 4 }}>REVIEWS</div>
        <div style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '4px 10px',
        }}>
          {reviews.scores.map((r, i) => (
            <ReviewRow key={r.name} review={r} visible={i < visibleReviews} />
          ))}

          {/* Average — phase 2+ */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0 2px',
            opacity: revealPhase >= 2 ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: COLORS.textDim }}>AVERAGE</span>
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: reviews.averageScore >= 7 ? COLORS.green : reviews.averageScore >= 5 ? COLORS.amber : COLORS.red,
            }}>
              {reviews.averageScore}/10
            </span>
          </div>
        </div>
      </div>

      {/* Ricky reacts to reviews — phase 2+ */}
      <div style={{
        opacity: revealPhase >= 2 ? 1 : 0,
        transition: 'opacity 0.6s ease 0.2s',
      }}>
        <NPCQuote character={CHARACTERS.ricky} line={npcLines.reviewLine} />
      </div>

      {/* Box Office — phase 3+ */}
      <div style={{
        opacity: revealPhase >= 3 ? 1 : 0,
        transform: revealPhase >= 3 ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ ...sectionLabel, marginBottom: 4 }}>BOX OFFICE</div>
        <div style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: COLORS.textDim }}>BUDGET</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>
              {formatMoney(budgetAmount)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: COLORS.textDim }}>TOTAL GROSS</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.green }}>
              <AnimatedCounter target={boxOffice.totalEarnings} active={revealPhase >= 3} />
            </span>
          </div>

          {/* Profit — phase 4+ */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: 6,
            opacity: revealPhase >= 4 ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            <span style={{ fontSize: 9, color: COLORS.textDim }}>
              {currentFilm?.fundingType === 'distributor' ? `YOUR SHARE (${Math.round((currentFilm?.revenueShare || 0.5) * 100)}%)` : 'PROFIT'}
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: profit >= 0 ? COLORS.green : COLORS.red,
            }}>
              {profit >= 0 ? '+' : '-'}
              <AnimatedCounter target={Math.abs(profit)} active={revealPhase >= 4} />
            </span>
          </div>
        </div>
      </div>

      {/* Arthur reacts to box office — phase 4+ */}
      <div style={{
        opacity: revealPhase >= 4 ? 1 : 0,
        transition: 'opacity 0.6s ease 0.2s',
      }}>
        <NPCQuote character={CHARACTERS.arthur} line={npcLines.boxOfficeLine} />
      </div>

      {/* Verdict — phase 5+ */}
      <div style={{
        textAlign: 'center',
        padding: '14px 12px',
        background: COLORS.surface,
        border: `1px solid ${revealPhase >= 6 ? verdictColor : revealPhase >= 5 ? COLORS.amber : COLORS.border}`,
        boxShadow: revealPhase >= 6 ? `0 0 24px ${verdictColor}33` : 'none',
        transition: 'all 0.3s ease',
        opacity: revealPhase >= 5 ? 1 : 0,
        transform: revealPhase >= 5 ? 'scale(1)' : 'scale(0.95)',
      }}>
        {revealPhase < 6 ? (
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: COLORS.textMuted,
            animation: 'pdDimPulse 0.6s ease-in-out infinite',
          }}>
            CALCULATING...
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 8,
              letterSpacing: 3,
              color: COLORS.textMuted,
              marginBottom: 4,
            }}>
              VERDICT
            </div>
            <div style={{
              fontFamily: DISPLAY,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              color: verdictColor,
              textShadow: `0 0 16px ${verdictColor}66`,
              animation: 'pdStamp 0.4s ease-out both',
            }}>
              {verdict}
            </div>
            {/* Quality / Hype stars summary */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 14,
              marginTop: 6,
            }}>
              <span style={{ fontSize: 9, color: COLORS.textDim }}>
                QTY {'\u2605'.repeat(valueToStars(qualityInternal))}{'\u2606'.repeat(5 - valueToStars(qualityInternal))}
              </span>
              <span style={{ fontSize: 9, color: COLORS.textDim }}>
                HYPE {'\u2605'.repeat(valueToStars(hypeInternal))}{'\u2606'.repeat(5 - valueToStars(hypeInternal))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Max reacts to verdict — phase 6+ */}
      <div style={{
        opacity: revealPhase >= 6 ? 1 : 0,
        transition: 'opacity 0.6s ease 0.3s',
      }}>
        <NPCQuote character={CHARACTERS.max} line={npcLines.verdictLine} />
      </div>

      {/* Consequences — post-verdict events */}
      {consequences.length > 0 && revealPhase >= 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ ...sectionLabel, marginBottom: 2 }}>HEADLINES</div>
          {consequences.map((c, i) => (
            <ConsequenceCard key={i} consequence={c} visible={i < visibleConsequences} />
          ))}
        </div>
      )}

      {/* Next button — phase 8 */}
      <div style={{
        opacity: revealPhase >= 8 ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}>
        <JuicyButton
          onClick={handleNext}
          style={{
            fontFamily: DISPLAY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            padding: '12px 20px',
            textAlign: 'center',
            width: '100%',
            color: COLORS.amber,
            borderColor: COLORS.amber,
            boxShadow: `0 0 12px ${COLORS.amber}15`,
          }}
        >
          {filmNumber === 0 ? 'YOUR STUDIO AWAITS' : 'NEXT FILM'}
        </JuicyButton>
      </div>
    </div>
  );
}
