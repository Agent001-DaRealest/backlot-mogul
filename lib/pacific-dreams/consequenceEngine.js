// ─────────────────────────────────────────────────────────────
// consequenceEngine.js — "The past catches up." (Backlot Mogul)
// ─────────────────────────────────────────────────────────────

import {
  TAGS, byTag, countTag, lastByTag, has, timesHired,
  genreStreak, verdictStreak, lastVerdict, indieStreak,
  favoriteGenre, firstBuilding, selfFundStreak, totalTreasuryDips,
} from './memoryLedger';

import { checkWalkout, getRelationStatus } from './talentRelations';

// ═══════════════════════════════════════════
// CONSEQUENCE SHAPE
// ═══════════════════════════════════════════
//
// {
//   type: 'walkout' | 'muse' | 'headline' | 'callback' | 'upgrade' | 'warning',
//   phase: 'production' | 'premiere' | 'lot' | 'preprod',
//   actor: 'The Auteur',          // who's involved
//   title: 'WALKOUT',             // display title
//   description: '...',           // what happened
//   options: [...],               // player choices (if any)
//   effects: { quality, hype, rep, funds },
//   pvmContent: { ... },          // what PVM shows
//   dialogue: { character, line },
// }

// ═══════════════════════════════════════════
// PRODUCTION CONSEQUENCES
// ═══════════════════════════════════════════

/**
 * Check for consequences that trigger during PRODUCTION.
 * Called at the start of production phase.
 * Returns array of consequence events (usually 0-1).
 */
export function checkProductionConsequences(ledger, talentRelations, currentFilm) {
  const consequences = [];

  if (!currentFilm?.cast) return consequences;

  // ── WALKOUT CHECK ──
  // For each cast member, check if a walkout should trigger
  Object.values(currentFilm.cast).filter(Boolean).forEach(talent => {
    const walkout = checkWalkout(talentRelations, talent.archetype);
    if (walkout?.trigger) {
      consequences.push({
        type: 'walkout',
        phase: 'production',
        actor: talent.archetype,
        title: 'WALKOUT',
        description: `${talent.archetype} has locked themselves in their trailer. They're on the phone with their agent. The crew is standing around.`,
        quote: `"I should have known. Nothing changes at this studio."`,
        severity: walkout.severity,
        options: [
          {
            label: `Give them what they want`,
            description: `Accept their original demand. End the standoff.`,
            effects: { quality: 10 },
            tag: 'walkout_forgiven',
          },
          {
            label: `Fire them. Promote the AD.`,
            description: `They're done. Bridge burned permanently.`,
            effects: { quality: -15 },
            tag: 'walkout_fired',
          },
        ],
        pvmContent: { type: 'crisis', icon: '\u{1F6AA}', label: 'WALKOUT' },
        dialogue: {
          character: 'max',
          line: `${talent.archetype} just locked themselves in their trailer.\nThey said — direct quote — 'Nothing changes at this studio.'\nWe need to handle this. Now.`,
        },
      });
    }
  });

  return consequences;
}

// ═══════════════════════════════════════════
// PREMIERE CONSEQUENCES
// ═══════════════════════════════════════════

/**
 * Check for consequences that trigger at PREMIERE.
 * Called after the verdict is determined.
 * Returns array of headline/event consequences.
 */
