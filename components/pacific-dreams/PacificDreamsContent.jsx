'use client';
// Pacific Dreams / Backlot Mogul — Game Content (rendered inside the Terminal shell)
// All 7 phases live: Title, PreProd, Production, Marketing, Premiere, Lot, Endgame.

import { useState, useEffect } from 'react';
import useStore from '../../lib/pacific-dreams/store';
import { COLORS, MONO, DISPLAY } from './GameStyles';
import { getDannyText } from '../../lib/pacific-dreams/dialogueEngine';
import PreProduction from './PreProduction';
import Production from './Production';
import Marketing from './Marketing';
import Premiere from './Premiere';
import CombinedLot from './CombinedLot';
import Endgame from './Endgame';

// Screen height — viewport-relative so the game fits in the browser window.
// Subtracts terminal overhead (shell padding + housing + toolbar + bezel ≈ 124px)
// and clamps to a reasonable range so it's always taller than SP-1000 but never overflows.
function getScreenHeight(isMobile) {
  if (typeof window === 'undefined') return 700; // SSR fallback
  const available = window.innerHeight - 124;
  const min = isMobile ? 480 : 580;
  const max = isMobile ? 620 : 750;
  return Math.max(min, Math.min(max, available));
}

function StudioHeader() {
  const { reputation, filmNumber, history, funds, getRepStars } = useStore();
  const repStars = getRepStars();

  return (
    <div style={{
      fontFamily: MONO,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 16px',
      borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.surface,
    }}>
      <div>
        <div style={{
          fontSize: 12,
          fontFamily: DISPLAY,
          fontWeight: 700,
          letterSpacing: 3,
          color: COLORS.amber,
        }}>
          PACIFIC DREAMS
        </div>
        <div style={{
          fontSize: 8,
          letterSpacing: 2,
          color: COLORS.textDim,
          marginTop: 2,
        }}>
          {'★'.repeat(repStars)}{'☆'.repeat(5 - repStars)} REPUTATION
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 10,
          color: COLORS.textDim,
          letterSpacing: 1,
        }}>
          FILM #{filmNumber + 1}
        </div>
        <div style={{
          fontSize: 9,
          color: funds >= 0 ? COLORS.green : COLORS.red,
          marginTop: 2,
        }}>
          {funds >= 1e9 ? `$${(funds / 1e9).toFixed(1)}B` : funds >= 1e6 ? `$${(funds / 1e6).toFixed(0)}M` : funds >= 1e3 ? `$${(funds / 1e3).toFixed(0)}K` : `$${funds}`}
        </div>
      </div>
    </div>
  );
}

function TitleScreen() {
  const setPhase = useStore(s => s.setPhase);

  return (
    <div style={{
      flex: 1,
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: 32,
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontFamily: DISPLAY,
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: 6,
        color: COLORS.amber,
        textAlign: 'center',
        textShadow: `0 0 20px ${COLORS.amber}44`,
      }}>
        BACKLOT MOGUL
      </div>
      <div style={{
        fontFamily: MONO,
        fontSize: 10,
        color: COLORS.textDim,
        letterSpacing: 2,
        textAlign: 'center',
        lineHeight: 1.8,
      }}>
        BUILD A STUDIO. MAKE MOVIES. SURVIVE HOLLYWOOD.
      </div>
      <button
        onClick={() => setPhase('preprod')}
        style={{
          fontFamily: DISPLAY,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 4,
          color: COLORS.green,
          background: 'transparent',
          border: `1px solid ${COLORS.green}`,
          padding: '14px 32px',
          cursor: 'pointer',
          marginTop: 16,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.target.style.background = COLORS.green;
          e.target.style.color = '#000';
        }}
        onMouseLeave={e => {
          e.target.style.background = 'transparent';
          e.target.style.color = COLORS.green;
        }}
      >
        START
      </button>
    </div>
  );
}

function MigrationPlaceholder({ phaseName }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 32,
      fontFamily: MONO,
    }}>
      <div style={{
        fontSize: 11,
        letterSpacing: 3,
        color: COLORS.amber,
        textTransform: 'uppercase',
      }}>
        {phaseName}
      </div>
      <div style={{
        fontSize: 9,
        color: COLORS.textDim,
        letterSpacing: 1,
        textAlign: 'center',
        lineHeight: 1.8,
      }}>
        ENGINE WIRED. UI REBUILDING.
        <br />
        BACKLOT MOGUL MIGRATION IN PROGRESS.
      </div>
      <div style={{
        width: 120,
        height: 2,
        background: COLORS.border,
        borderRadius: 1,
        overflow: 'hidden',
        marginTop: 8,
      }}>
        <div style={{
          width: '35%',
          height: '100%',
          background: COLORS.green,
          animation: 'pdPulse 2s ease infinite',
        }} />
      </div>
    </div>
  );
}

