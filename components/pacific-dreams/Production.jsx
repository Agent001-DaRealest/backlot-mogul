'use client';
// ─────────────────────────────────────────────────────────────
// Production.jsx — Backlot Mogul Production Phase
// 5 crisis cards + optional walkout injection, quality/hype as stars,
// memory ledger logging, consequence engine integration
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react';
import useStore, { valueToStars } from '../../lib/pacific-dreams/store';
import { TAGS } from '../../lib/pacific-dreams/memoryLedger';
import { checkProductionConsequences } from '../../lib/pacific-dreams/consequenceEngine';
import { COLORS, MONO, DISPLAY, sectionLabel } from './GameStyles';
import { NPCQuote } from './DialogueComponents';
import { CHARACTERS } from '../../lib/pacific-dreams/dialogueEngine';
import CrisisCard from './CrisisCard';
import JuicyButton from './JuicyButton';
import { useJuice } from '../../lib/pacific-dreams/juice';

// ═══════════════════════════════════════════
// CRISIS CARD POOL (from data.js, embedded)
// ═══════════════════════════════════════════

const CRISIS_CARDS = [
  {
    id: 'star-drunk',
    title: 'STAR ARRIVES DRUNK',
    description: 'Your lead stumbles onto set reeking of tequila. The crew is watching.',
    optionA: { label: 'SOBER THEM UP', desc: 'Delay shooting. Make coffee.', qualityDelta: 5, hypeDelta: -2 },
    optionB: { label: 'SHOOT ANYWAY', desc: 'Method acting, right?', qualityDelta: -8, hypeDelta: 3 },
  },
  {
    id: 'director-tantrum',
    title: 'DIRECTOR THROWS A FIT',
    description: 'The director screams at the lighting crew and storms off set.',
    optionA: { label: 'CALM THEM DOWN', desc: 'Mediate. Lose half a day.', qualityDelta: 3, hypeDelta: -1 },
    optionB: { label: 'LET THEM RANT', desc: 'Genius has its price.', qualityDelta: -5, hypeDelta: 0 },
  },
  {
    id: 'paparazzi',
    title: 'PAPARAZZI ON SET',
    description: 'TMZ is outside with telephoto lenses. Leaked photos are imminent.',
    optionA: { label: 'SHUT IT DOWN', desc: 'Security costs money. No leaks.', qualityDelta: 2, hypeDelta: -3 },
    optionB: { label: 'LET THEM SHOOT', desc: 'Free publicity is free publicity.', qualityDelta: -3, hypeDelta: 8 },
  },
  {
    id: 'stunt-gone-wrong',
    title: 'STUNT GOES WRONG',
    description: 'The car flip went sideways. Nobody hurt, but the set is wrecked.',
    optionA: { label: 'REBUILD THE SET', desc: 'Expensive but right.', qualityDelta: 6, hypeDelta: -1 },
    optionB: { label: 'USE THE FOOTAGE', desc: 'It looks real because it IS real.', qualityDelta: -2, hypeDelta: 5 },
  },
  {
    id: 'script-rewrite',
    title: 'SCRIPT NEEDS A REWRITE',
    description: 'Act three is a mess. Everyone knows it. Do you fix it now or push through?',
    optionA: { label: 'REWRITE NOW', desc: 'Halt production. Fix the story.', qualityDelta: 10, hypeDelta: -4 },
    optionB: { label: 'PUSH THROUGH', desc: 'Fix it in post. Probably.', qualityDelta: -6, hypeDelta: 1 },
  },
  {
    id: 'weather-disaster',
    title: 'HURRICANE WARNING',
    description: 'A tropical storm is heading for your outdoor shoot location.',
    optionA: { label: 'MOVE INDOORS', desc: 'Green screen it. Costs more.', qualityDelta: -4, hypeDelta: 0 },
    optionB: { label: 'CHASE THE STORM', desc: 'Shoot in the rain. It could be epic.', qualityDelta: 8, hypeDelta: 2 },
  },
  {
    id: 'chemistry-magic',
    title: 'UNEXPECTED CHEMISTRY',
    description: 'Your leads are improvising and it is GOLD. Do you let the cameras roll?',
    optionA: { label: 'STICK TO SCRIPT', desc: 'Discipline keeps the vision.', qualityDelta: 3, hypeDelta: 0 },
    optionB: { label: 'LET THEM COOK', desc: 'Sometimes magic is unscripted.', qualityDelta: 7, hypeDelta: 2 },
  },
  {
    id: 'budget-crunch',
    title: 'OVER BUDGET',
    description: 'The accountant just called. You are 20% over budget with two weeks left.',
    optionA: { label: 'CUT CORNERS', desc: 'Cheaper effects. Fewer takes.', qualityDelta: -8, hypeDelta: 0 },
    optionB: { label: 'BEG THE STUDIO', desc: 'More money, more pressure.', qualityDelta: 2, hypeDelta: -3 },
  },
  {
    id: 'viral-set-photo',
    title: 'SET PHOTO GOES VIRAL',
    description: 'Someone leaked a behind-the-scenes photo. Twitter is going nuts.',
    optionA: { label: 'DMCA TAKEDOWN', desc: 'Kill the buzz. Protect the reveal.', qualityDelta: 2, hypeDelta: -5 },
    optionB: { label: 'LEAN INTO IT', desc: 'Post more teasers. Ride the wave.', qualityDelta: 0, hypeDelta: 10 },
  },
  {
    id: 'method-actor',
    title: 'METHOD ACTING MELTDOWN',
    description: 'Your lead refuses to break character. Even at craft services.',
    optionA: { label: 'STAGE INTERVENTION', desc: 'Get them back to reality.', qualityDelta: 0, hypeDelta: -1 },
    optionB: { label: 'EMBRACE THE CHAOS', desc: 'The performance might be legendary.', qualityDelta: 6, hypeDelta: 3 },
  },
  {
    id: 'location-nightmare',
    title: 'LOCATION PERMIT REVOKED',
    description: 'The city just pulled your shooting permit. You have 24 hours.',
    optionA: { label: 'FIND NEW LOCATION', desc: 'Scout fast. Lose two days.', qualityDelta: -3, hypeDelta: 0 },
    optionB: { label: 'GUERRILLA SHOOT', desc: 'No permit? No problem. Maybe.', qualityDelta: 4, hypeDelta: 4 },
  },
  {
    id: 'composer-genius',
    title: 'COMPOSER HAS A VISION',
    description: 'The composer wants to scrap the score and start over. It could be brilliant.',
    optionA: { label: 'KEEP ORIGINAL', desc: 'Safe. On schedule.', qualityDelta: 0, hypeDelta: 0 },
    optionB: { label: 'START OVER', desc: 'Risk the deadline for art.', qualityDelta: 8, hypeDelta: -2 },
  },
  {
    id: 'celebrity-cameo',
    title: 'CELEBRITY CAMEO OFFER',
    description: 'A mega-star wants a walk-on role. But they want creative input.',
    optionA: { label: 'POLITELY DECLINE', desc: 'Keep the vision pure.', qualityDelta: 2, hypeDelta: -1 },
    optionB: { label: 'WELCOME ABOARD', desc: 'Star power at the cost of control.', qualityDelta: -2, hypeDelta: 8 },
  },
  {
    id: 'test-screening',
    title: 'TERRIBLE TEST SCREENING',
    description: 'The focus group hated the ending. Cards say "confusing" and "boring."',
    optionA: { label: 'RESHOOT ENDING', desc: 'Expensive. But the data speaks.', qualityDelta: 7, hypeDelta: -3 },
    optionB: { label: 'TRUST YOUR GUT', desc: 'They said the same about Blade Runner.', qualityDelta: -4, hypeDelta: 1 },
  },
  {
    id: 'late-night-appearance',
    title: 'LATE NIGHT TV SPOT',
    description: 'Your lead is invited on a late night show. But they are terrible at interviews.',
    optionA: { label: 'SKIP IT', desc: 'No risk. No exposure.', qualityDelta: 0, hypeDelta: 0 },
    optionB: { label: 'SEND THEM', desc: 'Could be charming or a disaster.', qualityDelta: 0, hypeDelta: 7 },
  },
  {
    id: 'vfx-disaster',
    title: 'VFX HOUSE BANKRUPTCY',
    description: 'Your VFX vendor just went under. Half the shots are unfinished.',
    optionA: { label: 'HIRE NEW VENDOR', desc: 'Triple the cost. Rush job.', qualityDelta: -5, hypeDelta: 0 },
    optionB: { label: 'PRACTICAL EFFECTS', desc: 'Old school. Might look incredible.', qualityDelta: 5, hypeDelta: 2 },
  },
];

