// Pacific Dreams — Static Game Data
// Adapted from SimCinema-TS with simplified crew tiers and Pacific Dreams theming

// ═══════════════════════════════════════════
// GENRES
// ═══════════════════════════════════════════

export const GENRES = [
  { id: 'action', label: 'ACTION', icon: '💥' },
  { id: 'comedy', label: 'COMEDY', icon: '😂' },
  { id: 'drama', label: 'DRAMA', icon: '🎭' },
  { id: 'romance', label: 'ROMANCE', icon: '💕' },
  { id: 'horror', label: 'HORROR', icon: '👻' },
  { id: 'scifi', label: 'SCI-FI', icon: '🚀' },
  { id: 'animated', label: 'ANIMATED', icon: '🎨' },
];

// ═══════════════════════════════════════════
// BUDGET TIERS (replaces SimCinema studio negotiation)
// ═══════════════════════════════════════════

export const BUDGET_TIERS = [
  { id: 'indie', label: 'INDIE', amount: 15, risk: 'low', description: 'Garage filmmaking. Low stakes, cult potential.' },
  { id: 'studio', label: 'STUDIO', amount: 60, risk: 'medium', description: 'Professional production. Solid returns expected.' },
  { id: 'blockbuster', label: 'BLOCKBUSTER', amount: 120, risk: 'high', description: 'Tentpole release. Go big or go broke.' },
];

// ═══════════════════════════════════════════
// CREW TIERS (replaces SimCinema's named characters)
// Base quality values per role per tier
// ═══════════════════════════════════════════

export const CREW_TIERS = {
  director: {
    'A-List': { base: 90, cost: 25, label: 'A-LIST DIRECTOR', desc: 'Visionary. Commands the set.' },
    'B-List': { base: 70, cost: 15, label: 'B-LIST DIRECTOR', desc: 'Solid craftsman. Gets it done.' },
    'C-List': { base: 50, cost: 8, label: 'C-LIST DIRECTOR', desc: 'Unproven. Hungry to impress.' },
    'No-Name': { base: 30, cost: 2, label: 'UNKNOWN DIRECTOR', desc: 'Film school grad. First feature.' },
  },
  lead: {
    'A-List': { base: 85, cost: 20, label: 'A-LIST STAR', desc: 'Box office draw. Paparazzi magnet.' },
    'B-List': { base: 65, cost: 10, label: 'B-LIST STAR', desc: 'Recognizable face. Reliable.' },
    'C-List': { base: 45, cost: 5, label: 'C-LIST ACTOR', desc: 'That guy from that thing.' },
    'No-Name': { base: 25, cost: 1, label: 'UNKNOWN ACTOR', desc: 'Open casting call find.' },
  },
  support: {
    'A-List': { base: 50, cost: 15, label: 'A-LIST CREW', desc: 'Oscar-winning VFX, score, and sound.' },
    'B-List': { base: 35, cost: 8, label: 'B-LIST CREW', desc: 'Competent department heads.' },
    'C-List': { base: 20, cost: 3, label: 'C-LIST CREW', desc: 'They own a camera.' },
    'No-Name': { base: 10, cost: 1, label: 'SKELETON CREW', desc: 'Your cousin and his friends.' },
  },
};

// ═══════════════════════════════════════════
// RATING MODIFIERS (from SimCinema ratingData)
// Applied as quality bonus/penalty per genre+rating combo
// ═══════════════════════════════════════════

export const RATING_MODIFIERS = {
  'G':     { action: 0, comedy: 0, drama: -10, romance: -10, horror: -20, scifi: -10, animated: 20 },
  'PG':    { action: 6, comedy: 6, drama: -6, romance: -10, horror: -14, scifi: -10, animated: 14 },
  'PG-13': { action: 14, comedy: 14, drama: 0, romance: 0, horror: 0, scifi: 6, animated: -14 },
  'R':     { action: 14, comedy: 10, drama: 10, romance: 14, horror: 14, scifi: 14, animated: -20 },
  'NC-17': { action: 0, comedy: -12, drama: 6, romance: 6, horror: 0, scifi: 0, animated: -20 },
};

export const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

