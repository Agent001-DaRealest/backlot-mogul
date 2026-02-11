// ─────────────────────────────────────────────────────────────
// talentRelations.js — "They remember everything you did." (Backlot Mogul)
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════
// RELATIONSHIP SHAPE
// ═══════════════════════════════════════════
//
// {
//   loyalty: 0,         // positive feelings toward player (0+)
//   grudge: 0,          // negative feelings toward player (0+)
//   timesHired: 0,      // total times cast
//   lastFilm: null,     // last film number they worked on
//   demandHistory: [],   // array of { film, accepted: bool }
//   isMuse: false,       // permanent bonus unlocked
//   isUpgraded: false,   // permanent tier upgrade (Brother-in-Law)
//   isBlacklisted: false, // will NEVER work with player again
// }

// ═══════════════════════════════════════════
// ALL 18 ARCHETYPES
// ═══════════════════════════════════════════

const ALL_ARCHETYPES = [
  'The Auteur', 'The Blockbuster King', 'The Festival Darling',
  'The Journeyman', 'The Wunderkind', 'Your Brother-in-Law',
  'The Movie Star', 'The Method Actor', 'The It Girl',
  'The Action Hunk', 'The Theater Kid', 'The Influencer',
  'The Scene Stealer', 'The Character Actor', 'The Comedian',
  'The Nepo Baby', 'The Local Hire', "Your Mom's Friend",
];

export function createRelations() {
  const relations = {};
  ALL_ARCHETYPES.forEach(name => {
    relations[name] = {
      loyalty: 0,
      grudge: 0,
      timesHired: 0,
      lastFilm: null,
      demandHistory: [],
      isMuse: false,
      isUpgraded: false,
      isBlacklisted: false,
    };
  });
  return relations;
}

// ═══════════════════════════════════════════
// RELATIONSHIP UPDATES
// ═══════════════════════════════════════════

/**
 * Record that talent was hired for a film.
 */
export function recordHire(relations, archetype, film) {
  const r = relations[archetype];
  if (!r) return relations;

  r.timesHired += 1;
  r.lastFilm = film;
  r.loyalty += 1;

  // Check muse status: 3+ hires
  if (r.timesHired >= 3 && !r.isMuse) {
    r.isMuse = true;
  }

  return { ...relations };
}

/**
 * Record demand was accepted.
 */
export function recordDemandAccepted(relations, archetype, film) {
  const r = relations[archetype];
  if (!r) return relations;

  r.demandHistory.push({ film, accepted: true });
  r.loyalty += 2;
  // Accepting a demand can reduce grudge
  if (r.grudge > 0) r.grudge = Math.max(0, r.grudge - 1);

  return { ...relations };
}

/**
 * Record demand was denied.
 */
export function recordDemandDenied(relations, archetype, film) {
  const r = relations[archetype];
  if (!r) return relations;

  r.demandHistory.push({ film, accepted: false });
  r.grudge += 1;

  return { ...relations };
}

/**
 * Record film result for talent who was in it.
 */
export function recordFilmResult(relations, archetype, verdict) {
  const r = relations[archetype];
  if (!r) return relations;

  if (verdict === 'blockbuster' || verdict === 'hit') {
    r.loyalty += 1;
    // Brother-in-Law gets upgraded on blockbuster
    if (archetype === 'Your Brother-in-Law' && verdict === 'blockbuster' && !r.isUpgraded) {
      r.isUpgraded = true;
    }
  } else if (verdict === 'flop') {
    r.loyalty = Math.max(0, r.loyalty - 1);
    // If A-lister and flop, they might blame you
    if (r.grudge > 0) r.grudge += 1;
  }

  return { ...relations };
}

/**
 * Record that talent was passed over (available but not hired).
 * Small grudge bump for A-listers.
 */
export function recordPassedOver(relations, archetype) {
  const r = relations[archetype];
  if (!r) return relations;

  // Only A-listers care about being passed over
  if (r.timesHired > 0 && r.loyalty > 0) {
    // They expected to be rehired
    r.grudge += 1;
  }

  return { ...relations };
}

