'use client';
// Pacific Dreams — Terminal wrapper
// Renders the full SP-1000 terminal with Pacific Dreams branding (boot logo + program name)

import TerminalContainer from '../terminal-container';
import PACIFIC_DREAMS_PROGRAM from './pacific-dreams-program';

export default function PacificDreamsTerminal() {
  return <TerminalContainer program={PACIFIC_DREAMS_PROGRAM} />;
}