const CRISIS_CARDS_PER_MOVIE = 5;

// NPC one-liners above each crisis card — thematic mapping
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const CRISIS_NPC_HINTS = {
  'star-drunk':        { char: CHARACTERS.max,    lines: ['This is what happens when you cast Method types.', 'I warned you about their reputation.'] },
  'director-tantrum':  { char: CHARACTERS.carmen,  lines: ['Auteurs. Can\'t live with them, can\'t make art without them.', 'Every great director has a temper. Allegedly.'] },
  'paparazzi':         { char: CHARACTERS.max,    lines: ['TMZ already has the photos. It\'s about damage control now.', 'Free press or career-ending scandal. Thin line.'] },
  'stunt-gone-wrong':  { char: CHARACTERS.arthur,  lines: ['Insurance won\'t cover this twice.', 'The stunt budget didn\'t account for a second take on a car flip.'] },
  'script-rewrite':    { char: CHARACTERS.ricky,   lines: ['I told you Act Three needed work. I told you.', 'Look — the bones are good. We just need to rebuild the ending. That\'s all.'] },
  'weather-disaster':  { char: CHARACTERS.carmen,  lines: ['We can\'t fight nature. But we can adapt.', 'The location scout is already looking at indoor options.'] },
  'chemistry-magic':   { char: CHARACTERS.ricky,   lines: ['Sometimes the script is just a suggestion.', 'This is the stuff you can\'t write. Let it happen.'] },
  'budget-crunch':     { char: CHARACTERS.arthur,  lines: ['I\'ve been warning you about this for two weeks.', 'The math doesn\'t lie. We\'re over budget.'] },
  'viral-set-photo':   { char: CHARACTERS.max,    lines: ['The internet moves fast. We need to move faster.', 'Everyone\'s talking about us. That\'s either very good or very bad.'] },
  'method-actor':      { char: CHARACTERS.max,    lines: ['They\'re in character. Deeply. Disturbingly.', 'The performance might be legendary. The insurance premiums, less so.'] },
  'location-nightmare':{ char: CHARACTERS.arthur,  lines: ['Permit issues are budget issues in disguise.', 'City Hall isn\'t returning my calls.'] },
  'composer-genius':   { char: CHARACTERS.ricky,   lines: ['A new score could elevate everything. Or sink us.', 'The composer says they had a vision at 3 AM. I believe them.'] },
  'celebrity-cameo':   { char: CHARACTERS.max,    lines: ['They want creative input. That\'s the price of star power.', 'A-list walk-on. Could be gold for the marketing.'] },
  'test-screening':    { char: CHARACTERS.carmen,  lines: ['Focus groups don\'t lie. But they\'re not always right.', 'The cards were rough. But Blade Runner tested badly too.'] },
  'late-night-appearance': { char: CHARACTERS.max, lines: ['Talk shows can make or break a release.', 'Let\'s hope they\'re charming on camera. Off-camera, different story.'] },
  'vfx-disaster':      { char: CHARACTERS.arthur,  lines: ['The VFX house went under mid-production. This is a budget crisis.', 'Practical effects might actually be cheaper at this point.'] },
};

