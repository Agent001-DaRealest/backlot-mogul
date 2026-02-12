# BACKLOT MOGUL — Implementation Handoff

> **Last updated:** Feb 2025, post Hollywood Single-Scale Monetary Refactor
> **Status:** Playable loop (Title → Lot), Endgame placeholder
> **Branch:** `add-game-mode` / remote: `backlot`
> **Route:** `/games/pacific-dreams`

---

## 1. File Map

### Components (`components/pacific-dreams/`)

| File | Purpose |
|------|---------|
| `PacificDreamsContent.jsx` | Phase router + StudioHeader + RebootOverlay |
| `PacificDreamsTerminal.jsx` | Wraps content in the CRT terminal shell |
| `pacific-dreams-program.jsx` | Program config (boot text, toolbar buttons) for terminal shell |
| `PreProduction.jsx` | 5-beat flow: Market → Concept → Funding → Talent → Greenlight |
| `Production.jsx` | 5 crisis cards + walkout injection |
| `Marketing.jsx` | Ad-buying phase (5 options + Marketing Suite bonus) |
| `Premiere.jsx` | Phased reveal: reviews → box office → verdict → consequences |
| `CombinedLot.jsx` | 2×4 lot grid + mountain landscape + building/ride placement |
| `JuicyButton.jsx` | Animated button with press effect + click sound |
| `CrisisCard.jsx` | Binary-choice card with entrance/exit animations |
| `GameStyles.js` | Shared COLORS, MONO, DISPLAY constants |
| `Dock.jsx` | Bottom dock bar (PARK/EXEC tabs greyed out — not yet wired) |
| `PacificDreamsShell.jsx` | Old standalone shell — **unused**, superseded by terminal program pattern |

### Lib (`lib/pacific-dreams/`)

| File | Purpose |
|------|---------|
| `store.js` | Zustand store — all game state + actions |
| `engine.js` | Pure math: quality calc, crisis cards, box office sim |
| `consequenceEngine.js` | Pattern detection → walkouts, headlines, funding callbacks |
| `dialogueEngine.js` | Memory-driven NPC dialogue (4 characters, 600+ lines) |
| `memoryLedger.js` | Tag catalog (45+ tags), entry creation, 20+ query helpers |
| `talentRelations.js` | Hire/grudge/loyalty tracking per talent archetype |
| `data.js` | Talent pool, genre definitions, pitch templates |
| `juice.js` | Haptic/sound feedback hooks (clickFeedback, cashFeedback, etc.) |
| `sounds.js` | Web Audio synthesized sounds (pre-warmed for mobile) |

### Docs (`docs/`)

| File | Purpose |
|------|---------|
| `LIONHEAD_DESIGN.txt` | Technical Bible — memory ledger, consequence system, lot design |
| `MASTER_SCRIPT.txt` | Character Bible — 4 NPCs, 18 talent archetypes, dialogue banks |

---

## 2. Game Loop

```
TITLE → PREPROD (5 beats) → PRODUCTION (5 crisis cards) → MARKETING (ad buying)
  → PREMIERE (phased reveal) → LOT (build/ride) → back to PREPROD
```

**Endgame** triggers when all 6 lot plots are filled. Currently a placeholder.

### PreProduction Beats
1. **MARKET** — Carmen presents genre trends (hot/warm/cold). Film 1 restricted to action/horror/comedy.
2. **CONCEPT** — Ricky offers 2-3 pitches (3rd requires Writers Bungalow). Player can edit title.
3. **FUNDING** — Self-fund from treasury OR accept a distributor deal (see §4 below).
4. **TALENT** — Cast director → lead → support. 3 options each per role, with demands and chemistry.
5. **GREENLIGHT** — Summary card. Confirms film, sets `budget` (Hollywood scale), transitions to Production.

### Production
- Draws 5 random crisis cards from pool of 16.
- Consequence engine may inject a walkout before the first card.
- Each card: binary choice affecting quality/hype (hidden internal values 0-100).
- Commissary building reduces negative deltas by 40%.
- Transitions to **Marketing**.

