# SP-1000 LEAPS Terminal — Signal Analysis Card Design Brief

## Context

You are redesigning the **Signal Analysis Card** for the SP-1000 LEAPS Terminal, a retro CRT-styled stock options dashboard built in React. This card is the most important detail view in the application — it's what users see when they click a stock ticker to understand *why* the system is flagging it. The terminal dashboard is the radar; the Signal Analysis card is the debrief.

---

## Product Mission

The SP-1000 monitors a curated 10-ticker watchlist for favorable LEAPS (Long-Term Equity Anticipation Securities) entry windows. It tracks corporate buyback periods, implied volatility, earnings proximity, and price position relative to 52-week ranges, then distills all of this into a single signal score per stock: **GREEN** (score 3+), **YELLOW** (score 2), or **DIM** (score 0-1).

The Signal Analysis card must answer one question clearly: **"Why is this stock signaling, and how strong is the case?"**

The target user is an informed options trader. They don't need hand-holding, but they do need transparency. Every score component should be visible, traceable, and independently verifiable.

---

## Design Philosophy

### The Metaphor: IBM Terminal Monitor, circa 1983

This is not retro kitsch. The terminal emulates a real piece of equipment — matte black anodized aluminum housing, stainless steel bezel trim, phosphor-green CRT display. Every design decision should feel like it belongs on hardware that cost $12,000 in 1983 and was built to run 24/7 on a trading desk.

### Core Principles

1. **Information density over decoration.** Every pixel earns its place. No ornamental borders, no gratuitous spacing, no elements that exist purely for aesthetic balance. If it's on screen, it communicates something.

2. **Color is semantic, never decorative.** Green means favorable. Amber means caution or neutral. Red means unfavorable. White is structural (labels, chrome). Dim gray is secondary. There are no accent colors, no gradients for visual interest, no color used "because it looks good."

3. **Phosphor glow as emphasis hierarchy.** Brightness and glow intensity communicate importance. A bright green with radiating text-shadow is shouting. A dim gray with no shadow is whispering. The card should use this gradient of luminance to guide the eye.

4. **Monospace is mandatory.** All text uses `'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace`. No proportional fonts. No serif. The monospace grid is structural — it aligns data vertically, creates implicit columns, and reinforces the terminal metaphor.

5. **Animations serve function.** The green/yellow sweep on signal rows, the crisis throb, the phosphor warm-up — these communicate state, not personality. Any animation in the Signal Analysis card should convey information (e.g., crisis urgency, signal strength) or provide interaction feedback (e.g., card entry/exit).

6. **Darkness is the canvas.** Background is `#080808` (near-black). The card lives in a `rgba(0,0,0,0.85)` backdrop. Content emerges from darkness through selective illumination. Think of a CRT in a dim room — the phosphor writes light onto black glass.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `green` | `#33ff66` | Bullish signal, favorable conditions, GREEN score |
| `amber` | `#ffcc00` | Caution, YELLOW score, crisis indicators, interactive elements |
| `red` | `#ff5555` | Bearish signal, penalties, unfavorable conditions |
| `blue` | `#00aaff` | Period indicators, date chrome, structural accents |
| `dim` | `#aaaaaa` | Secondary text, narrative body, labels |
| `dimmer` | `#555555` | Borders, separators, tertiary elements |
| `unlit` | `#222222` | Off-state gauge segments, disabled elements |
| `screen` | `#080808` | Card background, terminal background |
| White (`#fff` / `#eee`) | — | Primary labels, stock symbols, structural text |

### Glow Rules
- GREEN signal: border `#33ff66`, box-shadow `rgba(51,255,102,0.4)` with 20px + 60px spread
- YELLOW signal: border `#ffcc00`, box-shadow `rgba(255,204,0,0.4)` with same spread
- DIM signal: border `rgba(255,255,255,0.5)`, box-shadow `rgba(255,255,255,0.15)` — barely visible

The card's border and outer glow should match the signal color. The user should be able to tell GREEN/YELLOW/DIM from the card's silhouette alone, before reading a single word.

---

## Typography Scale

All text is monospace. The hierarchy is built through size, weight, letter-spacing, color, and glow — never through font changes.

| Role | Size | Weight | Spacing | Color | Glow |
|------|------|--------|---------|-------|------|
| Stock symbol | 18px | 600 | 2px | `#fff` | subtle white |
| Signal label (GREEN/YELLOW/DIM) | 14px | 600 | 2px | signal color | medium |
| Section subtitle | 13px | 400 | — | `#aaaaaa` | none |
| Narrative body | 13px | 400 | — | `#aaaaaa` | none |
| Inline data values | 13px | 600 | — | contextual color | none |
| Score component labels | 13px | 400 | — | `#aaaaaa` | none |
| Score component values | 13px | 600 | — | green (+) / red (-) | none |
| Crisis badge | 8px | 600 | 2px | `#ffcc00` | amber glow |
| Action button | 11px | 500 | 3px | `#fff` | subtle white |

---

## Signal Scoring System

The card must make this scoring transparent:

### Components
| Factor | Condition | Points |
|--------|-----------|--------|
| **PRICE** | ≤10% above 52-week low | +3 |
| | ≤20% above 52-week low | +2 |
| | ≤50% above 52-week low | +1 |
| **HIGH** (penalty) | <20% below 52-week high | -1 |
| **CRISIS** (bonus) | >8% drop in 7 trading days | +2 |
| **PERIOD** | QUIET (pre-earnings) | +1 |
| | CRUSH (post-earnings) | 0 |
| | OPEN (buyback window) | -1 |

