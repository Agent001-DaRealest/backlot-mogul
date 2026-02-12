'use client';
// Pacific Dreams — Game Shell
// Phase router, CRT frame, scanline overlay

import useGameStore from '../../lib/pacific-dreams/store';
import { COLORS, MONO, screenContainer } from './GameStyles';
import Dock from './Dock';
import PreProduction from './PreProduction';
import Production from './Production';
import Premiere from './Premiere';
import { getReputationLabel } from '../../lib/pacific-dreams/engine';

function StudioHeader() {
  const { studioName, reputation, movieNumber, history, funds } = useGameStore();
  const repLabel = getReputationLabel(reputation, history.length);

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
          fontWeight: 700,
          letterSpacing: 3,
          color: COLORS.amber,
        }}>
          {studioName.toUpperCase()}
        </div>
        <div style={{
          fontSize: 8,
          letterSpacing: 2,
          color: COLORS.textDim,
          marginTop: 2,
        }}>
          {repLabel}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 10,
          color: COLORS.textDim,
          letterSpacing: 1,
        }}>
          FILM #{movieNumber}
        </div>
        {history.length > 0 && (
          <div style={{
            fontSize: 9,
            color: funds >= 0 ? COLORS.green : COLORS.red,
            marginTop: 2,
          }}>
            {funds >= 1e9 ? `$${(funds / 1e9).toFixed(1)}B` : funds >= 1e6 ? `$${(funds / 1e6).toFixed(0)}M` : funds >= 1e3 ? `$${(funds / 1e3).toFixed(0)}K` : `$${funds}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PacificDreamsShell() {
  const phase = useGameStore(s => s.phase);

  return (
    <div style={screenContainer}>
      {/* pd-prefixed @keyframes for all game animations */}
      <style>{`
        @keyframes pdShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        @keyframes pdConfettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pdStamp {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pdProgressPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.6); }
          100% { transform: scale(1); }
        }
        @keyframes pdFlashBorder {
          0% { border-color: #ffffff; }
          100% { border-color: #33ff66; }
        }
        @keyframes pdPulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes pdFloatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        @keyframes pdDimPulse {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
      `}</style>

      {/* Scanline overlay */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        zIndex: 50,
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px)',
      }} />

      <StudioHeader />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {phase === 'pre-production' && <PreProduction />}
        {phase === 'production' && <Production />}
        {phase === 'premiere' && <Premiere />}
      </div>

      <Dock />
    </div>
  );
}