### Marketing
- 5 ad-buy options: TV Campaign ($4K/+12 hype), Trailer Blitz ($2K/+8), Press Junket ($1K/+4), Poster & Outdoor ($500/+2), Premiere Event ($3K/+10).
- Marketing Suite adds 6th option (Studio Screening, $500/+6), gives 30% discount on all costs, and adds +5 base hype.
- Costs come from movie budget first; treasury dip offered if short.
- Transitions to **Premiere**.

### Premiere
- 8-phase reveal animation: dark → reviews → average → box office → profit → buildup → verdict stamp → consequences → complete.
- Verdicts: BLOCKBUSTER / HIT / MODEST / CULT / FLOP (based on earnings vs budget).
- Consequence headlines fire (brother-in-law blockbuster, all-star flop, hot/cold streak, etc.).
- Transitions to **Lot**.

### Lot
- 2×4 grid with SVG mountain backdrop that evolves.
- Place buildings (permanent, from BUILDINGS catalog) or rides (one per completed film, demolishable).
- Buildings unlock game mechanics (Sound Stage → blockbuster budgets, Casting Office → A-list, etc.).

---

## 3. Single-Scale Monetary System

All money in the game uses **Hollywood dollars** (e.g., `15_000_000` = $15M). One single scale everywhere — treasury, budgets, talent costs, box office earnings, building costs. No conversions needed anywhere.

| Item | Code Value | Display |
|------|-----------|---------|
| Starting funds | `15_000_000` | $15M |
| Indie budget | `15_000_000` | $15M |
| Studio budget | `60_000_000` | $60M |
| Blockbuster budget | `120_000_000` | $120M |
| A-List talent cost | `14e6` (used directly) | $14M |
| Box office earnings | `35_000_000` (typical) | $35M |
| Sound Stage cost | `75_000_000` | $75M |

Display formatting via `fmt()` / `formatMoney()`: `>= 1B` → `$1.2B`, `>= 1M` → `$50M`, `>= 1K` → `$50K`, else `$500`.

### Film 1 Breakout
- Always self-funded (no distributor option).
- Verdict is **rigged to HIT** (reviews boosted to 7+, box office > 1.5× budget).
- Treasury reset to `max(currentFunds + earnings, $150M)` — ensures playable Film 2.

---

## 4. Two-Wallet Funding System

### Self-Fund Path
- Player allocates treasury funds upfront → keeps **100% of revenue**.
- Film 1: choose 40% / 60% / 85% of treasury.
- Film 2+: fixed tiers — Shoestring (80% of treasury if broke), Indie ($15M), Studio ($60M), Blockbuster ($120M, requires Sound Stage).

### Distributor Path
- 1-2 offers generated based on reputation, film number, last verdict.
- Player pays **nothing upfront** → keeps **40-55% of revenue** (varies by distributor risk tolerance).
- 5 distributor personalities (Meridian, Apex, Starlight, Titan, Monarch) with `minRep` gating.
- Budget scales with rep; post-blockbuster +20% bonus, post-flop -30% penalty.

### Treasury Dip Mechanic
- During **casting** and **marketing**, if movie budget is insufficient, player is offered an explicit choice to raid treasury.
- Each dip is logged to memory ledger (`TREASURY_DIP` tag).
- Characters react: Arthur nags after 3+ self-funded films, Carmen warns after 3+ dips.

### Store Actions
```
setFunding(type, budget, distributorName, revenueShare)
  → Sets currentFilm.fundingType/movieBudget/revenueShare
  → If self-funded: deducts budget from treasury immediately

spendMovieBudget(amount)
  → Reduces currentFilm.movieBudgetRemaining

treasuryDip(amount)
  → Reduces funds, increments currentFilm.treasuryDips/treasuryDipTotal
```

---

## 5. Store State Shape