/**
 * Record a walkout (fired from set). Permanent damage.
 */
export function recordWalkoutFired(relations, archetype) {
  const r = relations[archetype];
  if (!r) return relations;

  r.isBlacklisted = true;
  r.grudge = 99;
  r.loyalty = 0;

  return { ...relations };
}

/**
 * Record walkout forgiven (gave them what they wanted).
 */
export function recordWalkoutForgiven(relations, archetype) {
  const r = relations[archetype];
  if (!r) return relations;

  r.grudge = Math.max(0, r.grudge - 2);
  r.loyalty += 1;

  return { ...relations };
}

/**
 * Time decay — call between films. Grudges fade slowly.
 */
export function decayGrudges(relations) {
  const next = { ...relations };
  Object.keys(next).forEach(name => {
    const r = next[name];
    if (r.grudge > 0 && !r.isBlacklisted) {
      r.grudge = Math.max(0, r.grudge - 1);
    }
  });
  return next;
}

// ═══════════════════════════════════════════
// CONSEQUENCE CHECKS
// ═══════════════════════════════════════════

/**
 * Check if talent will refuse to work with player.
 * Returns { refused: bool, reason: string }
 */
export function checkRefusal(relations, archetype, playerRep, talent) {
  const r = relations[archetype];
  if (!r) return { refused: false };

  // Blacklisted = permanent refusal
  if (r.isBlacklisted) {
    return {
      refused: true,
      reason: 'blacklisted',
      line: `${archetype} will never work with you again. That bridge is vaporized.`,
    };
  }

  // Grudge-based refusal (grudge >= 3 overrides rep)
  if (r.grudge >= 3) {
    return {
      refused: true,
      reason: 'grudge',
      line: `${archetype} passed. "Creative differences." They haven't forgotten.`,
    };
  }

  // Rep-based refusal (A-listers won't work with low-rep studios)
  if (talent && talent.tier === 'a' && playerRep < (talent.refuseBelow || 3)) {
    return {
      refused: true,
      reason: 'rep_low',
      line: `${archetype}'s people said we're "not at the right level yet."`,
    };
  }

  return { refused: false };
}

/**
 * Check if a walkout crisis should trigger during production.
 * Walkout triggers if:
 *   - Talent has grudge >= 2
 *   - Talent had demand denied in a previous film
 *   - Talent is currently hired
 */
export function checkWalkout(relations, archetype) {
  const r = relations[archetype];
  if (!r) return null;

  const denials = r.demandHistory.filter(d => !d.accepted);
  if (denials.length >= 2 && r.grudge >= 2) {
    return {
      trigger: true,
      archetype,
      severity: r.grudge >= 4 ? 'extreme' : 'serious',
      denialCount: denials.length,
    };
  }

  return null;
}

/**
 * Get the current "status" of a talent relationship for display.
 */
export function getRelationStatus(relations, archetype) {
  const r = relations[archetype];
  if (!r) return { label: 'Unknown', color: '#666' };

  if (r.isBlacklisted)             return { label: 'BLACKLISTED', color: '#ff0000', icon: '\u{1F6AB}' };
  if (r.isMuse)                    return { label: 'YOUR MUSE', color: '#ff9e64', icon: '\u2728' };
  if (r.loyalty >= 5)              return { label: 'Devoted', color: '#39ff14', icon: '\u{1F49A}' };
  if (r.loyalty >= 3)              return { label: 'Friendly', color: '#39ff14', icon: '\u{1F60A}' };
  if (r.grudge >= 3)               return { label: 'Hostile', color: '#ff4444', icon: '\u{1F624}' };
  if (r.grudge >= 2)               return { label: 'Resentful', color: '#ff6b35', icon: '\u{1F612}' };
  if (r.grudge >= 1)               return { label: 'Wary', color: '#f1c40f', icon: '\u{1F928}' };
  if (r.timesHired >= 1)           return { label: 'Professional', color: '#aaa', icon: '\u{1F91D}' };
  return                                    { label: 'Stranger', color: '#666', icon: '\u2753' };
}

