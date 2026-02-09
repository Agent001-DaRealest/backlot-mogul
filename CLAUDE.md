# CLAUDE.md

## Project Overview

**SP-1000 LEAPS Terminal** — A retro CRT-styled stock options dashboard widget built with React. Displays corporate repurchase/quiet/crush period tracking, implied volatility gauges, and earnings calendar data for a configurable watchlist. Features a two-tier stock list (quality mega-caps vs conviction plays) with click-to-explain signal analysis.

## Tech Stack

- **React** (JSX, functional components, hooks)
- **Inline CSS** — all styling is done via inline style objects, no external CSS files or CSS-in-JS libraries
- **Monospace aesthetic** — Monaco/Menlo/Courier New font stack throughout

## Architecture

Single-component file (`set100-terminal.jsx`) containing:

- **`Terminal`** — root component, manages state (stocks, today date, flip)
- **`FrontFace`** — main dashboard view with stock table, gauges, period indicators
- **`BackFace`** — configuration panel for editing stock data and date
- **`GaugeVertical`** — 10-segment vertical bar showing 52-week price position
- **`IVBar`** — 10-segment horizontal bar showing implied volatility
- **`PeriodDot`** — colored status LED indicator
- **`Clock`** — real-time HH:MM:SS clock

Key utility functions:
- `daysBetween(a, b)` — date difference in days
- `calcPeriod(today, stock)` — determines BUYBACK/QUIET/CRUSH period and countdown
- `calcGauge(price, w52h, w52l)` — maps price to 52-week range gauge
- `ivColor(iv)` — green/amber/red threshold for implied volatility
- `detectDrawdownMode(stock)` — detects rapid selloffs (>8% in 7 trading days) for CRISIS mode
- `calcSignalData(...)` — computes signal score with bonuses, penalties, and floor rules

## Domain Concepts

- **OPEN** period (green): corporate repurchase window is open, days until quarter end
- **QUIET** period (red): company is in quiet period before earnings, days until next earnings
- **CRUSH** period (cyan): post-earnings or post-event IV crush window (5 days after event)
- **IV (Implied Volatility)**: shown as percentage with color thresholds (≤25 green, ≤35 amber, >35 red)
- **DTQ/ER**: Days To Quarter-end / Days To Earnings Report
- **CRISIS** mode: rapid drawdown detection (>8% drop in 7 trading days) triggers +2 bonus and Floor 3

## Signal Scoring Reference

**Score → Signal**: 3+ = GREEN, 2 = YELLOW, 0-1 = DIM

| Component | Condition | Points |
|-----------|-----------|--------|
| Price Score | ≤10% above 52W low | +3 |
| | ≤20% above 52W low | +2 |
| | ≤50% above 52W low | +1 |
| Near-High Penalty | <20% below 52W high | -1 |
| Crisis Bonus | >8% drop in 7 trading days | +2 |
| Period Bonus | QUIET | +1 |
| Period Neutral | CRUSH | 0 |
| Period Penalty | BUYBACK (OPEN) | -1 |

**Floor Rules** (guarantee minimum YELLOW):
- Floor 1: ≤10% above 52W low
- Floor 3: CRISIS mode

## Code Style & Conventions

- Use consistent formatting (prefer Prettier or equivalent auto-formatter)
- Prefer named exports over default exports (note: `Terminal` currently uses default export)
- Use descriptive variable and function names; avoid abbreviations
- Keep functions small and focused on a single responsibility
- Favor composition over inheritance
- Colors and fonts are defined as top-level constants (`COLORS`, `MONO`)
- Inline styles use spread patterns for shared base styles (e.g., `cellBase`)

## Testing

- Write tests for new features and bug fixes
- Place test files adjacent to source files or in a `__tests__`/`tests` directory
- Use descriptive test names that explain the expected behavior

## Git Conventions

- Write concise commit messages in imperative mood (e.g., "Add user login endpoint")
- Keep commits focused on a single change

## Project-Specific Notes

- Stock data is hardcoded in `DEFAULT_STOCKS`; all dates and prices are editable via the config panel
- The "today" date defaults to `2026-02-04` and drives all period calculations
- The flip animation uses CSS 3D transforms with `perspective` and `backface-visibility`
- No build tooling or package.json is set up yet — this is a standalone JSX component
