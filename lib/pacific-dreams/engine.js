// Pacific Dreams — Game Engine
// Pure math functions adapted from SimCinema-TS
// No React, no state — just calculations

import {
  CREW_TIERS, RATING_MODIFIERS, GENRE_CREW_MULTIPLIERS,
  REVIEWERS, CRISIS_CARDS, TITLE_WORDS,
  MAX_QUALITY, CRISIS_CARDS_PER_MOVIE, BOX_OFFICE_WEEKS,
  WEEKLY_REVENUE_PER_THEATER, GENRE_REPEAT_PENALTY,
} from './data';

// ═══════════════════════════════════════════
// QUALITY CALCULATION
// ═══════════════════════════════════════════

/**
 * Calculate total crew quality for a given genre and crew selection.
 * Adapted from SimCinema's per-character quality matrix.
 * @param {string} genre - Genre id
 * @param {{ director: string, lead: string, support: string }} crew - Tier names per role
 * @returns {number} Total quality score
 */
export function calculateCrewQuality(genre, crew) {
  let total = 0;
  const multipliers = GENRE_CREW_MULTIPLIERS[genre] || { director: 1, lead: 1, support: 1 };

  for (const role of ['director', 'lead', 'support']) {
    const tierName = crew[role];
    if (!tierName) continue;
    const tier = CREW_TIERS[role]?.[tierName];
    if (!tier) continue;
    total += Math.round(tier.base * (multipliers[role] || 1));
  }

  return total;
}

/**
 * Apply rating modifier to quality.
 * From SimCinema's ratingData matrix.
 */
export function applyRatingModifier(quality, rating, genre) {
  const mods = RATING_MODIFIERS[rating];
  if (!mods) return quality;
  return quality + (mods[genre] || 0);
}

/**
 * Check if the same genre was used in the last 3 films.
 * From SimCinema's genreRepeatCheck.
 * @returns {number} Penalty to apply (0 or GENRE_REPEAT_PENALTY)
 */
export function checkGenreRepeat(history, genre) {
  const recent = history.slice(-3);
  if (recent.some(m => m.genre === genre)) return GENRE_REPEAT_PENALTY;
  return 0;
}

/**
 * Calculate the full initial quality for a movie.
 */
export function calculateTotalQuality(genre, crew, rating, history) {
  let q = calculateCrewQuality(genre, crew);
  q = applyRatingModifier(q, rating, genre);
  q += checkGenreRepeat(history, genre);

  // Masterpiece bonus (from SimCinema: if quality > 410 and lucky)
  if (q > 200 && Math.random() > 0.85) {
    q += 40; // Scaled down from SimCinema's +100 since our max is lower
  }

  return Math.max(0, q);
}

// ═══════════════════════════════════════════
// CRISIS CARDS
// ═══════════════════════════════════════════

/**
 * Draw N unique crisis cards from the pool.
 * @param {number} count - Number of cards to draw
 * @returns {Array} Shuffled subset of crisis cards
 */