/**
 * Calculate modified cost based on relationship.
 * Loyalty >= 3: 10% discount
 * Loyalty >= 5: 20% discount
 * Grudge >= 2: 15% premium
 */
export function modifiedCost(relations, archetype, baseCost) {
  const r = relations[archetype];
  if (!r) return baseCost;

  let mult = 1.0;
  if (r.loyalty >= 5)      mult = 0.80;
  else if (r.loyalty >= 3) mult = 0.90;
  if (r.grudge >= 2)       mult = Math.max(mult, 1.15);

  return Math.round(baseCost * mult);
}

/**
 * Check if talent drops their demand (loyalty >= 5).
 */
export function demandDropped(relations, archetype) {
  const r = relations[archetype];
  return r && r.loyalty >= 5;
}

/**
 * Get the quality bonus for muse status.
 */
export function museBonus(relations, archetype) {
  const r = relations[archetype];
  return (r && r.isMuse) ? 5 : 0;
}

/**
 * Get modified talent stats based on relationship.
 * Brother-in-Law upgrade: q 2->8, tier no->c
 */
export function getModifiedTalent(relations, archetype, baseTalent) {
  const r = relations[archetype];
  if (!r) return baseTalent;

  const modified = { ...baseTalent };

  // Brother-in-Law upgrade
  if (archetype === 'Your Brother-in-Law' && r.isUpgraded) {
    modified.q = 8;
    modified.h = 3;
    modified.tier = 'c';
    modified.tagline = "Former wedding videographer. Now a legitimate filmmaker.";
    modified.quote = '"The trades called me an emerging voice. ME. I cried in the Costco parking lot."';
  }

  // Muse bonus
  if (r.isMuse) {
    modified.q += 5;
    modified.museLabel = `YOUR MUSE (${r.timesHired} films together)`;
  }

  return modified;
}

// ═══════════════════════════════════════════
// NOVA CHASE — Competitor State
// ═══════════════════════════════════════════

export function createNovaState() {
  return {
    introduced: false,     // shown after Film 2
    films: [],             // array of { title, genre, verdict }
    reputation: 0,         // Nova's perceived standing
    lastVerdict: null,
  };
}

/**
 * Simulate Nova's next film result.
 * Nova is slightly worse than the player on average,
 * but has occasional big hits (algorithm luck).
 */
export function simulateNovaFilm(novaState, playerFavoriteGenre) {
  const genres = ['action','horror','comedy','drama','romance','scifi','animated'];
  // Nova sometimes copies the player's successful genre
  const copiesPlayer = playerFavoriteGenre && Math.random() > 0.5;
  const genre = copiesPlayer ? playerFavoriteGenre : genres[Math.floor(Math.random() * genres.length)];

  const roll = Math.random();
  let verdict;
  if (roll < 0.15) verdict = 'blockbuster';
  else if (roll < 0.40) verdict = 'hit';
  else if (roll < 0.65) verdict = 'modest';
  else if (roll < 0.80) verdict = 'cult';
  else verdict = 'flop';

  const novaFilmNames = [
    'ALGORITHM', 'VIRAL LOAD', 'STREAM OF CONSCIOUSNESS', 'BUFFER',
    'TRENDING', 'UPLOAD', 'REFRESH', 'SUBSCRIBE', 'CONTENT',
    'INFLUENCER', 'FOLLOWER', 'ENGAGEMENT', 'CLICK', 'SWIPE RIGHT',
  ];
  const title = novaFilmNames[novaState.films.length % novaFilmNames.length];

  const film = { title, genre, verdict, copiedPlayer: copiesPlayer };
  novaState.films.push(film);
  novaState.lastVerdict = verdict;

  if (verdict === 'blockbuster' || verdict === 'hit') novaState.reputation += 2;
  else if (verdict === 'flop') novaState.reputation -= 1;

  return { novaState: { ...novaState }, film, copiedPlayer: copiesPlayer };
}
