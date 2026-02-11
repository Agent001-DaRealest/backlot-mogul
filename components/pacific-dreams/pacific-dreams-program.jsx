// Pacific Dreams — Program config for the Terminal shell
// Overrides branding (boot logo, boot text, toolbar name) and provides game content.
// The CRT housing, bezel, scanlines, boot animation, and glass effects come from the Terminal.

import React from 'react';
import PacificDreamsContent from './PacificDreamsContent';
import useStore from '../../lib/pacific-dreams/store';

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
  content: (props) => <PacificDreamsContent {...props} />,
  onLogoClick: () => useStore.getState().requestReboot(),
};

export default PACIFIC_DREAMS_PROGRAM;
