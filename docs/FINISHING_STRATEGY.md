# Backlot Mogul — Finishing Strategy & Visual Workflow

## Current Status: 93% Complete

6 of 7 game phases have real, working components. The only missing piece is Endgame.jsx.

### What's Done (do not rebuild)

| System | Status | Notes |
|--------|--------|-------|
| Phase router (6/7 phases) | Done | Only endgame is placeholder |
| Game loop transitions | Done | All phases advance correctly |
| Dialogue engine (5 NPCs) | Done | Wired to PreProd, Marketing, Production, Premiere, Lot |
| Danny iMessage bubbles | Done | getDannyText() called on lot entry |
| Nova rival system | Done | Simulates from Film 3+, headlines display |
| Building prerequisites | Done | A-List, Blockbuster, Sci-Fi gated |
| Memory ledger (45+ tags) | Done | Tracks all player decisions |
| Consequence engine | Done | Walkouts in Production, headlines in Premiere |
| Archetype system (6 types) | Done | derivePlayStyle() scores and labels |
| Two-wallet funding | Done | Self-fund vs distributor with revenue share |
| Talent relations (18 types) | Done | Loyalty, grudges, muse system |

---

## What Remains (priority order)

### P0 — Ship Blocker

**1. Create Endgame.jsx** (~150-200 lines)
- Trigger: all 8 lot plots filled → `setPhase('endgame')`
- Sections (in order):
  - **Studio Valuation**: Final treasury + asset value of buildings/rides
  - **Filmography**: Scrolling list of all films from `history[]` with verdict + earnings
  - **Archetype Reveal**: `getPlayStyle()` returns style/label/description
  - **Danny's Final Letter**: `DANNY.endgame_success` (if doing well) or `DANNY.endgame_struggle`
  - **Nova's Farewell Note**: `NOVA.endgame` — always shown if `novaIntroduced`
  - **Reboot Button**: calls `resetGame()` to wipe store

**2. Wire into phase router**
- Replace `<MigrationPlaceholder>` with `<Endgame />` in PacificDreamsContent.jsx

**3. Fix phase transition gap**
- Add auto-transition in PacificDreamsContent.jsx lot-entry useEffect:
  if `endgameTriggered && phase === 'lot'` → `setPhase('endgame')`

### P1 — Polish (each <30 min)

**4. Fix Nova favorite genre** — `store.js:323` has `const favorite = null` TODO, should use `favoriteGenre(ledger)` from memoryLedger

**5. Add persistence** — Zustand `persist` middleware so game survives page refresh

**6. Endgame phased reveal** — Show sections one at a time (like Premiere does with reviews → box office → verdict)

### P2 — Nice to Have (expansion)

**7.** Second playthrough variance (different Danny lines, harder economy)
**8.** Achievement/milestone badges on endgame screen
**9.** Share/screenshot export of legacy report

### What NOT to Build

- PARK tab / EXEC tab (not designed)
- New buildings beyond the existing 8
- Multiplayer or social features
- Building prerequisites (already complete)
- Dialogue wiring (already complete)

---

## Visual Change Workflow

### Rendering Stack (outside → in)

```
app/games/pacific-dreams/page.jsx
  → PacificDreamsTerminal.jsx
    → Terminal (sp1000-terminal.jsx) with program={PACIFIC_DREAMS_PROGRAM}
      → CRT Housing (matte black, 1260px max-width)
        → Screen Bezel (recessed, inner rim)
          → CRTOverlay (phosphor glow, scanlines, glass, shadow, vignette)
          → PacificDreamsContent.jsx
            → StudioHeader (title, rep stars, funds)
            → Scrollable Content (flex:1, overflow-y:auto)
              → Phase Component
```

### What to Edit for Each Type of Change

| Change Type | Where to Edit | Notes |
|-------------|---------------|-------|
| Game-phase UI (colors, layout, spacing) | Phase component (e.g., Production.jsx) | Inline styles, uses GameStyles constants |
| New visual element | Create in `components/pacific-dreams/`, import into phase | Style with inline objects |
| Color palette | `GameStyles.jsx` | Changes propagate to all phases |
| Fonts | `GameStyles.jsx` + `app/layout.jsx` (Google Fonts imports) | |
| CRT housing (frame, scanlines, glow) | `sp1000-terminal.jsx` CRTOverlay | Shared with SP-1000 app — be careful |
| Viewport height | `PacificDreamsContent.jsx` | 670px desktop / 540px mobile |
| Mobile/responsive | `PacificDreamsContent.jsx` | `isMobile` breakpoint at 700px |
| Animations | `<style>` tag in component JSX | Define @keyframes inline |

### Visual Iteration Tools

**Best workflow: Claude Code + browser side by side**
- `npm run dev` for hot reload
- Edit → see changes instantly
- Use Chrome DevTools to prototype style tweaks, then commit to code

**For major redesigns:**
- Start with Claude Chat brainstorming (use `docs/PROMPT_CLAUDE_CHAT.md`)
- Mock layout as ASCII or describe visual hierarchy
- Then implement in Claude Code (use `docs/PROMPT_CLAUDE_CODE.md`)

**CRT aesthetic tweaks:**
- 5 independent overlay layers — toggle each with `display: 'none'` to isolate effects
- Scanline density: `repeating-linear-gradient` gap in CRTOverlay
- Phosphor color: radial gradient color in CRTOverlay
- Vignette strength: inset box-shadow spread in CRTOverlay
