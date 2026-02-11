// ─────────────────────────────────────────────────────────────
// memoryLedger.js — The Lionhead Engine (Backlot Mogul)
// "Track everything. Use it later."
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════
// ENTRY SHAPE
// ═══════════════════════════════════════════
//
// {
//   film: 2,                    // which film number
//   beat: 'talent',             // market | concept | money | talent | production | premiere | lot
//   tag: 'demand_denied',       // machine-readable tag (see TAG CATALOG below)
//   actor: 'The Auteur',        // who was involved (talent archetype or NPC name)
//   detail: 'final_cut',        // freeform specifics
//   meta: {},                   // any extra data (genre, title, amount, etc.)
//   sentiment: -2,              // how the NPC "feels" about it (-3 to +3)
//   turn: 14,                   // global turn counter (for ordering)
//   surfaced: false,            // has this been referenced in dialogue yet?
// }

// ═══════════════════════════════════════════
// TAG CATALOG — Every trackable event
// ═══════════════════════════════════════════

export const TAGS = {
  // Genre
  GENRE_PICKED:        'genre_picked',
  GENRE_REPEATED:      'genre_repeated',
  GENRE_COLD_PICK:     'genre_cold_pick',
  GENRE_COLD_SUCCESS:  'genre_cold_success',
  GENRE_COLD_FAIL:     'genre_cold_fail',
  GENRE_STREAK:        'genre_streak',

  // Concept
  PITCH_CHOSEN:        'pitch_chosen',
  CUSTOM_TITLE:        'custom_title',
  RATING_CHOSEN:       'rating_chosen',
  RATING_MISMATCH:     'rating_mismatch',

  // Budget
  BUDGET_TIER:         'budget_tier',
  BUDGET_BLUFFED:      'budget_bluffed',
  BUDGET_BLUFF_FAIL:   'budget_bluff_fail',
  BUDGET_DOWNGRADED:   'budget_downgraded',
  BUDGET_ALWAYS_INDIE: 'budget_always_indie',
  BUDGET_AUTO_APPROVED:'budget_auto_approved',

  // Talent
  TALENT_HIRED:        'talent_hired',
  TALENT_REHIRED:      'talent_rehired',
  DEMAND_ACCEPTED:     'demand_accepted',
  DEMAND_DENIED:       'demand_denied',
  TALENT_REFUSED:      'talent_refused',
  CHEAP_CAST:          'cheap_cast',
  ALL_STAR_CAST:       'all_star_cast',
  BROTHER_IN_LAW:      'brother_in_law',
  MOMS_FRIEND:         'moms_friend',

  // Production
  CRISIS_CHOICE:       'crisis_choice',
  CRISIS_QUALITY_BIAS: 'crisis_quality_bias',
  CRISIS_HYPE_BIAS:    'crisis_hype_bias',
  WALKOUT:             'walkout',
  WALKOUT_FORGIVEN:    'walkout_forgiven',
  WALKOUT_FIRED:       'walkout_fired',

  // Results
  FILM_VERDICT:        'film_verdict',
  FILM_FLOP:           'film_flop',
  FILM_BLOCKBUSTER:    'film_blockbuster',
  FILM_HIT:            'film_hit',
  STREAK_HOT:          'streak_hot',
  STREAK_COLD:         'streak_cold',

  // Lot / Park
  BUILDING_BOUGHT:     'building_bought',
  BUILDING_MAXED:      'building_maxed',
  RIDE_PLACED:         'ride_placed',
  RIDE_DEMOLISHED:     'ride_demolished',
  FIRST_BUILDING:      'first_building',
  LOT_FULL:            'lot_full',

  // Competitor
  NOVA_INTRODUCED:     'nova_introduced',
  NOVA_HIT:            'nova_hit',
  NOVA_FLOP:           'nova_flop',
  NOVA_COPIES_GENRE:   'nova_copies_genre',

  // Meta
  MUSE_UNLOCKED:       'muse_unlocked',
  PLAY_STYLE_DERIVED:  'play_style_derived',
};

// ═══════════════════════════════════════════
// LEDGER OPERATIONS
// ═══════════════════════════════════════════

let _turnCounter = 0;