function RebootOverlay() {
  const resetGame = useStore(s => s.resetGame);
  const cancelReboot = useStore(s => s.cancelReboot);
  const filmNumber = useStore(s => s.filmNumber);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20,
      fontFamily: MONO,
    }}>
      <div style={{
        fontFamily: DISPLAY,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: 3,
        color: COLORS.amber,
        textShadow: `0 0 16px ${COLORS.amber}33`,
      }}>
        REBOOT STUDIO?
      </div>
      <div style={{
        fontSize: 9,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 1.8,
        letterSpacing: 1,
        maxWidth: 260,
      }}>
        {filmNumber > 0
          ? `THIS WILL ERASE ${filmNumber} FILM${filmNumber !== 1 ? 'S' : ''} AND ALL PROGRESS.`
          : 'START A NEW GAME FROM SCRATCH.'
        }
        <br />
        THIS CANNOT BE UNDONE.
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <button
          onClick={() => { resetGame(); }}
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            color: COLORS.red,
            background: 'transparent',
            border: `1px solid ${COLORS.red}55`,
            padding: '10px 24px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.target.style.background = COLORS.red; e.target.style.color = '#000'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = COLORS.red; }}
        >
          REBOOT
        </button>
        <button
          onClick={cancelReboot}
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            color: COLORS.textDim,
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            padding: '10px 24px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.target.style.borderColor = COLORS.text; e.target.style.color = COLORS.text; }}
          onMouseLeave={e => { e.target.style.borderColor = COLORS.border; e.target.style.color = COLORS.textDim; }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

export default function PacificDreamsContent() {
  const phase = useStore(s => s.phase);
  const rebootRequested = useStore(s => s.rebootRequested);
  const ledger = useStore(s => s.ledger);
  const filmNumber = useStore(s => s.filmNumber);
  const setDannyLastMessage = useStore(s => s.setDannyLastMessage);
  const novaIntroduced = useStore(s => s.novaIntroduced);
  const introduceNova = useStore(s => s.introduceNova);
  const simulateNova = useStore(s => s.simulateNova);
  const setPhase = useStore(s => s.setPhase);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 700);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Compute Danny message + Nova simulation on lot entry
  useEffect(() => {
    if (phase === 'lot') {
      const ctx = { ledger, film: filmNumber };
      setDannyLastMessage(getDannyText(ctx));
      // Nova intro on Film 3+
      if (filmNumber >= 3 && !novaIntroduced) introduceNova();
      if (novaIntroduced) simulateNova();
    }
  }, [phase]);

  // Safety net: auto-redirect to endgame if lot is already full on re-entry
  useEffect(() => {
    if (phase === 'lot' && useStore.getState().endgameTriggered) {
      setPhase('endgame');
    }
  }, [phase, setPhase]);

  // Start with SSR-safe fallback (700), then measure on client after mount.
  // This avoids hydration mismatch from window.innerHeight differing from SSR.
  const [screenHeight, setScreenHeight] = useState(700);
  useEffect(() => {
    const onResize = () => setScreenHeight(getScreenHeight(isMobile));
    onResize(); // initial measurement
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMobile]);

  return (
    <div style={{
      width: '100%',
      height: screenHeight,
      backgroundColor: '#080808',
      borderRadius: 6,
      padding: isMobile ? '12px 12px 10px' : '18px 24px 16px',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: MONO,
      color: COLORS.text,
    }}>
      <style>{`
        @keyframes pdPulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes pdShake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-4px); }
          30%, 70% { transform: translateX(4px); }
        }
        @keyframes pdConfettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
        @keyframes pdStamp {
          0% { transform: scale(2); opacity: 0; }
          60% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pdProgressPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.8); }
          100% { transform: scale(1); }
        }
        @keyframes pdFlashBorder {
          0% { box-shadow: 0 0 0 0 rgba(51,255,102,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(51,255,102,0); }
        }
        @keyframes pdFloatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-16px); }
        }
        @keyframes pdDimPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {phase !== 'title' && phase !== 'preprod' && phase !== 'lot' && phase !== 'endgame' && <StudioHeader />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
        {phase === 'title' && <TitleScreen />}
        {phase === 'preprod' && <PreProduction />}
        {phase === 'production' && <Production />}
        {phase === 'marketing' && <Marketing />}
        {phase === 'premiere' && <Premiere />}
        {phase === 'lot' && <CombinedLot />}
        {phase === 'endgame' && <Endgame />}
      </div>

      {rebootRequested && <RebootOverlay />}
    </div>
  );
}
