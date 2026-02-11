// ─────────────────────────────────────────────────────────────
// store.js — Backlot Mogul Central State
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { createEntry, resetTurnCounter, TAGS, derivePlayStyle } from './memoryLedger';
import { createRelations, recordHire, recordDemandAccepted, recordDemandDenied,
         recordFilmResult, recordWalkoutFired, recordWalkoutForgiven,
         decayGrudges } from './talentRelations';
import { createNovaState, simulateNovaFilm } from './talentRelations';

// ═══════════════════════════════════════════
// STAR SYSTEM — Hidden values → 5 discrete stars
// ═══════════════════════════════════════════

// Internal values are 0-100. Stars shown as 0-5.
// Thresholds are NOT evenly spaced — this creates
// the feeling of "several choices before a star changes."
const STAR_THRESHOLDS = [0, 18, 38, 58, 78]; // 0★ at 0, 1★ at 18, etc.

export function valueToStars(value) {
  let stars = 0;
  for (let i = STAR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (value >= STAR_THRESHOLDS[i]) { stars = i + 1; break; }
  }
  return Math.min(5, stars);
}

// ═══════════════════════════════════════════
// BUILDING DATA
// ═══════════════════════════════════════════

export const BUILDINGS = {
  writers:    { id: 'writers',    label: 'Writers Bungalow',  icon: '\u270D\uFE0F',  cost: 25000,  desc: 'Unlocks 3rd pitch option + quality bonus', qBonus: 8, hBonus: 0 },
  soundstage: { id: 'soundstage', label: 'Sound Stage',       icon: '\u{1F3AC}', cost: 75000,  desc: 'Unlocks Blockbuster budgets', qBonus: 5, hBonus: 5, unlocks: 'blockbuster' },
  casting:    { id: 'casting',    label: 'Casting Office',    icon: '\u{1F31F}', cost: 50000,  desc: 'Unlocks A-List talent', qBonus: 3, hBonus: 8, unlocks: 'alist' },
  vfxlab:     { id: 'vfxlab',     label: 'VFX Lab',           icon: '\u{1F52C}', cost: 120000, desc: 'Unlocks Sci-Fi genre', qBonus: 10, hBonus: 5, unlocks: 'scifi' },
  marketing:  { id: 'marketing',  label: 'Marketing Suite',   icon: '\u{1F4FA}', cost: 35000,  desc: 'Hype bonus each film', qBonus: 0, hBonus: 12 },
  posthouse:  { id: 'posthouse',  label: 'Post House',        icon: '\u{1F39E}\uFE0F', cost: 40000,  desc: 'Quality bonus each film', qBonus: 12, hBonus: 0 },
  commissary: { id: 'commissary', label: 'Commissary',        icon: '\u{1F355}', cost: 15000,  desc: 'Reduces crisis severity', qBonus: 3, hBonus: 3, special: 'crisis_reduce' },
  backlot:    { id: 'backlot',    label: 'Backlot',           icon: '\u{1F3D7}\uFE0F', cost: 30000,  desc: 'Genre-specific production bonus', qBonus: 6, hBonus: 4 },
};

// ═══════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════

const initialState = {
  // ── Core ──
  phase: 'title',        // title | preprod | production | premiere | lot | endgame
  funds: 50000,          // starting funds — enough for 1 bad movie
  reputation: 0,         // -10 to +20 scale (hidden, shown as stars)

  // ── Film tracking ──
  filmNumber: 0,         // completed films count
  currentFilm: null,     // { genre, pitch, rating, budget, cast, quality, hype, title }
  history: [],           // completed film objects

  // ── Memory ──
  ledger: [],            // Memory Ledger — tracks everything
  talentRelations: createRelations(),
  novaState: createNovaState(),

  // ── The Lot — 2×4 grid ──
  // Index 0-7. Plots 0-3 = back row, 4-7 = front row.
  // Plot 5 = Studio Home (permanent), Plot 6 = Park Gate (permanent)
  plots: [
    null, null, null, null,           // back row: all empty
    null,                             // front-left: empty
    { type: 'studio', id: 'home', level: 1, label: 'Studio Home', icon: '\u{1F3E0}' },
    { type: 'park',   id: 'gate', level: 1, label: 'Park Gate',   icon: '\u{1F3A2}' },
    null,                             // front-right: empty
  ],

  // ── Stars (hidden internal values) ──
  qualityInternal: 30,   // 0-100, shown as stars
  hypeInternal: 20,      // 0-100, shown as stars

  // ── Game flags ──
  isFirstGame: true,
  novaIntroduced: false,
  endgameTriggered: false,
  dannyLastMessage: null, // for PVM display
  rebootRequested: false, // set by logo click, consumed by PacificDreamsContent
};