export function checkPremiereConsequences(ledger, talentRelations, currentFilm, verdict) {
  const consequences = [];
  const filmNum = byTag(ledger, TAGS.FILM_VERDICT).length + 1;

  // ── BROTHER-IN-LAW BLOCKBUSTER ──
  if (verdict === 'blockbuster' && currentFilm?.cast) {
    const hasBIL = Object.values(currentFilm.cast).some(t => t?.archetype === 'Your Brother-in-Law');
    if (hasBIL) {
      consequences.push({
        type: 'headline',
        phase: 'premiere',
        actor: 'Your Brother-in-Law',
        title: 'FROM GARAGE TO GLORY',
        description: 'How a wedding videographer became Hollywood\'s most unlikely auteur.',
        effects: { rep: 3 },
        pvmContent: { type: 'news', icon: '\u{1F4F0}', label: 'FROM GARAGE TO GLORY' },
        dialogue: {
          character: 'carmen',
          line: 'The trades are running the story. "From Garage to Glory."\nKevin is... well, Kevin is crying in the parking lot.\nBut in a good way.',
        },
      });
    }
  }

  // ── MOM'S FRIEND FLOP ──
  if (verdict === 'flop' && currentFilm?.cast) {
    const hasMom = Object.values(currentFilm.cast).some(t => t?.archetype === "Your Mom's Friend");
    if (hasMom) {
      consequences.push({
        type: 'headline',
        phase: 'premiere',
        actor: "Your Mom's Friend",
        title: 'MOM CALLED',
        description: 'Your mother heard about the reviews. She\'s... "disappointed."',
        effects: {},
        pvmContent: { type: 'news', icon: '\u{1F4F1}', label: 'MOM CALLED' },
        dialogue: {
          character: 'carmen',
          line: 'Your mother called the office.\nShe heard about the reviews.\nShe\'s... "disappointed." Her word, not mine.',
        },
      });
    }
  }

  // ── ALL-STAR FLOP (expensive failure) ──
  if (verdict === 'flop' && has(ledger, TAGS.ALL_STAR_CAST)) {
    const lastAllStar = lastByTag(ledger, TAGS.ALL_STAR_CAST);
    if (lastAllStar && lastAllStar.film === filmNum) {
      consequences.push({
        type: 'headline',
        phase: 'premiere',
        title: '$$$ CAN\'T BUY TALENT',
        description: 'Pacific Dreams\' most expensive film is also its biggest bomb.',
        effects: { rep: -3 },
        pvmContent: { type: 'news', icon: '\u{1F4B8}', label: "$$$ CAN'T BUY TALENT" },
        dialogue: {
          character: 'arthur',
          line: 'The headline writes itself.\n"Money Can\'t Buy Talent." That\'s us.\nThe board is not going to be pleased.',
        },
      });
    }
  }

  // ── A-LISTER BLAMES YOU (flop with grudging A-lister) ──
  if (verdict === 'flop' && currentFilm?.cast) {
    Object.values(currentFilm.cast).filter(Boolean).forEach(talent => {
      const rel = talentRelations[talent.archetype];
      if (rel && talent.tier === 'a' && rel.grudge >= 1) {
        consequences.push({
          type: 'headline',
          phase: 'premiere',
          actor: talent.archetype,
          title: 'BLAME GAME',
          description: `${talent.archetype} tells press: "The script was rewritten seventeen times. I lost faith in the vision."`,
          effects: { hype: -8 },
          pvmContent: { type: 'news', icon: '\u{1F5DE}\uFE0F', label: 'BLAME GAME' },
        });
      }
    });
  }

  // ── A-LISTER CREDITS YOU (blockbuster with loyal A-lister) ──
  if (verdict === 'blockbuster' && currentFilm?.cast) {
    Object.values(currentFilm.cast).filter(Boolean).forEach(talent => {
      const rel = talentRelations[talent.archetype];
      if (rel && talent.tier === 'a' && rel.loyalty >= 2) {
        consequences.push({
          type: 'headline',
          phase: 'premiere',
          actor: talent.archetype,
          title: 'STAMP OF APPROVAL',
          description: `${talent.archetype} tells press: "This studio gets it. They let artists be artists."`,
          effects: { hype: 5 },
          pvmContent: { type: 'news', icon: '\u2B50', label: 'STAMP OF APPROVAL' },
        });
      }
    });
  }

  // ── HOT STREAK ──
  const streak = verdictStreak(ledger);
  if (['hit','blockbuster'].includes(verdict) && streak.count >= 2) {
    consequences.push({
      type: 'headline',
      phase: 'premiere',
      title: streak.count >= 3 ? 'UNSTOPPABLE' : 'ON A ROLL',
      description: `Pacific Dreams hasn't missed in ${streak.count + 1} films.`,
      effects: { rep: 1 },
      pvmContent: { type: 'news', icon: '\u{1F525}', label: streak.count >= 3 ? 'UNSTOPPABLE' : 'ON A ROLL' },
    });
  }

  // ── COLD STREAK ──
  if (verdict === 'flop' && streak.count >= 1 && streak.type === 'flop') {
    consequences.push({
      type: 'warning',
      phase: 'premiere',
      title: 'TROUBLE AT PACIFIC DREAMS',
      description: `${streak.count + 1} consecutive underperformers. The town is talking.`,
      effects: { rep: -2 },
      pvmContent: { type: 'news', icon: '\u{1F4C9}', label: 'TROUBLE' },
    });
  }

  return consequences;
}

// ═══════════════════════════════════════════
// PRE-PRODUCTION CONSEQUENCES (callbacks)
// ═══════════════════════════════════════════

/**
 * Check for callbacks that trigger during PRE-PRODUCTION.
 * These are dialogue moments where NPCs reference the past.
 * Returns array of callback events.
 */