export function drawCrisisCards(count = CRISIS_CARDS_PER_MOVIE) {
  const shuffled = [...CRISIS_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ═══════════════════════════════════════════
// HYPE SYSTEM
// ═══════════════════════════════════════════

/**
 * Calculate initial hype from quality.
 * From SimCinema: hype = quality / 10
 */
export function calcInitialHype(quality) {
  return Math.round(quality / 10);
}

// ═══════════════════════════════════════════
// REVIEW GENERATION
// ═══════════════════════════════════════════

/**
 * Generate reviews from 5 critics with individual bias skews.
 * Adapted directly from SimCinema's generateReviews().
 * @param {number} quality - Final quality score
 * @returns {{ scores: Array<{name, score, tone}>, averageScore: number }}
 */
export function generateReviews(quality) {
  const randomSeed = Math.random();

  const scores = REVIEWERS.map(reviewer => {
    const skew = randomSeed * reviewer.skew;
    const rawScore = (quality / MAX_QUALITY + skew) * 10;
    const score = Math.min(10, Math.max(1, Math.floor(rawScore)));
    return { name: reviewer.name, score, tone: reviewer.tone };
  });

  const averageScore = Math.round(
    (scores.reduce((sum, r) => sum + r.score, 0) / scores.length) * 10
  ) / 10;

  return { scores, averageScore };
}

// ═══════════════════════════════════════════
// BOX OFFICE SIMULATION
// ═══════════════════════════════════════════

/**
 * Simulate box office run over N weeks.
 * Adapted from SimCinema's theater decay model.
 * @param {number} quality - Final quality score
 * @param {number} hype - Final hype level
 * @param {number} budgetM - Budget in millions
 * @returns {{ totalEarnings: number, peakTheaters: number, weeklyBreakdown: number[] }}
 */
export function simulateBoxOffice(quality, hype, budgetM) {
  // Initial theater count (from SimCinema)
  const initialTheaters = hype * 15 + quality * 10;
  let theaters = initialTheaters;
  let totalEarnings = 0;
  let totalFalloff = 0;
  const weeklyBreakdown = [];

  for (let week = 0; week < BOX_OFFICE_WEEKS; week++) {
    if (theaters <= 0) {
      weeklyBreakdown.push(0);
      continue;
    }

    const weekRevenue = theaters * WEEKLY_REVENUE_PER_THEATER;
    totalEarnings += weekRevenue;
    weeklyBreakdown.push(weekRevenue);

    // Theater falloff (adapted from SimCinema)
    // Higher quality = slower decay, higher hype = slower decay
    const qualityFactor = Math.min(quality, 348);
    const falloffPerWeek = 353 - clamp(qualityFactor, 300, 348) - hype * 0.28;
    totalFalloff += clamp(falloffPerWeek, 0, 10000);
    theaters = Math.max(0, initialTheaters - Math.floor(totalFalloff));
  }

  return {
    totalEarnings: Math.round(totalEarnings),
    peakTheaters: initialTheaters,
    weeklyBreakdown,
  };
}

// ═══════════════════════════════════════════
// VERDICT
// ═══════════════════════════════════════════

/**
 * Determine the movie verdict.
 * Extended from SimCinema's gradeMovie (3 verdicts -> 5).
 */
export function getVerdict(earnings, budgetM, averageScore) {
  const budgetFull = budgetM * 1_000_000;
  if (earnings > budgetFull * 2.5) return 'BLOCKBUSTER';
  if (earnings > budgetFull * 1.5) return 'HIT';
  if (earnings > budgetFull) return 'MODEST HIT';
  if (averageScore >= 7 && earnings < budgetFull) return 'CULT CLASSIC';
  return 'FLOP';
}

// ═══════════════════════════════════════════
// REPUTATION
// ═══════════════════════════════════════════

/**
 * Calculate reputation change from a single film.
 * From SimCinema's reputationCalc.
 * @returns {number} -3 to +3
 */
export function calcReputation(budgetM, earnings) {
  const budgetFull = budgetM * 1_000_000;
  if (earnings / 2 > budgetFull) return 3;
  if (earnings > budgetFull) return 2;
  if (budgetFull > earnings && earnings > budgetFull / 2) return -2;
  if (budgetFull / 2 > earnings) return -3;
  return 0;
}

/**
 * Get reputation string from total reputation.
 * From SimCinema's reputationString.
 */
export function getReputationLabel(reputation, historyLength) {
  if (historyLength < 3) return 'NEW KID ON THE BLOCK';
  if (reputation > 10) return 'LEGENDARY STUDIO';
  if (reputation > 5) return 'RISING STAR';
  if (reputation >= 0) return 'STEADY HAND';
  if (reputation > -5) return 'ON THIN ICE';
  return 'LAUGHINGSTOCK';
}

// ═══════════════════════════════════════════
// TITLE GENERATOR
// ═══════════════════════════════════════════

/**
 * Generate a procedural movie title from genre word pools.
 */
export function generateTitle(genre) {
  const pool = TITLE_WORDS[genre];
  if (!pool) return 'Untitled Project';
  const adj = pool.adjectives[Math.floor(Math.random() * pool.adjectives.length)];
  const noun = pool.nouns[Math.floor(Math.random() * pool.nouns.length)];

  // Occasionally use "The Adjective Noun" format
  if (Math.random() > 0.6) {
    return `The ${adj} ${noun}`;
  }
  return `${adj} ${noun}`;
}

// ═══════════════════════════════════════════
// MONEY FORMATTING
// ═══════════════════════════════════════════

export function formatMoney(amount) {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

/**
 * Calculate total crew cost in millions.
 */
export function calculateCrewCost(crew) {
  let total = 0;
  for (const role of ['director', 'lead', 'support']) {
    const tierName = crew[role];
    if (!tierName) continue;
    const tier = CREW_TIERS[role]?.[tierName];
    if (tier) total += tier.cost;
  }
  return total;
}

// ═══════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
