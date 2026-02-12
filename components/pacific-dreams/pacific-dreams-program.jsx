// Pacific Dreams — Program config for the Terminal shell
// Overrides branding (boot logo, boot text, toolbar name) and provides game content.
// The CRT housing, bezel, scanlines, boot animation, and glass effects come from the Terminal.

import React from 'react';
import PacificDreamsContent from './PacificDreamsContent';
import useStore from '../../lib/pacific-dreams/store';

// ═══════════════════════════════════════════
// 1980s Laser-Write Title Card for CRT warm-up phase
// Letters reveal left-to-right with staggered delays,
// heavy phosphor glow, and a subtitle fade-in.
// ═══════════════════════════════════════════

const MONO = "'Share Tech Mono', 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace";

function LaserTitle() {
  const title = 'BACKLOT';
  const subtitle = 'MOGUL';
  const perLetter = 0.055;   // seconds between each letter start
  const writeDur = 0.18;     // how long each letter takes to reveal
  const row2Offset = title.length * perLetter + 0.12; // gap before second word
  const subtitleDelay = row2Offset + subtitle.length * perLetter + 0.25;

  const letterStyle = (i, offset = 0) => ({
    display: 'inline-block',
    animation: `sp1000laserWrite ${writeDur}s ease-out ${offset + i * perLetter}s both`,
    color: '#33ff66',
    textShadow: '0 0 12px rgba(51,255,102,0.6), 0 0 30px rgba(51,255,102,0.2)',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      gap: 6,
    }}>
      {/* BACKLOT — large, laser-written */}
      <div style={{
        fontFamily: MONO,
        fontSize: 52,
        fontWeight: 700,
        letterSpacing: 8,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        animation: `sp1000laserGlow 1.2s ease-out ${title.length * perLetter + 0.1}s both`,
      }}>
        {title.split('').map((ch, i) => (
          <span key={i} style={letterStyle(i)}>{ch}</span>
        ))}
      </div>

      {/* MOGUL — same size, second row */}
      <div style={{
        fontFamily: MONO,
        fontSize: 52,
        fontWeight: 700,
        letterSpacing: 8,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        animation: `sp1000laserGlow 1.2s ease-out ${row2Offset + subtitle.length * perLetter + 0.1}s both`,
      }}>
        {subtitle.split('').map((ch, i) => (
          <span key={i} style={letterStyle(i, row2Offset)}>{ch}</span>
        ))}
      </div>

      {/* by SOUTH END GAMES — smaller, fades in after title completes */}
      <div style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: 4,
        color: '#33ff66',
        opacity: 0,
        marginTop: 14,
        textShadow: '0 0 8px rgba(51,255,102,0.4)',
        animation: `sp1000subtitleFade 0.5s ease-out ${subtitleDelay}s both`,
      }}>
        SOUTH END GAMES
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Double-click logo → skip to endgame (hidden test shortcut)
// Single click → normal reboot overlay (500ms debounce)
// ═══════════════════════════════════════════

let _logoClickTimer = null;
let _logoClickCount = 0;

function handleLogoClick() {
  _logoClickCount++;
  if (_logoClickCount === 1) {
    _logoClickTimer = setTimeout(() => {
      _logoClickCount = 0;
      _logoClickTimer = null;
      useStore.getState().requestReboot();
    }, 500);
  } else if (_logoClickCount >= 2) {
    clearTimeout(_logoClickTimer);
    _logoClickTimer = null;
    _logoClickCount = 0;
    useStore.getState().setEndgameTestState();
  }
}

const PACIFIC_DREAMS_PROGRAM = {
  id: 'pacific-dreams',
  name: 'PACIFIC DREAMS',
  logo: '/south-end-games-logo-social.jpg',
  // Viewport-relative height — fits in browser window without overflow
  get screenHeight() {
    if (typeof window === 'undefined') return 700;
    const isMobile = window.innerWidth < 700;
    const available = window.innerHeight - 124;
    const min = isMobile ? 480 : 580;
    const max = isMobile ? 620 : 750;
    return Math.max(min, Math.min(max, available));
  },
  bootLines: [
    { text: 'SOUTH END GAMES' },
    { text: 'PACIFIC DREAMS v1.0' },
    { text: '' },
    { text: 'LOADING STUDIO ASSETS........ OK' },
    { text: 'INITIALIZING GAME ENGINE..... OK' },
    { text: 'READING GENRE DATABASE....... OK' },
    { text: 'POLLING BOX OFFICE DATA...... OK' },
    { text: 'CALIBRATING REPUTATION METER. OK' },
    { text: '' },
    { text: 'CASTING CREW PROFILES' },
    { text: 'SETTING PRODUCTION BUDGETS' },
    { text: 'COMPILING CRISIS SCENARIOS' },
    { text: 'LOADING PREMIERE SEQUENCES' },
    { text: '' },
    { text: 'BUILDING YOUR STUDIO EMPIRE . . . READY' },
  ],
  warmUpContent: <LaserTitle />,
  content: (props) => <PacificDreamsContent {...props} />,
  onLogoClick: handleLogoClick,
};

export default PACIFIC_DREAMS_PROGRAM;