export function checkPreprodConsequences(ledger, talentRelations, filmNumber) {
  const consequences = [];

  // ── FIRST BUILDING CALLBACK (Film 3) ──
  if (filmNumber === 3) {
    const fb = firstBuilding(ledger);
    if (fb) {
      consequences.push({
        type: 'callback',
        phase: 'preprod',
        title: 'THE SUIT REMEMBERS',
        actor: 'arthur',
        detail: fb.detail, // building id
        dialogue: {
          character: 'arthur',
          line: null, // filled in by dialogue engine using first_building_callback
        },
      });
    }
  }

  // ── GENRE STREAK WARNING ──
  const gs = genreStreak(ledger);
  if (gs && filmNumber >= 4) {
    consequences.push({
      type: 'warning',
      phase: 'preprod',
      title: 'BRAND FATIGUE',
      actor: 'carmen',
      description: `Three ${gs} films in a row. The audience expects it now.`,
      effects: { quality: -5 }, // HOT genre bonus reduced
      dialogue: {
        character: 'carmen',
        line: `Boss, I need to say something.\nWe've become "the ${gs} studio." The audience expects it now.\nThat's a blessing and a curse.`,
      },
    });
  }

  // ── INDIE STREAK WARNING ──
  if (indieStreak(ledger) >= 3 && filmNumber >= 4) {
    consequences.push({
      type: 'callback',
      phase: 'preprod',
      actor: 'arthur',
      title: 'PLAY IT SAFE',
      dialogue: {
        character: 'arthur',
        line: 'You\'ve never swung for the fences, Kid.\nIndie, indie, indie. Shareholders don\'t invest in singles.\nThey invest in home runs.',
      },
    });
  }

  // ── MUSE DETECTION ──
  Object.entries(talentRelations).forEach(([archetype, rel]) => {
    if (rel.isMuse && rel.timesHired === 3) {
      // Just became a muse — announce it
      consequences.push({
        type: 'muse',
        phase: 'preprod',
        actor: archetype,
        title: 'MUSE',
        description: `Three films together. That's a partnership.`,
        effects: { quality: 5 },
        pvmContent: { type: 'character', icon: '\u2728', label: `MUSE: ${archetype}` },
        dialogue: {
          character: 'max',
          line: `Three films with ${archetype}. That's not a working relationship.\nThat's a partnership. Scorsese and De Niro.\nYou and ${archetype}. It's a thing now. The audience FEELS it.`,
        },
      });
    }
  });

  // ── TALENT GRUDGE WARNING ──
  Object.entries(talentRelations).forEach(([archetype, rel]) => {
    if (rel.grudge >= 3 && !rel.isBlacklisted) {
      consequences.push({
        type: 'headline',
        phase: 'preprod',
        actor: archetype,
        title: 'BAD BLOOD',
        description: `${archetype} calls Pacific Dreams "a factory for mediocrity."`,
        effects: { hype: -5 },
        pvmContent: { type: 'news', icon: '\u{1F5DE}\uFE0F', label: 'BAD BLOOD' },
      });
    }
  });

  // ── ALWAYS SELF-FUNDED WARNING ──
  const sfStreak = selfFundStreak(ledger);
  if (sfStreak >= 3 && filmNumber >= 4) {
    consequences.push({
      type: 'callback',
      phase: 'preprod',
      actor: 'arthur',
      title: 'TRUST ISSUES',
      dialogue: {
        character: 'arthur',
        line: "You've funded every film yourself. The distributors think\nyou don't trust them. That makes them not trust you.",
      },
    });
  }

  // ── TREASURY DIP PATTERN ──
  const dipCount = totalTreasuryDips(ledger);
  if (dipCount >= 3 && filmNumber >= 3) {
    const dipTotal = byTag(ledger, TAGS.TREASURY_DIP).reduce((sum, e) => sum + (e.meta?.amount || 0), 0);
    consequences.push({
      type: 'warning',
      phase: 'preprod',
      actor: 'carmen',
      title: 'TREASURY RAIDS',
      dialogue: {
        character: 'carmen',
        line: `Boss, you've raided the treasury ${dipCount} times across ${filmNumber} films.\nThat money could have been buildings. Or a safety net.\nJust... be careful.`,
      },
    });
  }

  // ── DISTRIBUTOR RELATIONSHIP CALLBACK ──
  const lastDist = lastByTag(ledger, TAGS.FUNDING_DISTRIBUTOR);
  if (lastDist && !lastDist.surfaced) {
    const lv = lastVerdict(ledger);
    if (lv && ['hit', 'blockbuster'].includes(lv.detail)) {
      lastDist.surfaced = true;
      consequences.push({
        type: 'callback',
        phase: 'preprod',
        actor: 'arthur',
        title: 'HAPPY DISTRIBUTOR',
        dialogue: {
          character: 'arthur',
          line: `${lastDist.detail} loved the numbers. They're offering more this time.\nDon't take that for granted.`,
        },
      });
    } else if (lv && lv.detail === 'flop') {
      lastDist.surfaced = true;
      consequences.push({
        type: 'warning',
        phase: 'preprod',
        actor: 'arthur',
        title: 'BURNED BRIDGE',
        dialogue: {
          character: 'arthur',
          line: `${lastDist.detail} is still licking their wounds from the last one.\nDon't expect the same terms. Or any terms.`,
        },
      });
    }
  }

  // ── NOVA COPIES GENRE (Film 4+) ──
  if (filmNumber >= 4 && has(ledger, TAGS.NOVA_COPIES_GENRE)) {
    const entry = lastByTag(ledger, TAGS.NOVA_COPIES_GENRE);
    if (entry && !entry.surfaced) {
      entry.surfaced = true;
      consequences.push({
        type: 'callback',
        phase: 'preprod',
        actor: 'nova',
        title: 'COPYCAT',
        dialogue: {
          character: 'carmen',
          line: `Nova Chase is making a ${entry.detail} film.\nShe's copying our playbook.\nThat's either flattering or terrifying.`,
        },
      });
    }
  }

  // ── RIDE DEMOLISHED + TALENT REACTION ──
  const demolitions = byTag(ledger, TAGS.RIDE_DEMOLISHED).filter(e => !e.surfaced);
  demolitions.forEach(demo => {
    // Find the talent who was in that film
    const filmHistory = byTag(ledger, TAGS.TALENT_HIRED).filter(e =>
      e.meta?.filmTitle === demo.detail
    );
    filmHistory.forEach(hire => {
      const rel = talentRelations[hire.actor];
      if (rel && rel.loyalty > 0) {
        demo.surfaced = true;
        consequences.push({
          type: 'callback',
          phase: 'preprod',
          actor: hire.actor,
          title: 'RIDE DEMOLISHED',
          dialogue: {
            character: 'max',
            line: `You tore down the ${demo.detail} ride?\n${hire.actor} heard. They're... not happy.\nThat ride meant something to them.`,
          },
        });
      }
    });
  });

  return consequences;
}