// ═══════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════

const useStore = create((set, get) => ({
  ...initialState,

  // ── PHASE NAVIGATION ──
  setPhase: (phase) => set({ phase }),

  // ── MEMORY LEDGER ──
  logMemory: (film, beat, tag, opts = {}) => set(state => ({
    ledger: [...state.ledger, createEntry(film, beat, tag, opts)],
  })),

  // ── FUNDS ──
  addFunds: (amount) => set(state => ({
    funds: state.funds + amount,
  })),
  spendFunds: (amount) => set(state => ({
    funds: Math.max(0, state.funds - amount),
  })),

  // ── REPUTATION ──
  addReputation: (amount) => set(state => ({
    reputation: Math.max(-10, Math.min(20, state.reputation + amount)),
  })),

  // ── QUALITY / HYPE (internal hidden values) ──
  adjustQuality: (delta) => set(state => ({
    qualityInternal: Math.max(0, Math.min(100, state.qualityInternal + delta)),
  })),
  adjustHype: (delta) => set(state => ({
    hypeInternal: Math.max(0, Math.min(100, state.hypeInternal + delta)),
  })),
  resetQualityHype: () => set({ qualityInternal: 30, hypeInternal: 20 }),

  // ── CURRENT FILM ──
  setCurrentFilm: (film) => set({ currentFilm: film }),
  updateCurrentFilm: (updates) => set(state => ({
    currentFilm: state.currentFilm ? { ...state.currentFilm, ...updates } : null,
  })),

  // ── COMPLETE FILM (move to history) ──
  completeFilm: (verdict, earnings) => set(state => {
    const film = state.currentFilm;
    if (!film) return {};

    const completed = {
      ...film,
      number: state.filmNumber + 1,
      verdict,
      earnings,
      quality: state.qualityInternal,
      hype: state.hypeInternal,
    };

    // Log verdict to ledger
    const verdictEntry = createEntry(state.filmNumber + 1, 'premiere', TAGS.FILM_VERDICT, {
      detail: verdict,
      meta: { title: film.title, earnings, genre: film.genre },
    });

    // Specific verdict tags
    const extraEntries = [];
    if (verdict === 'flop') {
      extraEntries.push(createEntry(state.filmNumber + 1, 'premiere', TAGS.FILM_FLOP, {
        meta: { title: film.title },
      }));
    }
    if (verdict === 'blockbuster') {
      extraEntries.push(createEntry(state.filmNumber + 1, 'premiere', TAGS.FILM_BLOCKBUSTER, {
        meta: { title: film.title },
      }));
    }
    if (verdict === 'hit') {
      extraEntries.push(createEntry(state.filmNumber + 1, 'premiere', TAGS.FILM_HIT, {
        meta: { title: film.title },
      }));
    }

    // Update talent relations for cast members
    let relations = { ...state.talentRelations };
    if (film.cast) {
      Object.values(film.cast).filter(Boolean).forEach(talent => {
        relations = recordFilmResult(relations, talent.archetype, verdict);
      });
    }

    // Decay grudges between films
    relations = decayGrudges(relations);

    return {
      filmNumber: state.filmNumber + 1,
      currentFilm: null,
      history: [...state.history, completed],
      ledger: [...state.ledger, verdictEntry, ...extraEntries],
      talentRelations: relations,
      qualityInternal: 30, // reset for next film
      hypeInternal: 20,
    };
  }),

  // ── TALENT RELATIONS ──
  hireTalent: (archetype, film) => set(state => ({
    talentRelations: recordHire({ ...state.talentRelations }, archetype, film),
  })),
  acceptDemand: (archetype, film) => set(state => ({
    talentRelations: recordDemandAccepted({ ...state.talentRelations }, archetype, film),
  })),
  denyDemand: (archetype, film) => set(state => ({
    talentRelations: recordDemandDenied({ ...state.talentRelations }, archetype, film),
  })),
  fireAfterWalkout: (archetype) => set(state => ({
    talentRelations: recordWalkoutFired({ ...state.talentRelations }, archetype),
  })),
  forgiveWalkout: (archetype) => set(state => ({
    talentRelations: recordWalkoutForgiven({ ...state.talentRelations }, archetype),
  })),

  // ── LOT / PARK ──
  buildOnPlot: (plotIndex, item) => set(state => {
    const plots = [...state.plots];
    if (plots[plotIndex] !== null) return {}; // occupied
    plots[plotIndex] = item;

    const entries = [];
    const filmNum = state.filmNumber;

    if (item.type === 'building') {
      entries.push(createEntry(filmNum, 'lot', TAGS.BUILDING_BOUGHT, {
        detail: item.id, meta: { plotIndex },
      }));
      // Track first building
      const prevBuildings = state.ledger.filter(e => e.tag === TAGS.BUILDING_BOUGHT);
      if (prevBuildings.length === 0) {
        entries.push(createEntry(filmNum, 'lot', TAGS.FIRST_BUILDING, {
          detail: item.id,
        }));
      }
    } else if (item.type === 'ride') {
      entries.push(createEntry(filmNum, 'lot', TAGS.RIDE_PLACED, {
        detail: item.filmTitle, meta: { genre: item.genre, plotIndex },
      }));
    }

    // Check if lot is full (endgame trigger)
    const emptyCount = plots.filter(p => p === null).length;
    if (emptyCount === 0) {
      entries.push(createEntry(filmNum, 'lot', TAGS.LOT_FULL, {}));
    }

    return {
      plots,
      funds: state.funds - (item.cost || 0),
      ledger: [...state.ledger, ...entries],
      endgameTriggered: emptyCount === 0,
    };
  }),

  demolishPlot: (plotIndex) => set(state => {
    const plots = [...state.plots];
    const existing = plots[plotIndex];
    if (!existing || existing.id === 'home' || existing.id === 'gate') return {};

    plots[plotIndex] = null;

    const entries = [];
    if (existing.type === 'ride') {
      entries.push(createEntry(state.filmNumber, 'lot', TAGS.RIDE_DEMOLISHED, {
        detail: existing.filmTitle, meta: { genre: existing.genre },
      }));
    }

    return {
      plots,
      ledger: [...state.ledger, ...entries],
      endgameTriggered: false, // no longer full
    };
  }),

  // ── NOVA ──
  introduceNova: () => set(state => {
    if (state.novaIntroduced) return {};
    return {
      novaIntroduced: true,
      novaState: { ...state.novaState, introduced: true },
      ledger: [...state.ledger, createEntry(state.filmNumber, 'lot', TAGS.NOVA_INTRODUCED, {})],
    };
  }),

  simulateNova: () => set(state => {
    if (!state.novaIntroduced) return {};
    const favorite = null; // TODO: derive from ledger
    const { novaState, film, copiedPlayer } = simulateNovaFilm(
      { ...state.novaState }, favorite
    );
    const entries = [];
    if (film.verdict === 'hit' || film.verdict === 'blockbuster') {
      entries.push(createEntry(state.filmNumber, 'lot', TAGS.NOVA_HIT, { meta: film }));
    } else if (film.verdict === 'flop') {
      entries.push(createEntry(state.filmNumber, 'lot', TAGS.NOVA_FLOP, { meta: film }));
    }
    if (copiedPlayer) {
      entries.push(createEntry(state.filmNumber, 'lot', TAGS.NOVA_COPIES_GENRE, {
        detail: film.genre,
      }));
    }
    return {
      novaState,
      ledger: [...state.ledger, ...entries],
    };
  }),

  // ── COMPUTED HELPERS ──
  getQualityStars: () => valueToStars(get().qualityInternal),
  getHypeStars: () => valueToStars(get().hypeInternal),
  getRepStars: () => valueToStars(Math.max(0, (get().reputation + 10) * 5)), // map -10..20 → 0..150 → clamp

  getEmptyPlots: () => get().plots.reduce((acc, p, i) => {
    if (p === null) acc.push(i);
    return acc;
  }, []),

  getBuiltBuildings: () => get().plots.filter(p => p && p.type === 'building').map(p => p.id),

  hasBuilding: (id) => get().plots.some(p => p && p.id === id),

  isLotFull: () => get().plots.every(p => p !== null),

  getPlayStyle: () => derivePlayStyle(get().ledger),

  // ── REBOOT (logo click → confirm → reset) ──
  requestReboot: () => set({ rebootRequested: true }),
  cancelReboot: () => set({ rebootRequested: false }),

  // ── RESET ──
  resetGame: () => {
    resetTurnCounter();
    set(initialState);
  },
}));

// Export as both useStore (new convention) and useGameStore (backward compatibility)
export { useStore };
export default useStore;