function drawCrisisCards(count = CRISIS_CARDS_PER_MOVIE) {
  const shuffled = [...CRISIS_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ═══════════════════════════════════════════
// STAR DISPLAY — discrete 5-star readout
// ═══════════════════════════════════════════

function StarDisplay({ label, stars, maxStars = 5, color, prevStarsRef }) {
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (prevStarsRef.current !== null && prevStarsRef.current !== stars) {
      const diff = stars - prevStarsRef.current;
      setFlash(diff > 0 ? 'positive' : 'negative');
      const t = setTimeout(() => setFlash(null), 600);
      prevStarsRef.current = stars;
      return () => clearTimeout(t);
    }
    prevStarsRef.current = stars;
  }, [stars, prevStarsRef]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontSize: 9,
        letterSpacing: 2,
        color: COLORS.textDim,
        width: 50,
        textAlign: 'right',
        fontFamily: MONO,
      }}>
        {label}
      </span>
      <div style={{
        display: 'flex',
        gap: 3,
        filter: flash === 'positive' ? 'brightness(1.6)' : flash === 'negative' ? 'brightness(0.6)' : 'none',
        transition: 'filter 0.3s ease',
      }}>
        {Array.from({ length: maxStars }).map((_, i) => (
          <span key={i} style={{
            fontSize: 14,
            color: i < stars ? color : COLORS.border,
            textShadow: i < stars ? `0 0 6px ${color}44` : 'none',
            transition: 'color 0.3s ease, text-shadow 0.3s ease',
          }}>
            {i < stars ? '\u2605' : '\u2606'}
          </span>
        ))}
      </div>
      {flash && (
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          fontFamily: MONO,
          color: flash === 'positive' ? COLORS.green : COLORS.red,
          animation: 'pdFloatUp 0.6s ease-out forwards',
        }}>
          {flash === 'positive' ? '\u25B2' : '\u25BC'}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// WALKOUT CARD — injected crisis from consequence engine
