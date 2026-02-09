# SP-1000 LEAPS Signal Scoring System — Backtesting Reference

## Purpose

This document specifies the exact scoring logic used by the SP-1000 LEAPS Terminal for generating signals on long-dated equity options (LEAPS). The system identifies favorable conditions for mega-cap and high-conviction names by combining price position, drawdown velocity, and corporate calendar state into a single composite score.

## Signal Output

| Score | Signal | Meaning |
|-------|--------|---------|
| 3+    | GREEN  | Active signal |
| 2     | YELLOW | Watchlist / approaching entry |
| 0-1   | DIM    | No signal |

## Inputs

Each stock requires:

| Field | Type | Description |
|-------|------|-------------|
| `price` | float | Current price |
| `w52h` | float | 52-week high |
| `w52l` | float | 52-week low |
| `period` | enum | Corporate calendar period: `OPEN`, `QUIET`, or `CRUSH` (derived from dates below) |
| `drawdownMode` | enum | `CRISIS` or `NORMAL` (derived from `priceHistory`) |
| `priceHistory` | array | Recent daily closes, up to 7 trading days `[{price: float}, ...]`, oldest first |
| `lastEarn` | date | Last earnings report date |
| `nextEarn` | date | Next earnings report date |
| `qtrEnd` | date | Fiscal quarter end date |
| `eventDate` | date | (optional) Catalyst event date |

## Derived Values

### Percentage Above 52W Low
```
pctAboveLow = ((price - w52l) / w52l) * 100
```

### Percentage Below 52W High
```
pctBelowHigh = ((w52h - price) / w52h) * 100
```

### Drawdown Detection
```
pctChange = ((latestPrice - oldestPrice) / oldestPrice) * 100
CRISIS if pctChange <= -8 AND days <= 7
Otherwise NORMAL
```
Uses `priceHistory` array (oldest to newest, up to 8 entries).

### Period Determination (evaluated in order, first match wins)

1. **CRUSH** — within 5 days after `eventDate` or `lastEarn`
2. **QUIET** — quarter has ended (`daysToQtr <= 0`) and next earnings is in the future, OR next earnings is within 21 days
3. **OPEN** — all other times (repurchase window is open)

## Scoring Components

### 1. Price Score (0-3 points)

Based on `pctAboveLow`. Mutually exclusive tiers:

| Condition | Points |
|-----------|--------|
| pctAboveLow <= 10% | +3 |
| pctAboveLow <= 20% | +2 |
| pctAboveLow <= 50% | +1 |
| pctAboveLow > 50% | 0 |

### 2. Near-High Penalty (0 or -1)

| Condition | Points |
|-----------|--------|
| pctBelowHigh < 20% | -1 |
| pctBelowHigh >= 20% | 0 |

### 3. Crisis Bonus (0 or +2)

| Condition | Points |
|-----------|--------|
| drawdownMode = CRISIS | +2 |
| drawdownMode = NORMAL | 0 |

### 4. Period Bonus (-1, 0, or +1)

| Period | Points | Rationale |
|--------|--------|-----------|
| QUIET | +1 | Pre-earnings uncertainty depresses price, historically favorable positioning |
| CRUSH | 0 | Post-earnings IV crush, neutral |
| OPEN | -1 | Repurchase window active, corporate price support reduces downside probability |

## Raw Score

```
rawScore = priceScore + nearHighPenalty + crisisBonus + periodBonus
```

Note: IV is intentionally excluded from scoring (was found to add noise, not signal).

## Floor Rules

Floor rules guarantee a minimum score of 2 (YELLOW) when certain conditions are met, regardless of the raw calculation:

| Floor | Condition | Effect |
|-------|-----------|--------|
| Floor 1 | pctAboveLow <= 10% | min score = 2 |
| Floor 3 | drawdownMode = CRISIS | min score = 2 |

```
finalScore = hasFloor ? max(rawScore, 2) : rawScore
```

Floor 2 was removed (was IV-dependent).

## Backtesting Implementation

