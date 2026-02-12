'use client';
// ─────────────────────────────────────────────────────────────
// Marketing.jsx — Backlot Mogul Marketing Campaign Phase
// Ad-buying screen between Production and Premiere.
// Player spends from movie budget (or treasury dips) to boost hype.
// Marketing Suite building reduces costs by 30% and adds a bonus option.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import useStore, { valueToStars } from '../../lib/pacific-dreams/store';
import { TAGS } from '../../lib/pacific-dreams/memoryLedger';
import { COLORS, MONO, DISPLAY } from './GameStyles';
import { DialogueBox } from './DialogueComponents';
import { getDialogue, CHARACTERS } from '../../lib/pacific-dreams/dialogueEngine';
import JuicyButton from './JuicyButton';
import { useJuice } from '../../lib/pacific-dreams/juice';

// ═══════════════════════════════════════════
// MARKETING OPTIONS
// ═══════════════════════════════════════════

const BASE_MARKETING = [
  { id: 'tv',       label: 'TV CAMPAIGN',      icon: '📺', baseCost: 4_000_000, hype: 12, desc: 'Network spots during prime time.' },
  { id: 'trailer',  label: 'TRAILER BLITZ',    icon: '🎬', baseCost: 2_000_000, hype: 8,  desc: 'Trailers in every theater in the country.' },
  { id: 'press',    label: 'PRESS JUNKET',     icon: '📰', baseCost: 1_000_000, hype: 4,  desc: 'Cast interviews on every talk show.' },
  { id: 'poster',   label: 'POSTER & OUTDOOR', icon: '🪧', baseCost: 500_000,  hype: 2,  desc: 'Billboards from Sunset to Times Square.' },
  { id: 'premiere', label: 'PREMIERE EVENT',   icon: '🎉', baseCost: 3_000_000, hype: 10, desc: 'Red carpet premiere at the Chinese Theatre.' },
];

const STUDIO_SCREENING = { id: 'screening', label: 'STUDIO SCREENING', icon: '🎞️', baseCost: 500_000, hype: 6, desc: 'Private screening for critics and VIPs. (Marketing Suite bonus)' };

const fmt = n => n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