```javascript
{
  phase: 'title',           // title|preprod|production|marketing|premiere|lot|endgame
  funds: 15_000_000,        // Treasury (Hollywood dollars — $15M)
  reputation: 0,            // -10 to +20 (shown as 0-5 stars via thresholds)
  filmNumber: 0,            // Completed films count
  currentFilm: null,        // Active film object (see below)
  history: [],              // Completed film objects
  ledger: [],               // Memory Ledger entries
  talentRelations: {},      // Per-archetype hire/grudge/loyalty data
  novaState: {},            // Rival studio state (not yet in UI)
  plots: [null×4, null, {home}, {gate}, null],  // 2×4 lot grid
  qualityInternal: 30,      // 0-100, hidden, shown as stars
  hypeInternal: 20,         // 0-100, hidden, shown as stars
  isFirstGame: true,
  novaIntroduced: false,
  endgameTriggered: false,
  dannyLastMessage: null,
  rebootRequested: false,
}
```

### currentFilm Fields
```
genre, genreLabel                    — Beat 1
title, logline, tone, pitch          — Beat 2 (concept)
fundingType, distributorName         — Beat 3 (funding)
movieBudget, movieBudgetRemaining    — Real dollars (same scale as funds)
revenueShare                         — Player's cut (0.4-1.0)
treasuryDips, treasuryDipTotal       — Emergency funding tracking
budget                               — Same as movieBudget (real dollars, used by Premiere)
budgetTier                           — indie|studio|blockbuster
rating                               — G|PG|PG-13|R|NC-17
cast: { director, lead, support }    — Each: {archetype, tier, icon, q, h, cost, demand}
```

### Key Actions by Category
```
Phase:     setPhase
Memory:    logMemory
Funds:     addFunds, spendFunds, setFunding, spendMovieBudget, treasuryDip
Film:      setCurrentFilm, updateCurrentFilm, completeFilm
Stats:     adjustQuality, adjustHype, resetQualityHype, addReputation
Talent:    hireTalent, acceptDemand, denyDemand, fireAfterWalkout, forgiveWalkout
Lot:       buildOnPlot, demolishPlot
Nova:      introduceNova, simulateNova
Computed:  getQualityStars, getHypeStars, getRepStars, getEmptyPlots,
           getBuiltBuildings, hasBuilding, isLotFull, getPlayStyle
Reboot:    requestReboot, cancelReboot, resetGame
```

---

## 6. Memory & Consequence Systems

### Memory Ledger Tags (45+)

**Genre:** GENRE_PICKED, GENRE_REPEATED, GENRE_COLD_PICK, GENRE_COLD_SUCCESS, GENRE_COLD_FAIL, GENRE_STREAK

**Concept:** PITCH_CHOSEN, CUSTOM_TITLE, RATING_CHOSEN, RATING_MISMATCH

**Budget:** BUDGET_TIER, BUDGET_BLUFFED, BUDGET_BLUFF_FAIL, BUDGET_DOWNGRADED, BUDGET_ALWAYS_INDIE, BUDGET_AUTO_APPROVED

**Talent:** TALENT_HIRED, TALENT_REHIRED, DEMAND_ACCEPTED, DEMAND_DENIED, TALENT_REFUSED, CHEAP_CAST, ALL_STAR_CAST, BROTHER_IN_LAW, MOMS_FRIEND

**Production:** CRISIS_CHOICE, CRISIS_QUALITY_BIAS, CRISIS_HYPE_BIAS, WALKOUT, WALKOUT_FORGIVEN, WALKOUT_FIRED

**Results:** FILM_VERDICT, FILM_FLOP, FILM_BLOCKBUSTER, FILM_HIT, STREAK_HOT, STREAK_COLD

**Lot:** BUILDING_BOUGHT, BUILDING_MAXED, RIDE_PLACED, RIDE_DEMOLISHED, FIRST_BUILDING, LOT_FULL

**Nova:** NOVA_INTRODUCED, NOVA_HIT, NOVA_FLOP, NOVA_COPIES_GENRE

