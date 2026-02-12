// Pacific Dreams — Program config for the Terminal shell
// Overrides branding (boot logo, boot text, toolbar name) and provides game content.
// The CRT housing, bezel, scanlines, boot animation, and glass effects come from the Terminal.

import React from 'react';
import PacificDreamsContent from './PacificDreamsContent';
import useStore from '../../lib/pacific-dreams/store';

// ═══════════════════════════════════════════
// DOS-style ASCII title card for CRT warm-up phase
// Replaces the default green-block stock terminal animation
// ═══════════════════════════════════════════

const MONO = "'Share Tech Mono', 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace";

const DOS_TITLE = `╔══════════════════════════════════════╗
║                                      ║
║   ██████╗  █████╗  ██████╗██╗███████╗║
║   ██╔══██╗██╔══██╗██╔════╝██║██╔════╝║
║   ██████╔╝███████║██║     ██║█████╗  ║
║   ██╔═══╝ ██╔══██║██║     ██║██╔══╝  ║
║   ██║     ██║  ██║╚██████╗██║██║     ║
║   ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝╚═╝     ║
║                                      ║
║   ██████╗ ██████╗ ███████╗ █████╗    ║
║   ██╔══██╗██╔══██╗██╔════╝██╔══██╗   ║
║   ██║  ██║██████╔╝█████╗  ███████║   ║
║   ██║  ██║██╔══██╗██╔══╝  ██╔══██║   ║
║   ██████╔╝██║  ██║███████╗██║  ██║   ║
║   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝ ╚═╝    ║
║                                      ║
║             ███╗   ███╗███████╗      ║
║             ████╗ ████║██╔════╝      ║
║             ██╔████╔██║███████╗      ║
║             ██║╚██╔╝██║╚════██║      ║
║             ██║ ╚═╝ ██║███████║      ║
║             ╚═╝     ╚═╝╚══════╝      ║
║                                      ║
║      SOUTH END GAMES · BOSTON        ║
║        — GOES HOLLYWOOD —            ║
║                                      ║
╚══════════════════════════════════════╝`;

function DosTitleCard() {
  return (
    <pre style={{
      fontFamily: MONO,
      fontSize: 8.5,
      lineHeight: 1.15,
      color: '#33ff66',
      textShadow: '0 0 8px rgba(51,255,102,0.5), 0 0 20px rgba(51,255,102,0.15)',
      margin: 0,
      padding: 0,
      whiteSpace: 'pre',
      textAlign: 'center',
      letterSpacing: 0,
    }}>
      {DOS_TITLE}
    </pre>
  );
}

const PACIFIC_DREAMS_PROGRAM = {
  id: 'pacific-dreams',
  name: 'PACIFIC DREAMS',
  logo: '/south-end-games-logo-social.jpg',
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
  warmUpContent: <DosTitleCard />,
  content: (props) => <PacificDreamsContent {...props} />,
  onLogoClick: () => useStore.getState().requestReboot(),
};

export default PACIFIC_DREAMS_PROGRAM;
