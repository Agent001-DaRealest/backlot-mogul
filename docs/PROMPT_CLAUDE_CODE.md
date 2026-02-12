# Claude Code Handoff Prompt

> Paste this into a Claude Code session as initial context for implementation work.

```
You are working on BACKLOT MOGUL, a movie studio tycoon game built in React/Next.js
at /Users/adamtempleton/Desktop/VIBECODE.

READ FIRST:
- /Users/adamtempleton/Desktop/VIBECODE/docs/HANDOFF.md (§1-§9: file map, game loop,
  money system, store shape, memory system, buildings, status matrix, gotchas)
- /Users/adamtempleton/Desktop/VIBECODE/docs/LIONHEAD_DESIGN.txt (game design bible)
- /Users/adamtempleton/Desktop/VIBECODE/docs/MASTER_SCRIPT.txt (character bible)

ARCHITECTURE:
- Single monolith component: components/sp1000-terminal.jsx (~4800 lines) — CRT terminal housing
- Game lives inside: components/pacific-dreams/ (12+ component files)
- Game logic: lib/pacific-dreams/ (store.js, dialogueEngine.js, memoryLedger.js,
  consequenceEngine.js, talentRelations.js, juice.js)
- All styling: inline style objects using COLORS/MONO/DISPLAY from GameStyles.jsx
- Store: Zustand (no persistence) — see store.js initialState (line 48-85)
- Phase router: PacificDreamsContent.jsx renders phase-specific components

GAME LOOP: title → preprod → production → marketing → premiere → lot → (repeat or endgame)

WHAT'S COMPLETE (do NOT rebuild):
- Dialogue engine fully wired to PreProduction, Marketing, Production, Premiere, CombinedLot
- Danny iMessage bubbles populate from getDannyText() on lot entry
- Nova rival simulates from Film 3+, headline displays on lot screen
- Building prerequisites gate A-List/Blockbuster/Sci-Fi in PreProduction.jsx
- Memory ledger tracks 45+ event types, consequence engine reacts to patterns
- derivePlayStyle() returns 6 archetypes with scores/labels/descriptions
- Two-wallet funding (self-fund vs distributor) with revenue share math — all in Hollywood dollars

WHAT'S MISSING:
- Endgame.jsx — currently a MigrationPlaceholder (phase === 'endgame')
- Phase transition gap: CombinedLot calls setPhase('endgame') on final build,
  but if user returns to lot with lot already full, no auto-transition fires
- store.js:323 TODO: Nova's favorite genre is null, should use favoriteGenre() from memoryLedger
- No persistence layer — game resets on browser refresh

CRITICAL GOTCHAS:
- All money in Hollywood dollars ($15M = 15_000_000) — single scale everywhere, no conversions
- Film 1 is rigged to always be a HIT (Premiere.jsx first-film guarantee)
- Plots 5 (Studio Home) and 6 (Park Gate) are permanent — never null
- Animation timing chains are fragile — DON'T add new timeouts to Premiere.jsx timer chain
- resetGame() calls set(initialState) — wipes everything including ledger

DEV: npm run dev (port 3000) | Game URL: localhost:3000/games/pacific-dreams
DEPLOY: GitHub → backlot remote, main branch | Vercel: vibecode-blush.vercel.app
```