**Funding:** FUNDING_SELF, FUNDING_DISTRIBUTOR, TREASURY_DIP, TREASURY_DIP_PATTERN, MARKETING_SPEND, MARKETING_FROM_TREASURY, DISTRIBUTOR_REJECTED, ALWAYS_SELF_FUNDED

**Meta:** MUSE_UNLOCKED, PLAY_STYLE_DERIVED

### Key Query Helpers
`byTag`, `byActor`, `byFilm`, `lastByTag`, `unsurfaced`, `surfaceOne`, `countTag`, `timesHired`, `has`, `lastVerdict`, `verdictStreak`, `genreHistory`, `genreStreak`, `favoriteGenre`, `indieStreak`, `selfFundStreak`, `totalTreasuryDips`, `derivePlayStyle`

### Consequence Engine Patterns
- **Walkout injection** (Production) — talent with denied demands + grudge buildup
- **Brother-in-law blockbuster** — +3 rep, "FROM GARAGE TO GLORY"
- **All-star flop** — -3 rep, "$$ CAN'T BUY TALENT"
- **A-lister blame/credit** — grudge + flop = blame (-8 hype), loyalty + hit = credit (+5 hype)
- **Hot/cold streaks** — 2+ consecutive hits/flops
- **Self-fund streak warning** — Arthur nags after 3+ self-funded films
- **Treasury dip pattern** — Carmen warns after 3+ dips across films
- **Distributor relationship callback** — Arthur reports happy/burned distributor

### Dialogue Engine
4 NPCs implemented: **Carmen** (numbers/genre), **Ricky** (writing/pitch), **Arthur** (money/funding), **Danny** (emotional/PVM).

Lines are priority-scored with memory triggers. Engine exists in `dialogueEngine.js` (600+ lines) but **UI rendering is not yet wired** — characters don't visually "speak" during game beats.

---

## 7. Buildings & Their Effects

| Building | Cost | Unlocks | Bonuses |
|----------|------|---------|---------|
| Writers Bungalow | $25K | 3rd pitch option | Q+8 |
| Sound Stage | $75K | Blockbuster budgets | Q+5 H+5 |
| Casting Office | $50K | A-List talent | Q+3 H+8 |
| VFX Lab | $120K | Sci-Fi genre | Q+10 H+5 |
| Marketing Suite | $35K | 30% marketing discount | H+12, +5 base hype |
| Post House | $40K | — | Q+12 |
| Commissary | $15K | Reduces crisis severity ×0.6 | Q+3 H+3 |
| Backlot | $30K | Genre-specific bonus | Q+6 H+4 |

---

## 8. What's Built vs What's Not

### ✅ Fully Built
- Complete game loop: Title → PreProd → Production → Marketing → Premiere → Lot → loop
- Two-wallet funding system (self-fund + distributor paths)
- 3-role talent casting with demands, chemistry pairs, and tier gating
- 16 crisis cards + walkout injection
- Phased premiere reveal with revenue calculation and consequence headlines
- 2×4 lot builder with 9 buildings, rides, evolving landscape
- Memory ledger with 45+ tags and 20+ query helpers
- Consequence engine with 10+ pattern detectors
- Dialogue engine with memory-driven priority lines (4 NPCs)
- Mobile audio pre-warm
- Reboot confirmation overlay

### ⚠️ Partially Built
- **Dialogue rendering** — engine exists, but no speech bubbles/text boxes in game screens
- **Nova rival** — store state + simulation logic exists, no UI presence
- **Danny messages** — `dannyLastMessage` in store, no rendering
- **Play style derivation** — `derivePlayStyle()` computes archetype, never shown to player

### ❌ Not Built
- **Endgame phase** — MigrationPlaceholder when lot fills
- **PARK / EXEC tabs** — Dock.jsx has greyed-out tabs, no functionality
- **News ticker / PVM integration** — referenced in Bible, not implemented

---

## 9. Known Gotchas