// ═══════════════════════════════════════════
// GENRE-SPECIFIC CREW BONUSES
// Multiplier applied to base crew quality for genre fit
// ═══════════════════════════════════════════

export const GENRE_CREW_MULTIPLIERS = {
  action:   { director: 1.0, lead: 1.1, support: 1.2 },
  comedy:   { director: 1.1, lead: 1.0, support: 0.8 },
  drama:    { director: 1.2, lead: 1.1, support: 0.7 },
  romance:  { director: 0.9, lead: 1.2, support: 0.7 },
  horror:   { director: 1.0, lead: 0.9, support: 1.1 },
  scifi:    { director: 1.0, lead: 0.9, support: 1.3 },
  animated: { director: 1.1, lead: 0.8, support: 1.3 },
};

// ═══════════════════════════════════════════
// REVIEWERS (adapted from SimCinema)
// Skew: positive = favorable, negative = harsh
// ═══════════════════════════════════════════

export const REVIEWERS = [
  { name: 'Pacific Herald', skew: 0.066, tone: 'generous' },
  { name: 'Sunset Tribune', skew: 0.1, tone: 'enthusiastic' },
  { name: 'Coast Weekly', skew: -0.18, tone: 'ruthless' },
  { name: 'Dream Factory Digest', skew: 0, tone: 'neutral' },
  { name: 'The Evening Reel', skew: -0.12, tone: 'skeptical' },
];

// ═══════════════════════════════════════════
// CRISIS CARDS
// 5 drawn per production from this pool
// Each has two options affecting quality and hype
// ═══════════════════════════════════════════