export function createEntry(film, beat, tag, opts = {}) {
  _turnCounter++;
  return {
    film,
    beat,
    tag,
    actor:     opts.actor || null,
    detail:    opts.detail || null,
    meta:      opts.meta || {},
    sentiment: opts.sentiment || 0,
    turn:      _turnCounter,
    surfaced:  false,
  };
}

// Reset turn counter (for new game)
export function resetTurnCounter() { _turnCounter = 0; }

// ═══════════════════════════════════════════
// QUERY HELPERS — Find memories fast
// ═══════════════════════════════════════════

// Find all entries matching a tag
export function byTag(ledger, tag) {
  return ledger.filter(e => e.tag === tag);
}

// Find all entries involving a specific actor
export function byActor(ledger, actor) {
  return ledger.filter(e => e.actor === actor);
}

// Find all entries from a specific film
export function byFilm(ledger, film) {
  return ledger.filter(e => e.film === film);
}

// Find the most recent entry matching a tag
export function lastByTag(ledger, tag) {
  const matches = byTag(ledger, tag);
  return matches.length ? matches[matches.length - 1] : null;
}

// Find unsurfaced memories matching any of the given tags
export function unsurfaced(ledger, tags) {
  return ledger.filter(e => !e.surfaced && tags.includes(e.tag));
}

// Find the first unsurfaced memory matching any tag, mark it surfaced
export function surfaceOne(ledger, tags) {
  const match = ledger.find(e => !e.surfaced && tags.includes(e.tag));
  if (match) match.surfaced = true;
  return match || null;
}

// Count occurrences of a tag
export function countTag(ledger, tag) {
  return byTag(ledger, tag).length;
}

// Count how many times a specific actor was hired
export function timesHired(ledger, actor) {
  return ledger.filter(e => e.tag === TAGS.TALENT_HIRED && e.actor === actor).length;
}

// Check if a specific tag + actor combo exists
export function has(ledger, tag, actor) {
  return ledger.some(e => e.tag === tag && (!actor || e.actor === actor));
}

// Get the last film's verdict
export function lastVerdict(ledger) {
  const verdicts = byTag(ledger, TAGS.FILM_VERDICT);
  return verdicts.length ? verdicts[verdicts.length - 1] : null;
}

// Get streak of same verdict (consecutive hits or flops)
export function verdictStreak(ledger) {
  const verdicts = byTag(ledger, TAGS.FILM_VERDICT);
  if (!verdicts.length) return { type: null, count: 0 };
  const last = verdicts[verdicts.length - 1].detail;
  let count = 0;
  for (let i = verdicts.length - 1; i >= 0; i--) {
    if (verdicts[i].detail === last) count++;
    else break;
  }
  return { type: last, count };
}

// Get all genres the player has picked
export function genreHistory(ledger) {
  return byTag(ledger, TAGS.GENRE_PICKED).map(e => e.detail);
}

// Check if player has a genre streak (3+ same genre)
export function genreStreak(ledger) {
  const genres = genreHistory(ledger);
  if (genres.length < 3) return null;
  const last3 = genres.slice(-3);
  if (last3[0] === last3[1] && last3[1] === last3[2]) return last3[0];
  return null;
}

// Get the player's most-picked genre
export function favoriteGenre(ledger) {
  const genres = genreHistory(ledger);
  const counts = {};
  genres.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
  let best = null, bestCount = 0;
  Object.entries(counts).forEach(([g, c]) => { if (c > bestCount) { best = g; bestCount = c; } });
  return best;
}

// Check if the player's last budget attempt was a bluff that failed
export function wasLastBluffCaught(ledger) {
  return !!lastByTag(ledger, TAGS.BUDGET_BLUFF_FAIL);
}

// Count consecutive indie picks
export function indieStreak(ledger) {
  const budgets = byTag(ledger, TAGS.BUDGET_TIER);
  let count = 0;
  for (let i = budgets.length - 1; i >= 0; i--) {
    if (budgets[i].detail === 'indie') count++;
    else break;
  }
  return count;
}

// Get all ratings the player has chosen
export function ratingHistory(ledger) {
  return byTag(ledger, TAGS.RATING_CHOSEN).map(e => e.detail);
}