1. **All money is in Hollywood dollars** — `funds`, `movieBudget`, `budget`, building costs, talent costs, box office earnings are all on the same scale (e.g., `15_000_000` = $15M). Talent cost data (e.g., `14e6` = $14M) is used directly — no conversions anywhere. WEEKLY_REVENUE_PER_THEATER = 703 produces box office in millions.

2. **Two budget fields on currentFilm** — `movieBudget` (allocated from treasury) and `budget` (same value, used by Premiere for box office math). Both set at greenlight, both in Hollywood dollars.

3. **Film 1 is rigged** — always HIT, reviews boosted to 7+, box office exceeds 1.5× budget, treasury reset to $150M minimum. This is intentional onboarding.

4. **completeFilm does NOT handle revenue** — Premiere.jsx calls `addFunds()` directly before calling `completeFilm()`. Revenue logic lives in Premiere, not the store.

5. **Quality/Hype are hidden** — internal values 0-100 mapped to 0-5 stars via non-linear thresholds `[0, 18, 38, 58, 78]`. Players see stars, never numbers.

6. **Reputation range is -10 to +20** — mapped to stars via `(rep + 10) × 5` then same thresholds. Starts at 0 (2★).

7. **Building bonuses are per-film** — Q/H bonuses from buildings are applied at the start of each film cycle, not accumulated.

8. **Plot 5 = Studio Home, Plot 6 = Park Gate** — permanent, cannot be demolished. 6 buildable plots total.