// ═══════════════════════════════════════════
// LOT PHASE CONSEQUENCES
// ═══════════════════════════════════════════

/**
 * Check for consequences during the LOT phase (between films).
 * News headlines, Danny texts, Nova updates.
 */
export function checkLotConsequences(ledger, novaState, filmNumber) {
  const consequences = [];

  // ── NOVA INTRODUCTION (after Film 2) ──
  if (filmNumber === 2 && !has(ledger, TAGS.NOVA_INTRODUCED)) {
    consequences.push({
      type: 'headline',
      phase: 'lot',
      actor: 'nova',
      title: 'NEW COMPETITION',
      description: 'StreamVault backs first-time studio "Nova Pictures" with $200M content deal.',
      pvmContent: { type: 'news', icon: '\u26A1', label: 'NOVA PICTURES' },
    });
  }

  // ── BUILDING MILESTONES ──
  const buildingCount = countTag(ledger, TAGS.BUILDING_BOUGHT);
  if (buildingCount === 1) {
    consequences.push({
      type: 'callback',
      phase: 'lot',
      title: 'FIRST EXPANSION',
      dialogue: {
        character: 'carmen',
        line: 'First building up. It\'s real now.\nNot just a garage and a dream. An actual studio.',
      },
    });
  }
  if (buildingCount === 3) {
    consequences.push({
      type: 'callback',
      phase: 'lot',
      title: 'GROWING',
      dialogue: {
        character: 'arthur',
        line: 'Three buildings. I have to admit, Kid —\nyou\'re starting to look like a real operation.\nDon\'t let it go to your head.',
      },
    });
  }

  return consequences;
}

// ═══════════════════════════════════════════
// NEWS GENERATOR — PVM headlines from ledger state
// ═══════════════════════════════════════════

/**
 * Generate a contextual news headline for the PVM.
 * Used on the lot screen and during transitions.
 */