// ═══════════════════════════════════════════

function WalkoutCard({ consequence, onResolve }) {
  const [entered, setEntered] = useState(false);
  const [chosen, setChosen] = useState(null);
  const { negativeFeedback, positiveFeedback } = useJuice();

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleChoose = (optionIndex) => {
    if (chosen !== null) return;
    setChosen(optionIndex);
    const opt = consequence.options[optionIndex];
    if (opt.tag === 'walkout_fired') {
      negativeFeedback();
    } else {
      positiveFeedback();
    }
    setTimeout(() => onResolve(optionIndex), 800);
  };

  return (
    <div style={{
      fontFamily: MONO,
      background: COLORS.surface,
      border: `1px solid ${COLORS.red}`,
      padding: 20,
      maxWidth: 440,
      margin: '0 auto',
      opacity: entered ? 1 : 0,
      transform: entered ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.35s ease-out',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 9,
        letterSpacing: 3,
        color: COLORS.red,
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{'\u{1F6AA}'} WALKOUT</span>
        <span>{consequence.actor}</span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: COLORS.red,
        letterSpacing: 1,
        marginBottom: 8,
        textShadow: `0 0 8px ${COLORS.red}33`,
      }}>
        {consequence.title}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12,
        color: COLORS.textDim,
        lineHeight: 1.6,
        marginBottom: 12,
      }}>
        {consequence.description}
      </div>

      {/* Quote */}
      {consequence.quote && (
        <div style={{
          fontSize: 11,
          color: COLORS.orange,
          fontStyle: 'italic',
          marginBottom: 16,
          paddingLeft: 12,
          borderLeft: `2px solid ${COLORS.orange}44`,
        }}>
          {consequence.quote}
        </div>
      )}

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {consequence.options.map((opt, i) => {
          const isChosen = chosen === i;
          const isOther = chosen !== null && chosen !== i;
          return (
            <JuicyButton
              key={i}
              onClick={() => handleChoose(i)}
              disabled={chosen !== null}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                borderColor: isChosen ? COLORS.amber : isOther ? COLORS.border : COLORS.borderLight,
                color: isOther ? COLORS.textMuted : COLORS.text,
                opacity: isOther ? 0.2 : 1,
                background: isChosen ? `${COLORS.amber}0d` : COLORS.surface,
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 10, color: COLORS.textDim, lineHeight: 1.4 }}>
                {opt.description}
              </span>
              <div style={{ fontSize: 10, display: 'flex', gap: 12, marginTop: 2 }}>
                <span style={{
                  color: opt.effects.quality > 0 ? COLORS.green : opt.effects.quality < 0 ? COLORS.red : COLORS.textMuted,
                  fontWeight: 600,
                }}>
                  {opt.effects.quality > 0 ? '+' : ''}{opt.effects.quality || '\u2014'} QTY
                </span>
              </div>
            </JuicyButton>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PRODUCTION COMPONENT
// ═══════════════════════════════════════════

export default function Production() {
  // ── Store selectors ──
  const currentFilm = useStore(s => s.currentFilm);
  const qualityInternal = useStore(s => s.qualityInternal);
  const hypeInternal = useStore(s => s.hypeInternal);
  const filmNumber = useStore(s => s.filmNumber);
  const ledger = useStore(s => s.ledger);
  const talentRelations = useStore(s => s.talentRelations);
  const plots = useStore(s => s.plots);
  const setPhase = useStore(s => s.setPhase);
  const adjustQuality = useStore(s => s.adjustQuality);
  const adjustHype = useStore(s => s.adjustHype);
  const logMemory = useStore(s => s.logMemory);
  const fireAfterWalkout = useStore(s => s.fireAfterWalkout);
  const forgiveWalkout = useStore(s => s.forgiveWalkout);

  const { positiveFeedback, negativeFeedback } = useJuice();

  // ── Compute stars from internal values ──
  const qualityStars = valueToStars(qualityInternal);
  const hypeStars = valueToStars(hypeInternal);

  // Refs for star-change detection
  const prevQRef = useRef(qualityStars);
  const prevHRef = useRef(hypeStars);

  // ── Building bonuses ──
  const buildingQBonus = useMemo(() => {
    return plots.filter(p => p?.type === 'building').reduce((sum, b) => {
      // Post House = qBonus 12, Commissary = 3, etc.
      return sum + (b.qBonus || 0);
    }, 0);
  }, [plots]);

  const hasCommissary = plots.some(p => p?.id === 'commissary');

  // ── Draw crisis deck + check for walkouts (once on mount) ──
  const [crisisDeck, setCrisisDeck] = useState([]);
  const [walkouts, setWalkouts] = useState([]);
  const [crisisIndex, setCrisisIndex] = useState(0);
  const [showingWalkout, setShowingWalkout] = useState(false);
  const [currentWalkout, setCurrentWalkout] = useState(null);
  const [cardKey, setCardKey] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [poppedDot, setPoppedDot] = useState(-1);
  const [shakeClass, setShakeClass] = useState(false);

  useEffect(() => {
    // Draw regular crisis cards
    let cards = drawCrisisCards(CRISIS_CARDS_PER_MOVIE);

    // Check consequence engine for walkout injections
    const consequences = checkProductionConsequences(ledger, talentRelations, currentFilm);
    const walkoutEvents = consequences.filter(c => c.type === 'walkout');
    setWalkouts(walkoutEvents);

    // If commissary, reduce crisis severity (reduce negative deltas)
    if (hasCommissary) {
      cards = cards.map(card => ({
        ...card,
        optionA: {
          ...card.optionA,
          qualityDelta: card.optionA.qualityDelta < 0
            ? Math.round(card.optionA.qualityDelta * 0.6) : card.optionA.qualityDelta,
          hypeDelta: card.optionA.hypeDelta < 0
            ? Math.round(card.optionA.hypeDelta * 0.6) : card.optionA.hypeDelta,
        },
        optionB: {
          ...card.optionB,
          qualityDelta: card.optionB.qualityDelta < 0
            ? Math.round(card.optionB.qualityDelta * 0.6) : card.optionB.qualityDelta,
          hypeDelta: card.optionB.hypeDelta < 0
            ? Math.round(card.optionB.hypeDelta * 0.6) : card.optionB.hypeDelta,
        },
      }));
    }

    setCrisisDeck(cards);

    // If there's a walkout, show it before the first crisis card
    if (walkoutEvents.length > 0) {
      setShowingWalkout(true);
      setCurrentWalkout(walkoutEvents[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCards = crisisDeck.length;
  const allResolved = crisisIndex >= totalCards && !showingWalkout;

  // Check completion
  useEffect(() => {
    if (crisisIndex >= totalCards && totalCards > 0 && !showingWalkout) {
      setIsComplete(true);
    }
  }, [crisisIndex, totalCards, showingWalkout]);

  // ── Handle walkout resolution ──
  const handleWalkoutResolve = (optionIndex) => {
    const walkout = currentWalkout;
    const opt = walkout.options[optionIndex];

    // Apply effects
    if (opt.effects.quality) adjustQuality(opt.effects.quality);

    // Log to memory
    logMemory(filmNumber + 1, 'production', TAGS.WALKOUT, {
      actor: walkout.actor,
      detail: opt.tag,
    });

    if (opt.tag === 'walkout_fired') {
      logMemory(filmNumber + 1, 'production', TAGS.WALKOUT_FIRED, {
        actor: walkout.actor,
      });
      fireAfterWalkout(walkout.actor);
    } else {
      logMemory(filmNumber + 1, 'production', TAGS.WALKOUT_FORGIVEN, {
        actor: walkout.actor,
      });
      forgiveWalkout(walkout.actor);
    }

    // Trigger shake
    setShakeClass(true);
    setTimeout(() => setShakeClass(false), 400);

    // Move to next walkout or first crisis card
    const remaining = walkouts.filter(w => w !== walkout);
    if (remaining.length > 0) {
      setCurrentWalkout(remaining[0]);
      setWalkouts(remaining);
    } else {
      setShowingWalkout(false);
      setCurrentWalkout(null);
    }
  };

  // ── Handle crisis card resolution ──
  const handleResolve = (option) => {
    const crisis = crisisDeck[crisisIndex];
    const chosen = option === 'A' ? crisis.optionA : crisis.optionB;

    // Apply deltas to store
    if (chosen.qualityDelta) adjustQuality(chosen.qualityDelta);
    if (chosen.hypeDelta) adjustHype(chosen.hypeDelta);

    // Log to memory ledger
    logMemory(filmNumber + 1, 'production', TAGS.CRISIS_CHOICE, {
      detail: crisis.id,
      meta: { option, qualityDelta: chosen.qualityDelta, hypeDelta: chosen.hypeDelta },
    });

    // Track bias
    if (chosen.qualityDelta > Math.abs(chosen.hypeDelta || 0)) {
      logMemory(filmNumber + 1, 'production', TAGS.CRISIS_QUALITY_BIAS, {
        detail: crisis.id,
      });
    } else if ((chosen.hypeDelta || 0) > Math.abs(chosen.qualityDelta || 0)) {
      logMemory(filmNumber + 1, 'production', TAGS.CRISIS_HYPE_BIAS, {
        detail: crisis.id,
      });
    }

    // Pop animation on dot
    setPoppedDot(crisisIndex);
    setTimeout(() => setPoppedDot(-1), 400);

    // Sound feedback
    const isNeg = chosen.qualityDelta < 0 || (chosen.hypeDelta || 0) < -2;
    if (isNeg) negativeFeedback();
    else positiveFeedback();

    // Advance to next card
    setTimeout(() => {
      setCrisisIndex(i => i + 1);
      setCardKey(k => k + 1);
    }, 300);
  };

  // ── Handle next phase — marketing campaign before premiere ──
  const handlePremiere = () => {
    setPhase('marketing');
  };

  if (!currentFilm) return null;

  return (
    <div style={{
      padding: 16,
      maxWidth: 480,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      fontFamily: MONO,
      animation: shakeClass ? 'pdShake 0.4s ease-in-out' : 'none',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '12px 0',
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          fontSize: 9,
          letterSpacing: 3,
          color: COLORS.textMuted,
          marginBottom: 4,
        }}>
          PRODUCTION
        </div>
        <div style={{
          fontFamily: DISPLAY,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 2,
          color: COLORS.amber,
          textShadow: `0 0 8px ${COLORS.amber}33`,
        }}>
          {currentFilm.title || 'UNTITLED'}
        </div>
        <div style={{
          fontSize: 9,
          color: COLORS.textDim,
          marginTop: 4,
          letterSpacing: 1,
        }}>
          {currentFilm.genreLabel || currentFilm.genre?.toUpperCase()} {'\u2022'} {(currentFilm.budgetTier || '').toUpperCase()} {'\u2022'} {currentFilm.rating || ''}
        </div>
      </div>

      {/* Quality / Hype Stars */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '4px 8px',
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
      }}>
        <StarDisplay label="QTY" stars={qualityStars} color={COLORS.green} prevStarsRef={prevQRef} />
        <StarDisplay label="HYPE" stars={hypeStars} color={COLORS.cyan} prevStarsRef={prevHRef} />
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0' }}>
        {Array.from({ length: totalCards }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i < crisisIndex ? COLORS.green : i === crisisIndex && !showingWalkout ? COLORS.amber : COLORS.border,
              boxShadow: i === crisisIndex && !showingWalkout ? `0 0 6px ${COLORS.amber}` : 'none',
              transition: 'all 0.3s ease',
              animation: poppedDot === i ? 'pdProgressPop 0.3s ease-out' : 'none',
            }}
          />
        ))}
      </div>

      {/* Walkout card (injected before/between crisis cards) */}
      {showingWalkout && currentWalkout && (
        <WalkoutCard
          consequence={currentWalkout}
          onResolve={handleWalkoutResolve}
        />
      )}

      {/* Crisis cards */}
      {!showingWalkout && !isComplete && crisisIndex < totalCards && (
        <>
          {/* NPC hint above crisis card */}
          {(() => {
            const hint = CRISIS_NPC_HINTS[crisisDeck[crisisIndex]?.id];
            return hint ? <NPCQuote character={hint.char} line={pick(hint.lines)} /> : null;
          })()}
          <CrisisCard
            key={cardKey}
            crisis={crisisDeck[crisisIndex]}
            cardIndex={crisisIndex}
            totalCards={totalCards}
            onResolve={handleResolve}
          />
        </>
      )}

      {/* Production complete */}
      {isComplete && (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            fontFamily: DISPLAY,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 3,
            color: COLORS.green,
            textShadow: `0 0 10px ${COLORS.green}33`,
          }}>
            PRODUCTION COMPLETE
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: 2, marginBottom: 4 }}>QUALITY</div>
              <div style={{ fontSize: 16, color: COLORS.green }}>
                {'\u2605'.repeat(qualityStars)}{'\u2606'.repeat(5 - qualityStars)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: 2, marginBottom: 4 }}>HYPE</div>
              <div style={{ fontSize: 16, color: COLORS.cyan }}>
                {'\u2605'.repeat(hypeStars)}{'\u2606'.repeat(5 - hypeStars)}
              </div>
            </div>
          </div>
          <JuicyButton
            onClick={handlePremiere}
            soundOverride={positiveFeedback}
            style={{
              fontFamily: DISPLAY,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 4,
              color: COLORS.amber,
              borderColor: COLORS.amber,
              padding: '14px 28px',
              marginTop: 8,
              boxShadow: `0 0 16px ${COLORS.amber}22`,
            }}
          >
            PREMIERE NIGHT
          </JuicyButton>
        </div>
      )}
    </div>
  );
}