9. **Phase router in PacificDreamsContent.jsx** — StudioHeader is hidden during `title`, `preprod`, and `lot` phases (those components handle their own headers).



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§4  SCREEN 1: TITLE / NEW GAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │                         (empty dark BG)                          │
  │                                                                  │
  │                    P A C I F I C                                  │
  │                    D R E A M S                                   │
  │                                                                  │
  │                   A Hollywood Tycoon                              │
  │                                                                  │
  │                Start in a garage.                                 │
  │                Film B-movies.                                     │
  │                Become a legend.                                   │
  │                                                                  │
  │               [ ▶  N E W  G A M E ]  ◄── pulsing neon           │
  │               [    C O N T I N U E ]  ◄── only if save exists   │
  │                                                                  │
  │                      v1.0 • 2025                                 │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘

  WHAT HAPPENS HERE:
    Player sees the title, taps NEW GAME or CONTINUE.
    NEW GAME → initializes fresh store state → navigates to LOT
    CONTINUE → loads saved state from storage → navigates to LOT

  STATE CHANGES:
    NEW GAME sets:
      phase: 'lot'
      funds: 0                          (you're broke)
      reputation: 0
      movieNumber: 1
      history: []
      buildingLevels: { garage: 1, rest: 0 }
      parkPlots: []
      parkIncome: 0

  USER INTERACTIONS:
  ┌────────────────┬───────────────────────────────────────────────┐
  │ Action         │ Result                                        │
  ├────────────────┼───────────────────────────────────────────────┤
  │ TAP New Game   │ playConfirm() → init store → phase='lot'     │
  │ TAP Continue   │ playClick() → load save → phase='lot'        │
  └────────────────┴───────────────────────────────────────────────┘

  SOUNDS:
    New Game → playConfirm() (rising chime)
    Continue → playClick()

  ASSETS REQUIRED:
    None. CSS gradient background + text.

  FILE: Could be a TitleScreen component or inline in Shell.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§5  SCREEN 2: STUDIO LOT (The Hub)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  The LOT is the central hub. The player returns here after every
  movie. This is where they spend money on upgrades.

  ┌──────────────────────────────────────────────────────────────────┐
  │ PACIFIC DREAMS              💰 $0        ⭐ Rep: 0              │
  │──────────────────────────────────────────────────────────────────│
  │                                                                  │
  │ ┌─ STUDIO TIER (FRAME) ──────────────────────────────────────┐  │
  │ │ 🏚️ Garage Operation    0/9 buildings   Level 1             │  │
  │ │ Quality: +0    Hype: +0    Films: 0    Rep: 0              │  │
  │ └────────────────────────────────────────────────────────────┘  │
  │                                                                  │
  │ ┌─ CRT BEZEL (SCREEN) ──────────────────────────────────────┐  │
  │ │ ┌────────────────────────────────────────────────────────┐ │  │
  │ │ │                 PACIFIC DREAMS (tiny text)              │ │  │
  │ │ │                        ☀️                               │ │  │
  │ │ │  🌴                                           🌴       │ │  │
  │ │ │                                                        │ │  │
  │ │ │  ┌────────┐  ┌────────┐  ┌────────┐                   │ │  │
  │ │ │  │ GARAGE │  │WRITERS │  │ SOUND  │  ◄── Row 1        │ │  │
  │ │ │  │ ★☆☆   │  │  🔒    │  │ STAGE  │                   │ │  │
  │ │ │  │  🏚️    │  │  ✍️    │  │  🔒 🎬 │                   │ │  │
  │ │ │  └────────┘  └────────┘  └────────┘                   │ │  │
  │ │ │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ road ─ ─ ─ ─ ─ ─ ─            │ │  │
  │ │ │  ┌────────┐  ┌────────┐  ┌────────┐                   │ │  │
  │ │ │  │CATERING│  │EDITING │  │VFX LAB │  ◄── Row 2        │ │  │
  │ │ │  │  🔒 🍕 │  │  🔒 🎞️ │  │  🔒 🔬 │                   │ │  │
  │ │ │  └────────┘  └────────┘  └────────┘                   │ │  │
  │ │ │                                                        │ │  │
  │ │ │  ┌────────┐  ┌────────┐  ┌────────┐                   │ │  │
  │ │ │  │CASTING │  │MARKETNG│  │BACKLOT │  ◄── Row 3        │ │  │
  │ │ │  │  🔒 🌟 │  │  🔒 📺 │  │  🔒 🏗️ │                   │ │  │
  │ │ │  └────────┘  └────────┘  └────────┘                   │ │  │
  │ │ │                                                        │ │  │
  │ │ │   🚶 (walking)    🚚 (driving)    💃 (walking)        │ │  │
  │ │ │                                                        │ │  │
  │ │ └─────────────────────────────────── scanlines ──────────┘ │  │
  │ └──────────────────────────────(●)──────────────────────────┘  │
  │                                                                  │
  │ ┌─ BUILDING LIST (FRAME) ────────────────────────────────────┐  │
  │ │ 🏚️ The Garage      Lv1 Q+0 H+0            ── ★☆☆ $20K   │  │
  │ │ ✍️ Writers Bungalow               $25K ◄── green if afford │  │
  │ │ 🎬 Sound Stage                    $75K ◄── red if broke   │  │
  │ │ 🍕 Craft Services                 $15K                    │  │
  │ │ 🎞️ Editing Bay                    $40K                    │  │
  │ │ 🔬 VFX Lab                       $120K                    │  │
  │ │ 🌟 Casting Office                 $50K                    │  │
  │ │ 📺 Marketing Suite                $35K                    │  │
  │ │ 🏗️ The Backlot                    $30K                    │  │
  │ └────────────────────────────────────────────────────────────┘  │
  │                                                                  │
  │ ┌─ DOCK ─────────────────────────────────────────────────────┐  │
  │ │    🏢 LOT*   │   🎬 STAGE   │   🎢 PARK   │   📼 VAULT   │  │
  │ └────────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────────┘


  ────────────────────────────────────────────
  THE 9 BUILDINGS — Complete Reference
  ────────────────────────────────────────────

  ┌──────────────┬────────────┬─────────────────┬─────────────────┐
  │ Building     │ Level Cost │ Quality / Hype  │ Unlocks         │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 🏚️ Garage    │ FREE       │ +0  / +0        │ (start bldg)    │
  │ (Lv2)       │ $20K       │ +5  / +0        │                 │
  │ (Lv3)       │ $60K       │ +10 / +5        │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ ✍️ Writers   │ $25K       │ +15 / +0        │                 │
  │ (Lv2)       │ $55K       │ +25 / +5        │                 │
  │ (Lv3)       │ $120K      │ +40 / +10       │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 🎬 Sound St. │ $75K       │ +20 / +10       │ 🔓 Blockbusters │
  │ (Lv2)       │ $150K      │ +35 / +20       │                 │
  │ (Lv3)       │ $300K      │ +50 / +30       │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 🍕 Catering  │ $15K       │ +8  / +0        │                 │
  │ (Lv2)       │ $35K       │ +15 / +5        │                 │
  │ (Lv3)       │ $80K       │ +25 / +10       │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 🎞️ Editing   │ $40K       │ +10 / +5        │                 │
  │ (Lv2)       │ $90K       │ +20 / +10       │                 │
  │ (Lv3)       │ $200K      │ +35 / +20       │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 🔬 VFX Lab   │ $120K      │ +20 / +15       │ 🔓 Sci-Fi Genre │
  │ (Lv2)       │ $250K      │ +35 / +25       │                 │
  │ (Lv3)       │ $500K      │ +55 / +40       │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 🌟 Casting   │ $50K       │ +10 / +15       │ 🔓 A-List Crew  │
  │ (Lv2)       │ $110K      │ +20 / +25       │                 │
  │ (Lv3)       │ $250K      │ +30 / +40       │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 📺 Marketing │ $35K       │ +0  / +20       │                 │
  │ (Lv2)       │ $80K       │ +0  / +40       │                 │
  │ (Lv3)       │ $180K      │ +5  / +60       │                 │
  ├──────────────┼────────────┼─────────────────┼─────────────────┤
  │ 🏗️ Backlot   │ $30K       │ +12 / +5        │                 │
  │ (Lv2)       │ $70K       │ +22 / +10       │                 │
  │ (Lv3)       │ $160K      │ +35 / +20       │                 │
  └──────────────┴────────────┴─────────────────┴─────────────────┘

  Total investment to max everything: $2,665,000
  Max quality bonus: +240   Max hype bonus: +185


  ────────────────────────────────────────────
  AMBIENT LIFE (inside CRT area)
  ────────────────────────────────────────────

  Tiny characters wander across the lot. They appear only if you
  own 2+ buildings. More buildings = more NPCs (up to 12).

  NPCs are emoji characters with CSS animation:
    🚶 / 🚶‍♀️ — crew members walking
    💃     — actors
    🧑‍🎨    — director
    🚚     — delivery trucks
    🛒     — props carts

  They move on random horizontal paths using:
    animation: pdLotWalk [speed]s linear [delay]s infinite

  @keyframes pdLotWalk {
    0%   { left: var(--walk-start); opacity: 0; }
    5%   { opacity: 0.7; }
    95%  { opacity: 0.7; }
    100% { left: var(--walk-end); opacity: 0; }
  }

  ASSETS REQUIRED: None (emoji + CSS animation)


  ────────────────────────────────────────────
  FULL COMPONENT BREAKDOWN
  ────────────────────────────────────────────

  StudioLot.jsx contains these sub-components:
  ┌──────────────────────┬───────────────────────────────────────┐
  │ Sub-component        │ What it renders                       │
  ├──────────────────────┼───────────────────────────────────────┤
  │ CRTBezel             │ Blue bezel frame + scanline overlays  │
  │ IsometricBuilding    │ SVG pixel building (per building)     │
  │ AmbientNPC           │ Wandering emoji character             │
  │ PalmTree             │ Decorative 🌴 positioned absolutely   │
  │ Glass                │ Frosted glass panel (reusable)        │
  │ Label                │ Section label (reusable)              │
  │ Pill                 │ Stat display (quality/hype/etc)       │
  └──────────────────────┴───────────────────────────────────────┘

  FILES REQUIRED:
    lib/pacific-dreams/lotData.js     — building definitions
    lib/pacific-dreams/lotEngine.js   — pure math functions
    components/pacific-dreams/StudioLot.jsx  — UI component


