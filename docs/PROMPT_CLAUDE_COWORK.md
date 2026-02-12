# Claude Cowork Handoff Prompt

> Paste this into a Claude cowork (pair programming) session for focused implementation.

```
PROJECT: Backlot Mogul — movie studio tycoon in React/Next.js CRT terminal
REPO: /Users/adamtempleton/Desktop/VIBECODE
DOCS: Read docs/HANDOFF.md first (complete implementation guide)

CURRENT STATE: 93% complete. 6/7 phases working. Endgame is placeholder.

FILE MAP (game-critical):
  components/pacific-dreams/
    PacificDreamsContent.jsx  — phase router (renders phase components)
    CombinedLot.jsx           — lot builder + Danny/Nova display
    PreProduction.jsx         — genre/writer/budget/talent selection (~1200 lines)
    Production.jsx            — crisis cards + walkouts
    Marketing.jsx             — ad spending + treasury dips
    Premiere.jsx              — box office reveal + verdict
    DialogueComponents.jsx    — TypewriterText, DialogueBox, NPCQuote
    GameStyles.jsx            — COLORS, MONO, DISPLAY constants

  lib/pacific-dreams/
    store.js                  — Zustand store, 35+ actions, initialState line 48-85
    dialogueEngine.js         — 5 NPCs, memory-aware getDialogue(), getDannyText(), getNovaHeadline()
    memoryLedger.js           — 45+ tags, derivePlayStyle() returns 6 archetypes
    consequenceEngine.js      — production walkouts + premiere consequences
    talentRelations.js        — 18 archetypes, loyalty/grudge, simulateNovaFilm()

IMMEDIATE TASK: Build Endgame.jsx
  - Trigger: lot fills (8/8 plots) → setPhase('endgame')
  - Content: Studio valuation, filmography scroll, archetype reveal, Danny's letter, Nova note
  - Store data: history[] has all completed films, getPlayStyle() returns archetype,
    DANNY.endgame_success / endgame_struggle in dialogueEngine, NOVA.endgame exists
  - Style: COLORS/MONO/DISPLAY from GameStyles.jsx, inline styles, credits-roll aesthetic
  - Exit: resetGame() wipes store to initialState

STYLE RULES: All inline. No CSS files. Use COLORS.green/amber/red/cyan.
MONO for data, DISPLAY for headers.
```