export const CRISIS_CARDS = [
  {
    id: 'star-drunk',
    title: 'STAR ARRIVES DRUNK',
    description: 'Your lead stumbles onto set reeking of tequila. The crew is watching.',
    optionA: { label: 'SOBER THEM UP', desc: 'Delay shooting. Make coffee.', qualityDelta: 5, hypeDelta: -2 },
    optionB: { label: 'SHOOT ANYWAY', desc: 'Method acting, right?', qualityDelta: -8, hypeDelta: 3 },
  },
  {
    id: 'director-tantrum',
    title: 'DIRECTOR THROWS A FIT',
    description: 'The director screams at the lighting crew and storms off set.',
    optionA: { label: 'CALM THEM DOWN', desc: 'Mediate. Lose half a day.', qualityDelta: 3, hypeDelta: -1 },
    optionB: { label: 'LET THEM RANT', desc: 'Genius has its price.', qualityDelta: -5, hypeDelta: 0 },
  },
  {
    id: 'paparazzi',
    title: 'PAPARAZZI ON SET',
    description: 'TMZ is outside with telephoto lenses. Leaked photos are imminent.',
    optionA: { label: 'SHUT IT DOWN', desc: 'Security costs money. No leaks.', qualityDelta: 2, hypeDelta: -3 },
    optionB: { label: 'LET THEM SHOOT', desc: 'Free publicity is free publicity.', qualityDelta: -3, hypeDelta: 8 },
  },
  {
    id: 'stunt-gone-wrong',
    title: 'STUNT GOES WRONG',
    description: 'The car flip went sideways. Nobody hurt, but the set is wrecked.',
    optionA: { label: 'REBUILD THE SET', desc: 'Expensive but right.', qualityDelta: 6, hypeDelta: -1 },
    optionB: { label: 'USE THE FOOTAGE', desc: 'It looks real because it IS real.', qualityDelta: -2, hypeDelta: 5 },
  },
  {
    id: 'script-rewrite',
    title: 'SCRIPT NEEDS A REWRITE',
    description: 'Act three is a mess. Everyone knows it. Do you fix it now or push through?',
    optionA: { label: 'REWRITE NOW', desc: 'Halt production. Fix the story.', qualityDelta: 10, hypeDelta: -4 },
    optionB: { label: 'PUSH THROUGH', desc: 'Fix it in post. Probably.', qualityDelta: -6, hypeDelta: 1 },
  },
  {
    id: 'weather-disaster',
    title: 'HURRICANE WARNING',
    description: 'A tropical storm is heading for your outdoor shoot location.',
    optionA: { label: 'MOVE INDOORS', desc: 'Green screen it. Costs more.', qualityDelta: -4, hypeDelta: 0 },
    optionB: { label: 'CHASE THE STORM', desc: 'Shoot in the rain. It could be epic.', qualityDelta: 8, hypeDelta: 2 },
  },
  {
    id: 'chemistry-magic',
    title: 'UNEXPECTED CHEMISTRY',
    description: 'Your leads are improvising and it is GOLD. Do you let the cameras roll?',
    optionA: { label: 'STICK TO SCRIPT', desc: 'Discipline keeps the vision.', qualityDelta: 3, hypeDelta: 0 },
    optionB: { label: 'LET THEM COOK', desc: 'Sometimes magic is unscripted.', qualityDelta: 7, hypeDelta: 2 },
  },
  {
    id: 'budget-crunch',
    title: 'OVER BUDGET',
    description: 'The accountant just called. You are 20% over budget with two weeks left.',
    optionA: { label: 'CUT CORNERS', desc: 'Cheaper effects. Fewer takes.', qualityDelta: -8, hypeDelta: 0 },
    optionB: { label: 'BEG THE STUDIO', desc: 'More money, more pressure.', qualityDelta: 2, hypeDelta: -3 },
  },
  {
    id: 'viral-set-photo',
    title: 'SET PHOTO GOES VIRAL',
    description: 'Someone leaked a behind-the-scenes photo. Twitter is going nuts.',
    optionA: { label: 'DMCA TAKEDOWN', desc: 'Kill the buzz. Protect the reveal.', qualityDelta: 2, hypeDelta: -5 },
    optionB: { label: 'LEAN INTO IT', desc: 'Post more teasers. Ride the wave.', qualityDelta: 0, hypeDelta: 10 },
  },
  {
    id: 'method-actor',
    title: 'METHOD ACTING MELTDOWN',
    description: 'Your lead refuses to break character. Even at craft services.',
    optionA: { label: 'STAGE INTERVENTION', desc: 'Get them back to reality.', qualityDelta: 0, hypeDelta: -1 },
    optionB: { label: 'EMBRACE THE CHAOS', desc: 'The performance might be legendary.', qualityDelta: 6, hypeDelta: 3 },
  },
  {
    id: 'location-nightmare',
    title: 'LOCATION PERMIT REVOKED',
    description: 'The city just pulled your shooting permit. You have 24 hours.',
    optionA: { label: 'FIND NEW LOCATION', desc: 'Scout fast. Lose two days.', qualityDelta: -3, hypeDelta: 0 },
    optionB: { label: 'GUERRILLA SHOOT', desc: 'No permit? No problem. Maybe.', qualityDelta: 4, hypeDelta: 4 },
  },
  {
    id: 'composer-genius',
    title: 'COMPOSER HAS A VISION',
    description: 'The composer wants to scrap the score and start over. It could be brilliant.',
    optionA: { label: 'KEEP ORIGINAL', desc: 'Safe. On schedule.', qualityDelta: 0, hypeDelta: 0 },
    optionB: { label: 'START OVER', desc: 'Risk the deadline for art.', qualityDelta: 8, hypeDelta: -2 },
  },
  {
    id: 'celebrity-cameo',
    title: 'CELEBRITY CAMEO OFFER',
    description: 'A mega-star wants a walk-on role. But they want creative input.',
    optionA: { label: 'POLITELY DECLINE', desc: 'Keep the vision pure.', qualityDelta: 2, hypeDelta: -1 },
    optionB: { label: 'WELCOME ABOARD', desc: 'Star power at the cost of control.', qualityDelta: -2, hypeDelta: 8 },
  },
  {
    id: 'test-screening',
    title: 'TERRIBLE TEST SCREENING',
    description: 'The focus group hated the ending. Cards say "confusing" and "boring."',
    optionA: { label: 'RESHOOT ENDING', desc: 'Expensive. But the data speaks.', qualityDelta: 7, hypeDelta: -3 },
    optionB: { label: 'TRUST YOUR GUT', desc: 'They said the same about Blade Runner.', qualityDelta: -4, hypeDelta: 1 },
  },
  {
    id: 'late-night-appearance',
    title: 'LATE NIGHT TV SPOT',
    description: 'Your lead is invited on a late night show. But they are terrible at interviews.',
    optionA: { label: 'SKIP IT', desc: 'No risk. No exposure.', qualityDelta: 0, hypeDelta: 0 },
    optionB: { label: 'SEND THEM', desc: 'Could be charming or a disaster.', qualityDelta: 0, hypeDelta: 7 },
  },
  {
    id: 'vfx-disaster',
    title: 'VFX HOUSE BANKRUPTCY',
    description: 'Your VFX vendor just went under. Half the shots are unfinished.',
    optionA: { label: 'HIRE NEW VENDOR', desc: 'Triple the cost. Rush job.', qualityDelta: -5, hypeDelta: 0 },
    optionB: { label: 'PRACTICAL EFFECTS', desc: 'Old school. Might look incredible.', qualityDelta: 5, hypeDelta: 2 },
  },
];