```python
def calc_signal(price, w52h, w52l, period, drawdown_mode):
    pct_above_low = ((price - w52l) / w52l) * 100 if w52l > 0 else 999
    pct_below_high = ((w52h - price) / w52h) * 100 if w52h > 0 else 999

    # Price score
    if pct_above_low <= 10:
        price_score = 3
    elif pct_above_low <= 20:
        price_score = 2
    elif pct_above_low <= 50:
        price_score = 1
    else:
        price_score = 0

    # Near-high penalty
    near_high_penalty = -1 if pct_below_high < 20 else 0

    # Crisis bonus
    crisis_bonus = 2 if drawdown_mode == "CRISIS" else 0

    # Period bonus
    if period == "QUIET":
        period_bonus = 1
    elif period == "OPEN":
        period_bonus = -1
    else:  # CRUSH
        period_bonus = 0

    raw_score = price_score + near_high_penalty + crisis_bonus + period_bonus

    # Floor rules
    floor_1 = pct_above_low <= 10
    floor_3 = drawdown_mode == "CRISIS"
    has_floor = floor_1 or floor_3

    final_score = max(raw_score, 2) if has_floor else raw_score

    signal = "GREEN" if final_score >= 3 else ("YELLOW" if final_score == 2 else "DIM")

    return {
        "score": final_score,
        "raw_score": raw_score,
        "signal": signal,
        "price_score": price_score,
        "near_high_penalty": near_high_penalty,
        "crisis_bonus": crisis_bonus,
        "period_bonus": period_bonus,
        "pct_above_low": pct_above_low,
        "pct_below_high": pct_below_high,
        "floor_applied": has_floor and raw_score < 2,
    }


def detect_crisis(price_history):
    """price_history: list of daily closes, oldest first, up to 8 entries (7 trading days)"""
    if len(price_history) < 2:
        return "NORMAL"
    pct_change = ((price_history[-1] - price_history[0]) / price_history[0]) * 100
    return "CRISIS" if pct_change <= -8 and len(price_history) - 1 <= 7 else "NORMAL"


def calc_period(today, last_earn, next_earn, qtr_end, event_date=None):
    """All dates as date objects. Returns period string."""
    if event_date:
        days_since_event = (today - event_date).days
        if 0 <= days_since_event <= 5:
            return "CRUSH"

    days_since_last = (today - last_earn).days
    if 0 <= days_since_last <= 5:
        return "CRUSH"

    days_to_next = (next_earn - today).days
    days_to_qtr = (qtr_end - today).days

    if days_to_qtr <= 0 and days_to_next > 0:
        return "QUIET"
    if 0 <= days_to_next <= 21:
        return "QUIET"

    return "OPEN"
```

## Watchlist Tiers

The terminal tracks two tiers with different usage:

- **Tier 1 (indices 0-6):** Quality mega-caps — always-hold positions. All signals acted on.
- **Tier 2 (indices 7-10):** Conviction plays — only GREEN signals acted on (YELLOW ignored).

Current symbols: AAPL, AMZN, DIS, GOOGL, META, MSFT, NFLX | CMCSA, PEGA, TTWO

## Backtesting Notes

- The system is designed for LEAPS (long-dated options, typically 1-2 year expiry). Entry timing matters more than short-term price action.
- GREEN signals are rare by design. The system favors precision over recall — it's better to miss an entry than to enter at a poor price.
- Crisis detection requires intraday/daily price history data. If unavailable for historical periods, backtest with `NORMAL` mode and note that CRISIS bonuses cannot be evaluated.
- Period determination requires corporate calendar data (earnings dates, quarter ends). These are available from earnings calendar APIs historically.
- The near-high penalty and price score can interact: a stock 15% above its low but only 10% below its high would get `priceScore=2, nearHighPenalty=-1` for a net of 1 from those two components. This captures compressed ranges where neither end presents a statistically favorable position.
- IV was deliberately removed from scoring after testing showed it added noise. It remains displayed in the terminal for informational context but does not influence the signal.
