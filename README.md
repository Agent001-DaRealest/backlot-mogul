# SE-100 LEAPS Terminal

A retro CRT-styled stock options dashboard widget built with React. Displays corporate repurchase/quiet/crush period tracking, implied volatility gauges, and earnings calendar data for a configurable watchlist.

## Features

- **Signal Light System** - Green indicator when all 3 conditions are met (cheap, low IV, favorable period)
- **52-Week Range Gauge** - Visual indicator showing price position within 52-week range
  - Green (fills top-down): Near 52W low (undervalued)
  - Red (fills bottom-up): Near 52W high (expensive)
  - Throbs when stock is significantly undervalued (<30% of range)
- **IV Bar** - 10-segment implied volatility gauge with color thresholds
  - Green: IV ≤25%
  - Amber: IV 26-35%
  - Red: IV >35%
- **Period Tracking** - Monitors repurchase windows and quiet periods
  - OPEN: Repurchase window is open
  - QUIET: Pre-earnings quiet period (21 days before)
  - CRUSH: Post-earnings IV crush window (5 days after)
- **IBM-style CRT Effects** - Clean, high-quality retro monitor aesthetic

## Signal Scoring

The signal light uses a point-based scoring system to identify LEAPS positioning conditions.

### Signal Colors
| Score | Signal | Meaning |
|-------|--------|---------|
| **3+** | 🟢 GREEN | Strong opportunity |
| **2** | 🟡 YELLOW | Moderate opportunity |
| **0-1** | ⚫ DIM | No signal |

### Scoring Components

| Component | Condition | Points |
|-----------|-----------|--------|
| **Price Score** | ≤10% above 52W low | +3 |
| | ≤20% above 52W low | +2 |
| | ≤50% above 52W low | +1 |
| | >50% above 52W low | 0 |
| **Near-High Penalty** | <20% below 52W high | -1 |
| **Crisis Bonus** | >8% drop in 7 trading days | +2 |
| **Period Bonus** | QUIET period | +1 |
| **Period Neutral** | CRUSH period | 0 |
| **Period Penalty** | BUYBACK (OPEN) period | -1 |

### Floor Rules (Guaranteed Minimum YELLOW)
| Floor | Condition |
|-------|-----------|
| Floor 1 | ≤10% above 52W low |
| Floor 3 | CRISIS mode (rapid drawdown) |

### Crisis Detection
Stocks dropping **>8% in 7 trading days** enter CRISIS mode:
- +2 bonus points
- Floor 3 guarantees minimum YELLOW
- Red pulsing glow visual indicator

## Tech Stack

- React (functional components, hooks)
- Inline CSS styling
- SF Mono / JetBrains Mono / Fira Code font stack

## Usage

The terminal displays your watchlist with real-time period calculations. Click the CONFIG button to edit:
- Stock symbols and prices
- 52-week high/low values
- Implied volatility percentages
- Earnings dates (last and next)
- Quarter end dates
- Special event dates

## Column Reference

| Column | Description |
|--------|-------------|
| Signal | Green when all conditions met |
| SYM | Stock ticker symbol |
| PRICE/52W | Current price with 52-week range gauge |
| IV | Implied volatility bar (0-50% scale) |
| DTQ/ER | Days to quarter end / Days to earnings |
| PERIOD | Current period status (OPEN/QUIET/CRUSH) |

## File Structure

```
components/
  set100-terminal.jsx   # Main terminal component
```

## Design Philosophy

Inspired by vintage IBM CRT monitors - clean phosphor glow, subtle scanlines, and crisp typography. The interface prioritizes information density while maintaining readability through careful use of color and brightness.