export default function Marketing() {
  const currentFilm = useStore(s => s.currentFilm);
  const funds = useStore(s => s.funds);
  const hypeInternal = useStore(s => s.hypeInternal);
  const ledger = useStore(s => s.ledger);
  const adjustHype = useStore(s => s.adjustHype);
  const spendMovieBudget = useStore(s => s.spendMovieBudget);
  const treasuryDip = useStore(s => s.treasuryDip);
  const hasBuilding = useStore(s => s.hasBuilding);
  const setPhase = useStore(s => s.setPhase);
  const filmNumber = useStore(s => s.filmNumber);
  const logMemory = useStore(s => s.logMemory);

  const { clickFeedback, positiveFeedback, cashFeedback } = useJuice();

  // ── Carmen's marketing commentary ──
  const carmenLine = useMemo(() => {
    const hypeStars = valueToStars(hypeInternal);
    const key = hypeStars >= 4 ? 'high' : hypeStars >= 2 ? 'mid' : 'low';
    return getDialogue('carmen', 'marketing_entry', { ledger, film: filmNumber + 1, key });
  }, [hypeInternal, ledger, filmNumber]);

  const hasMarketingSuite = hasBuilding('marketing');
  const discount = hasMarketingSuite ? 0.7 : 1.0; // 30% off with suite

  const [purchased, setPurchased] = useState([]);
  const [dipPrompt, setDipPrompt] = useState(null); // { item, shortfall }

  // Build options list
  const options = [...BASE_MARKETING];
  if (hasMarketingSuite) options.push(STUDIO_SCREENING);

  const movieBudget = currentFilm?.movieBudgetRemaining || 0;
  // Base hype bonus from Marketing Suite
  const baseHypeBonus = hasMarketingSuite ? 5 : 0;
  const totalHypeBought = purchased.reduce((sum, id) => {
    const opt = options.find(o => o.id === id);
    return sum + (opt?.hype || 0);
  }, 0) + baseHypeBonus;

  function buyItem(item) {
    const cost = Math.round(item.baseCost * discount);

    if (cost <= movieBudget) {
      // Affordable from movie budget
      spendMovieBudget(cost);
      applyPurchase(item, cost, 'movie_budget');
    } else if (funds > 0) {
      // Need treasury dip
      const shortfall = cost - movieBudget;
      if (shortfall <= funds) {
        setDipPrompt({ item, cost, shortfall });
      } else {
        // Can't afford even with treasury
        clickFeedback();
      }
    }
  }

  function acceptDip() {
    if (!dipPrompt) return;
    const { item, cost, shortfall } = dipPrompt;
    const remaining = currentFilm?.movieBudgetRemaining || 0;
    if (remaining > 0) spendMovieBudget(remaining);
    treasuryDip(shortfall);
    logMemory(filmNumber, 'marketing', TAGS.TREASURY_DIP, {
      detail: item.id, meta: { amount: shortfall, reason: 'marketing' },
    });
    logMemory(filmNumber, 'marketing', TAGS.MARKETING_FROM_TREASURY, {
      detail: item.id, meta: { amount: shortfall },
    });
    applyPurchase(item, cost, 'treasury');
    setDipPrompt(null);
  }

  function applyPurchase(item, cost, source) {
    setPurchased(p => [...p, item.id]);
    adjustHype(item.hype);
    cashFeedback();
    logMemory(filmNumber, 'marketing', TAGS.MARKETING_SPEND, {
      detail: item.id, meta: { cost, source, hype: item.hype },
    });
  }

  function finish() {
    // Apply base hype bonus from Marketing Suite (if not already applied)
    if (baseHypeBonus > 0) adjustHype(baseHypeBonus);
    positiveFeedback();
    setPhase('premiere');
  }

  return (
    <div style={{
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: MONO,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: 3, color: COLORS.amber }}>
          MARKETING CAMPAIGN
        </div>
        <div style={{ fontSize: 8, color: COLORS.textDim, letterSpacing: 1, marginTop: 2 }}>
          {currentFilm?.title || 'UNTITLED'} — Boost the hype before premiere night
        </div>
      </div>

      {/* Carmen's commentary */}
      <DialogueBox character={CHARACTERS.carmen} line={carmenLine} />

      {/* Budget display */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>FILM BUDGET LEFT</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.amber, marginTop: 2 }}>{fmt(movieBudget)}</div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>TREASURY</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.green, marginTop: 2 }}>{fmt(funds)}</div>
        </div>
      </div>

      {/* Marketing Suite bonus indicator */}
      {hasMarketingSuite && (
        <div style={{ fontSize: 8, color: COLORS.cyan, textAlign: 'center', letterSpacing: 1 }}>
          🏢 MARKETING SUITE — 30% discount + base hype +5
        </div>
      )}

      {/* Treasury dip prompt */}
      {dipPrompt && (
        <div style={{ padding: '10px 12px', background: `${COLORS.amber}0f`, border: `1px solid ${COLORS.amber}26`, borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: COLORS.amber, marginBottom: 6 }}>
            {dipPrompt.item.label} costs {fmt(dipPrompt.cost)}. Film budget short by {fmt(dipPrompt.shortfall)}.
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0 6px', marginBottom: 4 }}>
            <div style={{ fontSize: 14, flexShrink: 0 }}>{CHARACTERS.arthur.icon}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.4 }}>
              "{getDialogue('arthur', 'treasury_dip_react', { ledger, film: filmNumber + 1 })}"
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div onClick={acceptDip} style={{ flex: 1, padding: '8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center', fontSize: 9, background: `${COLORS.amber}14`, border: `1px solid ${COLORS.amber}33`, color: COLORS.amber }}>
              DIP INTO TREASURY
            </div>
            <div onClick={() => setDipPrompt(null)} style={{ flex: 1, padding: '8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center', fontSize: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: COLORS.textDim }}>
              NEVER MIND
            </div>
          </div>
        </div>
      )}

      {/* Options list */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map(opt => {
          const cost = Math.round(opt.baseCost * discount);
          const alreadyBought = purchased.includes(opt.id);
          const canAfford = cost <= movieBudget || (cost - movieBudget) <= funds;

          return (
            <div
              key={opt.id}
              onClick={() => !alreadyBought && canAfford && !dipPrompt && buyItem(opt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 6,
                background: alreadyBought ? `${COLORS.green}0a` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${alreadyBought ? COLORS.green + '33' : 'rgba(255,255,255,0.06)'}`,
                cursor: alreadyBought || !canAfford || dipPrompt ? 'default' : 'pointer',
                opacity: alreadyBought ? 0.5 : canAfford ? 1 : 0.35,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 18 }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#fff', letterSpacing: 0.5 }}>
                  {opt.label}
                  {alreadyBought && <span style={{ color: COLORS.green, marginLeft: 6 }}>✓</span>}
                </div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{opt.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber }}>
                  {hasMarketingSuite && !alreadyBought && (
                    <span style={{ fontSize: 7, color: COLORS.textMuted, textDecoration: 'line-through', marginRight: 4 }}>
                      {fmt(opt.baseCost)}
                    </span>
                  )}
                  {fmt(cost)}
                </div>
                <div style={{ fontSize: 8, color: COLORS.cyan }}>Hype +{opt.hype}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hype summary + done button */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>HYPE BOOST</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: totalHypeBought > 0 ? COLORS.cyan : COLORS.textDim }}>
            +{totalHypeBought}
          </div>
        </div>
        <JuicyButton
          onClick={finish}
          style={{
            padding: '12px 24px',
            background: COLORS.green,
            color: '#000',
            border: `1px solid ${COLORS.green}`,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          DONE — GO TO PREMIERE
        </JuicyButton>
      </div>
    </div>
  );
}