### Floor Rules
- **Floor 1:** If ≤10% above 52-week low → guarantee minimum YELLOW (score ≥2)
- **Floor 3:** If CRISIS mode active → guarantee minimum YELLOW (score ≥2)

### Signal Output
- Score ≥ 3 → **GREEN** (strong buy window)
- Score = 2 → **YELLOW** (watchlist, Tier 1 stocks only)
- Score 0-1 → **DIM** (no signal)

### Tier System
- **Tier 1:** Quality mega-caps (AAPL, GOOGL, MSFT, etc.) — eligible for GREEN and YELLOW signals
- **Tier 2:** Conviction plays (smaller/higher-risk) — eligible for GREEN only; YELLOW is suppressed to DIM

---

## Current Card Structure

The existing card has these sections top-to-bottom:

1. **Header bar** — Stock symbol + "SIGNAL ANALYSIS" subtitle (left), signal label GREEN/YELLOW/DIM (right), separated by a horizontal rule in the signal color
2. **Narrative analysis** — Prose paragraph explaining the stock's current position: price vs 52-week range, distance from highs/lows, crisis status, current period, with inline colored data values and external verification links (Yahoo Finance, SEC filings)
3. **Score calculation box** — Bordered section showing the arithmetic: `PRICE(+2) + HIGH(0) + CRISIS(0) + PERIOD(+1) = 3 → GREEN`. If crisis mode is active, an amber "CRISIS MODE ACTIVE" badge with pulsing dot appears above the calculation, and the box has a slow amber throb overlay animation
4. **Dismiss button** — Centered pill button to close the card

---

## What Needs Improvement

The current card is functional but feels like a first draft. Consider:

- **Visual hierarchy is flat.** The narrative block and score box compete for attention equally. The score (the most important datum) doesn't dominate.
- **The narrative is a wall of text.** Inline colored values help, but the paragraph format doesn't leverage the monospace grid. Data that could be scannable is buried in prose.
- **No visual representation of the 52-week range.** The dashboard has gauges; the analysis card just has numbers. The card should show *where* the price sits in its range — visually.
- **Crisis mode could be more dramatic.** The throb animation is subtle. Crisis is the terminal's highest-urgency state and should feel like it.
- **The score box is cramped.** Four components on one line with `+` separators. Hard to parse. Each component deserves its own visual weight.
- **No verification affordance.** The narrative mentions Yahoo Finance links but they're easy to miss. Verification is core to the product's trust model.
- **The card doesn't breathe.** It's dense everywhere equally. Strategic whitespace and section breaks would help the eye rest and reset.

---

## Design Constraints

- **All styling is inline CSS.** No external stylesheets, no CSS-in-JS libraries, no Tailwind. Every style is a JavaScript object.
- **No images or icons.** Everything is built from text, borders, box-shadows, and CSS. Unicode characters (█, ●, ◆, ▸) are acceptable as decorative elements.
- **Responsive:** Must work at 580px max-width (desktop) and scale down to ~320px (mobile). Use percentage widths and relative units where possible.
- **Animation via CSS @keyframes** injected in a `<style>` tag. Keep animations performant (transform, opacity only where possible).
- **The card renders inside a fixed-position backdrop** (`position: fixed`, full viewport, `z-index: 2000`). The card itself is centered with flexbox.
- **React functional component** using hooks. No class components, no external state management.

---

## Data Available to the Card

The card receives these props:

```
stock: {
  sym: string          // Ticker symbol (e.g., "AAPL")
  tier: 1 | 2          // Quality tier
  price: number        // Current price
  iv: number           // Implied volatility %
  w52h: number         // 52-week high
  w52l: number         // 52-week low
  lastEarn: string     // Last earnings date (YYYY-MM-DD)
  nextEarn: string     // Next earnings date (YYYY-MM-DD)
  qtrEnd: string       // Quarter end date
  event: string        // Event name (e.g., "WWDC")
  eventDate: string    // Event date
}

sig: {
  score: number        // Final signal score (after floors)
  rawScore: number     // Score before floor rules
  color: string        // Signal color hex
  pctAboveLow: number  // % above 52-week low
  pctBelowHigh: number // % below 52-week high
  priceScore: number   // Price component (+0 to +3)
  nearHighPenalty: number // High penalty (0 or -1)
  crisisBonus: number  // Crisis bonus (0 or +2)
  periodBonus: number  // Period bonus (-1, 0, or +1)
  isNearLow: boolean   // Within 10% of 52-week low
  isCrisis: boolean    // Crisis mode active
  floor1: boolean      // Floor 1 applied
  floor3: boolean      // Floor 3 applied
}

periodInfo: {
  period: string       // "OPEN" | "QUIET" | "CRUSH"
  days: number         // Days remaining in current period
  label: string        // Display label
}

drawdown: {
  mode: string         // "NORMAL" | "CRISIS"
  pctDrop: number      // Percentage drop (if crisis)
  tradingDays: number  // Days over which drop occurred
}
```

---

## Deliverable

Design an optimized Signal Analysis card that:

1. Makes the signal verdict (GREEN/YELLOW/DIM) the dominant visual element — unmistakable at a glance
2. Presents the score decomposition as a structured, scannable breakdown — not a paragraph
3. Includes a visual 52-week range indicator showing current price position
4. Elevates crisis mode to a visually urgent state
5. Makes verification links (Yahoo Finance, SEC) prominent and accessible
6. Uses the phosphor-glow hierarchy to guide attention from most to least important
7. Respects the CRT terminal aesthetic — dark canvas, semantic color, monospace grid, glow-as-emphasis
8. Fits within the inline-CSS, React component, responsive constraints listed above

The card should feel like pulling up a detailed readout on a piece of military-grade equipment — precise, authoritative, and unmistakably purposeful.