// Check if player always picks the same rating
export function alwaysRating(ledger, rating) {
  const ratings = ratingHistory(ledger);
  return ratings.length >= 2 && ratings.every(r => r === rating);
}

// Get the first building ever bought
export function firstBuilding(ledger) {
  return lastByTag(ledger, TAGS.FIRST_BUILDING);
}

// ═══════════════════════════════════════════
// DERIVED PLAY STYLE
// ═══════════════════════════════════════════

export function derivePlayStyle(ledger) {
  const coldPicks   = countTag(ledger, TAGS.GENRE_COLD_PICK);
  const bluffs      = countTag(ledger, TAGS.BUDGET_BLUFFED);
  const demandsOk   = countTag(ledger, TAGS.DEMAND_ACCEPTED);
  const demandsDen  = countTag(ledger, TAGS.DEMAND_DENIED);
  const rehires     = countTag(ledger, TAGS.TALENT_REHIRED);
  const blockbusters= countTag(ledger, TAGS.FILM_BLOCKBUSTER);
  const flops       = countTag(ledger, TAGS.FILM_FLOP);
  const indies      = byTag(ledger, TAGS.BUDGET_TIER).filter(e => e.detail === 'indie').length;
  const bbs         = byTag(ledger, TAGS.BUDGET_TIER).filter(e => e.detail === 'blockbuster').length;
  const cheapCasts  = countTag(ledger, TAGS.CHEAP_CAST);
  const allStars    = countTag(ledger, TAGS.ALL_STAR_CAST);

  // Score each archetype
  const scores = {
    auteur:    0,  // prioritizes quality + art
    mogul:     0,  // prioritizes money + scale
    populist:  0,  // prioritizes hype + audience
    gambler:   0,  // takes risks
    loyalist:  0,  // sticks with people
    shark:     0,  // squeezes every dollar
  };

  // Auteur signals
  scores.auteur += demandsOk * 2;            // respects artistic demands
  scores.auteur += indies * 1;               // works lean
  scores.auteur += coldPicks * 2;            // goes against market
  scores.auteur += cheapCasts * -1;          // prefers quality over cheapness

  // Mogul signals
  scores.mogul += bbs * 3;                   // big budgets
  scores.mogul += allStars * 2;              // star power
  scores.mogul += blockbusters * 2;          // successful blockbusters

  // Populist signals
  scores.populist += allStars * 1;
  scores.populist += countTag(ledger, TAGS.FILM_HIT) * 2;

  // Gambler signals
  scores.gambler += coldPicks * 3;
  scores.gambler += bluffs * 2;
  scores.gambler += bbs * 1;

  // Loyalist signals
  scores.loyalist += rehires * 3;
  scores.loyalist += demandsOk * 2;
  scores.loyalist += countTag(ledger, TAGS.MUSE_UNLOCKED) * 5;

  // Shark signals
  scores.shark += demandsDen * 3;
  scores.shark += cheapCasts * 2;
  scores.shark += indies * 1;
  scores.shark += countTag(ledger, TAGS.RIDE_DEMOLISHED) * 2;

  // Find highest
  let best = 'auteur', bestScore = -Infinity;
  Object.entries(scores).forEach(([style, score]) => {
    if (score > bestScore) { best = style; bestScore = score; }
  });

  return {
    style: best,
    scores,
    label: {
      auteur:   'The Auteur',
      mogul:    'The Mogul',
      populist: "The People's Champion",
      gambler:  'The Gambler',
      loyalist: 'The Loyalist',
      shark:    'The Shark',
    }[best],
    description: {
      auteur:   'You prioritized art over commerce. Quality over safety. Your films meant something.',
      mogul:    'You built an empire. Big budgets, big stars, big returns. Hollywood respects power.',
      populist: "You made movies for everyone. The audience loved you. That's worth more than awards.",
      gambler:  'You went against the grain every chance you got. Some bets paid off. Some didn\'t. All of them were interesting.',
      loyalist: 'You took care of your people. They took care of you. In this town, that\'s rare.',
      shark:    'You squeezed every dollar, denied every demand, and built a machine. Efficient. Ruthless. Profitable.',
    }[best],
  };
}