export function generateNews(ledger, novaState, currentFilm) {
  const headlines = [];

  // Last film result
  const v = lastVerdict(ledger);
  if (v) {
    switch (v.detail) {
      case 'blockbuster':
        headlines.push(`Pacific Dreams does it again! "${v.meta?.title}" opens #1 worldwide.`);
        break;
      case 'hit':
        headlines.push(`"${v.meta?.title}" exceeds expectations. Pacific Dreams stock rises.`);
        break;
      case 'modest':
        headlines.push(`"${v.meta?.title}" posts modest returns. Analysts say "room to grow."`);
        break;
      case 'cult':
        headlines.push(`"${v.meta?.title}" finds devoted audience despite box office miss.`);
        break;
      case 'flop':
        headlines.push(`Trouble at Pacific Dreams? "${v.meta?.title}" bombs opening weekend.`);
        break;
    }
  }

  // Building news
  const lastBuild = lastByTag(ledger, TAGS.BUILDING_BOUGHT);
  if (lastBuild && !lastBuild.surfaced) {
    lastBuild.surfaced = true;
    headlines.push(`Pacific Dreams expands! New ${lastBuild.detail} signals bigger ambitions.`);
  }

  // Genre identity
  const fg = favoriteGenre(ledger);
  const genreCount = byTag(ledger, TAGS.GENRE_PICKED).filter(e => e.detail === fg).length;
  if (genreCount >= 3) {
    headlines.push(`Is Pacific Dreams becoming the "${fg}" studio? Critics weigh in.`);
  }

  // Nova news
  if (novaState?.lastVerdict) {
    if (novaState.lastVerdict === 'blockbuster') {
      const film = novaState.films[novaState.films.length - 1];
      headlines.push(`Nova Pictures' "${film?.title}" opens huge. Chase: "Just getting started."`);
    }
  }

  // Talent drama
  const lastDenied = lastByTag(ledger, TAGS.DEMAND_DENIED);
  if (lastDenied && !lastDenied.surfaced) {
    lastDenied.surfaced = true;
    headlines.push(`Sources say ${lastDenied.actor} "not pleased" with Pacific Dreams deal.`);
  }

  const lastAccepted = lastByTag(ledger, TAGS.DEMAND_ACCEPTED);
  if (lastAccepted && !lastAccepted.surfaced) {
    lastAccepted.surfaced = true;
    headlines.push(`${lastAccepted.actor} praises Pacific Dreams: "They let artists work."`);
  }

  // Brother-in-Law hiring
  if (has(ledger, TAGS.BROTHER_IN_LAW)) {
    const bil = lastByTag(ledger, TAGS.BROTHER_IN_LAW);
    if (bil && !bil.surfaced) {
      bil.surfaced = true;
      headlines.push('Pacific Dreams faces scrutiny over "nepotism hire."');
    }
  }

  return headlines;
}

// ═══════════════════════════════════════════
// SCRIPTED FIRST GAME — Conditions & Overrides
// ═══════════════════════════════════════════

/**
 * Get restrictions for the current film based on scripted first game.
 */
export function getFirstGameRestrictions(filmNumber, builtBuildings) {
  if (filmNumber === 0) {
    // Film 1: Indie only, C-List and No-Names only
    return {
      budgetLocked: ['studio', 'blockbuster'],
      talentTiersLocked: ['a', 'b'],
      marketRigged: true,         // 1 genre guaranteed HOT
      outcomeFloor: 'modest',     // can't get worse than modest hit
      message: null,
    };
  }

  if (filmNumber === 1) {
    // Film 2: Studio unlocked if Sound Stage, B-List if Casting
    return {
      budgetLocked: builtBuildings.includes('soundstage') ? ['blockbuster'] : ['studio', 'blockbuster'],
      talentTiersLocked: builtBuildings.includes('casting') ? ['a'] : ['a', 'b'],
      marketRigged: false,
      outcomeFloor: null,
      message: null,
    };
  }

  // Film 3+: Everything available based on buildings
  return {
    budgetLocked: builtBuildings.includes('soundstage') ? [] : ['blockbuster'],
    talentTiersLocked: builtBuildings.includes('casting') ? [] : ['a'],
    marketRigged: false,
    outcomeFloor: null,
    message: null,
  };
}

/**
 * Get the "rig" for Film 1's market trends.
 * Guarantees 1 clear HOT signal for new players.
 */
export function rigFirstGameTrends() {
  const genres = ['action', 'horror', 'comedy', 'drama', 'romance', 'scifi', 'animated'];
  // Shuffle then assign: first one HOT, next 2 WARM, rest COLD
  const shuffled = [...genres].sort(() => Math.random() - 0.5);
  const trends = {};
  shuffled.forEach((g, i) => {
    if (i === 0) trends[g] = 'hot';
    else if (i < 3) trends[g] = 'warm';
    else trends[g] = 'cold';
  });
  // Lock sci-fi as cold (can't access without VFX Lab)
  trends.scifi = 'cold';
  return trends;
}