// ═══════════════════════════════════════════
// TITLE GENERATOR WORD POOLS
// ═══════════════════════════════════════════

export const TITLE_WORDS = {
  action: {
    adjectives: ['Iron', 'Savage', 'Lethal', 'Rogue', 'Thunder', 'Crimson', 'Steel', 'Shadow', 'Bullet', 'Fury'],
    nouns: ['Protocol', 'Strike', 'Vendetta', 'Pursuit', 'Fist', 'Siege', 'Recon', 'Blitz', 'Justice', 'Assault'],
  },
  comedy: {
    adjectives: ['Dumb', 'Wild', 'Crazy', 'Hot', 'Big', 'Happy', 'Super', 'Totally', 'Epic', 'Funky'],
    nouns: ['Wedding', 'Vacation', 'Weekend', 'Heist', 'Disaster', 'Neighbors', 'Party', 'Hustle', 'Road Trip', 'Mess'],
  },
  drama: {
    adjectives: ['Broken', 'Silent', 'Lost', 'Fallen', 'Beautiful', 'Burning', 'Bitter', 'Still', 'Hollow', 'Vanishing'],
    nouns: ['Bridge', 'Promise', 'Memory', 'Garden', 'Truth', 'Kingdom', 'Requiem', 'Passage', 'Confession', 'Descent'],
  },
  romance: {
    adjectives: ['Eternal', 'Secret', 'Last', 'Midnight', 'Golden', 'Forbidden', 'Tender', 'Sweet', 'Stolen', 'Endless'],
    nouns: ['Kiss', 'Affair', 'Letter', 'Summer', 'Waltz', 'Heart', 'Promise', 'Sunset', 'Embrace', 'Dream'],
  },
  horror: {
    adjectives: ['Cursed', 'Wicked', 'Dark', 'Hollow', 'Pale', 'Rotting', 'Bleeding', 'Twisted', 'Crawling', 'Sinister'],
    nouns: ['House', 'Cellar', 'Child', 'Mirror', 'Crypt', 'Doll', 'Woods', 'Asylum', 'Whisper', 'Parasite'],
  },
  scifi: {
    adjectives: ['Neon', 'Quantum', 'Void', 'Stellar', 'Chrome', 'Cyber', 'Neural', 'Orbital', 'Hyper', 'Astral'],
    nouns: ['Horizon', 'Protocol', 'Signal', 'Nexus', 'Anomaly', 'Genesis', 'Paradox', 'Singularity', 'Eclipse', 'Drift'],
  },
  animated: {
    adjectives: ['Magic', 'Tiny', 'Flying', 'Rainbow', 'Brave', 'Sparkle', 'Wonder', 'Cosmic', 'Enchanted', 'Mighty'],
    nouns: ['Kingdom', 'Adventure', 'Forest', 'Island', 'Friends', 'Quest', 'Dragon', 'Voyage', 'Legend', 'World'],
  },
};

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

export const MAX_QUALITY = 420; // Theoretical ceiling (from SimCinema)
export const CRISIS_CARDS_PER_MOVIE = 5;
export const BOX_OFFICE_WEEKS = 12;
export const WEEKLY_REVENUE_PER_THEATER = 703; // From SimCinema
export const GENRE_REPEAT_PENALTY = -50;
