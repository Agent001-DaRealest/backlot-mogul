// ─────────────────────────────────────────────────────────────
// dialogueEngine.js — "They remember everything." (Backlot Mogul)
// ─────────────────────────────────────────────────────────────

import {
  TAGS, lastByTag, byTag, countTag, genreStreak, lastVerdict,
  verdictStreak, timesHired, has, indieStreak, alwaysRating,
  firstBuilding, surfaceOne, unsurfaced, favoriteGenre,
  totalTreasuryDips, selfFundStreak,
} from './memoryLedger';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ═══════════════════════════════════════════
// DIALOGUE BANK
// ═══════════════════════════════════════════
// Each character has GENERIC lines (always available)
// and MEMORY lines (triggered by ledger state).
// Memory lines ALWAYS take priority.
//
// Memory lines are functions that receive:
//   { ledger, film, lastFilm, memory }
// and return a string or null (null = skip this line).

const CARMEN = {
  // ── BEAT 1: MARKET ──
  greeting: {
    generic: [
      "New data's in. Market shifted since last time.",
      "Morning. Got coffee and audience analytics. The important stuff.",
      "The landscape looks different this quarter. Take a look.",
    ],
    scripted_film1:
      "Morning, Boss. First day of the rest of your life.\nOr the last day of your career. Let's find out.",
    memory: [
      {
        check: (ctx) => ctx.film === 1,
        line: () => "Morning, Boss. First day of the rest of your life.\nOr the last day of your career. Let's find out.",
        priority: 100,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && ['blockbuster','hit'].includes(v.detail);
        },
        line: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          const title = v?.meta?.title || 'the last one';
          return `Phones have been ringing since ${title} premiered.\nEveryone wants to know what's next. So — what are we doing next?`;
        },
        priority: 80,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.detail === 'flop';
        },
        line: () => "I'm not going to sugarcoat it. The numbers were bad.\nBut the market moves fast. New quarter, new shot.",
        priority: 80,
      },
      {
        check: (ctx) => !!genreStreak(ctx.ledger),
        line: (ctx) => {
          const g = genreStreak(ctx.ledger);
          return `Boss, I need to say something. We've made three ${g} films in a row.\nThe audience is starting to think that's all we do. Fatigue is real.`;
        },
        priority: 90,
      },
      {
        check: (ctx) => has(ctx.ledger, TAGS.GENRE_COLD_SUCCESS),
        line: () => "You went against the data last time and it paid off.\nI'm still not sure if that was genius or luck. Let's test the theory.",
        priority: 70,
      },
      {
        check: (ctx) => has(ctx.ledger, TAGS.GENRE_COLD_FAIL) && !has(ctx.ledger, TAGS.GENRE_COLD_SUCCESS),
        line: () => "Last time you went against the grain and... well.\nMaybe listen to the numbers this time? Just a thought.",
        priority: 70,
      },
    ],
  },

  genre_react: {
    hot: [
      "Smart. The audience is hungry for this.",
      "Strong pick. Every data point says this is the move.",
      "Hot market. You're swimming with the current.",
    ],
    warm: [
      "Solid. Not flashy, but there's an audience.",
      "Steady choice. It'll come down to execution.",
      "Safe pick. Sometimes safe wins.",
    ],
    cold: [
      "That's... bold. The market is ice cold on this.",
      "You sure? The last three in this genre all underperformed.",
      "Going against the data. I respect it. I also want it on the record.",
    ],
    cold_memory_success:
      "Going cold again. Last time it worked, so I'll keep my mouth shut. This time.",
  },

  greenlight: {
    high: [
      "I've crunched everything. The numbers say we've got something.\nI believe in this one.",
      "This package is strong. Not perfect — nothing is —\nbut the fundamentals are right.",
    ],
    mid: [
      "It could go either way. We've got strengths and gaps.\nTrust your instincts.",
    ],
    low: [
      "Boss, I'm going to be honest. The numbers are thin.\nIt HAS to be better than the sum of its parts. That's on you.",
    ],
    memory: [
      {
        check: (ctx) => {
          const s = verdictStreak(ctx.ledger);
          return s.count >= 2 && ['hit','blockbuster'].includes(s.type);
        },
        line: () => "Your streak is intact. Don't think about it. Just make the movie.",
        priority: 85,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.detail === 'flop';
        },
        line: () => "We can't afford another miss.\nI don't say that to scare you. I say it because I think THIS one is different.",
        priority: 80,
      },
      {
        check: (ctx) => !has(ctx.ledger, TAGS.FILM_FLOP),
        line: () => "You haven't missed yet. Don't let that make you careless.",
        priority: 70,
      },
    ],
  },

  // ── MARKETING PHASE ──
  marketing_entry: {
    high: [
      "Hype is strong already. Honestly? You could save the money here.",
      "The buzz is there. Every dollar spent now has diminishing returns.\nBut it's your call.",
    ],
    mid: [
      "Awareness is decent. A targeted campaign could push us over the edge.",
      "We've got some buzz. Question is: do we go bigger or save the money?",
    ],
    low: [
      "Nobody knows this movie exists yet. That's a problem.",
      "Awareness is critically low. We need to spend or this opens to empty theaters.",
    ],
    memory: [
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && ['blockbuster', 'hit'].includes(v.detail);
        },
        line: () => "We've got momentum from the last film. The name sells itself.\nBut a little push never hurts.",
        priority: 80,
      },
      {
        check: (ctx) => has(ctx.ledger, TAGS.MARKETING_FROM_TREASURY),
        line: () => "Last time we dipped into treasury for marketing.\nLet's be more disciplined this time.",
        priority: 75,
      },
    ],
  },
};

const RICKY = {
  greeting: {
    generic: [
      "I've been writing. I've been LIVING these stories.\nTwo pitches. Both extraordinary. Obviously.",
      "Okay, okay, okay — sit down. You're going to love this.",
      "The muse visited. I have ideas.",
    ],
    memory: [
      {
        check: (ctx) => ctx.film === 1,
        line: () => "So. You bought a studio and you need a movie.\nLucky for you, I haven't slept in three days.\nTwo pitches. Both perfect.",
        priority: 100,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && ['blockbuster','hit'].includes(v.detail);
        },
        line: () => "We're hot. The town is watching.\nThis next one — this is where we prove it wasn't a fluke.",
        priority: 80,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.detail === 'flop';
        },
        line: () => "I'm not going to talk about the last one. It's dead to me.\nWhat matters is THIS. I've been up for 72 hours. Let me show you.",
        priority: 80,
      },
      {
        check: (ctx) => has(ctx.ledger, TAGS.CUSTOM_TITLE),
        line: () => "You wrote your own title last time. I respect that.\nI mean, I could have done better. But I respect it.\nThis time — just HEAR my pitches first. Please.",
        priority: 75,
      },
    ],
  },

  pitch_react: {
    generic: [
      "YES. That's the one. I can SEE it.\nI can see the poster. I can hear the score.",
      "You feel that? That little electric thing in your chest?\nThat's the movie telling you it wants to exist.",
      "Good eye. THIS one has something. A pulse.",
    ],
    custom_title: [
      "You want to write your own? Fine. FINE.\nI'll just be over here. With my MacArthur Grant. Unused.",
      "Alright. Your title. Your vision.\nI'll make it work. I always do.",
    ],
  },

  rating_react: {
    G:       "G-rated? Family film?\nThat's either brilliant or terrifying. No middle ground.",
    PG:      "PG. Classic. Spielberg energy. I can work with that.",
    'PG-13': "PG-13. That's where the money is. Smart.",
    R:       "R-rated. Good. No filter. No safety net.\nThis is where art lives.",
    'NC-17': "NC-17? Are you trying to get us shut down?\nI love it. Absolutely no one will see this film.\nBut those who DO? Changed forever.",
    memory: [
      {
        check: (ctx) => alwaysRating(ctx.ledger, 'R') && ctx.film >= 3,
        line: () => "R again. You've never made a film under R.\nConsistent. Or stubborn. Either way — your brand.",
        priority: 80,
      },
    ],
  },

  // ── PREMIERE PHASE ──
  premiere_reviews: {
    rave: [
      "They loved it. THEY LOVED IT.\nI'm not crying. You're crying.",
      "Rave reviews. I knew it. I KNEW this script had it.",
    ],
    good: [
      "Good reviews. Solid. Respectable.\nI'll take respectable over flashy any day.",
      "The critics got it. Not all of them, but enough.",
    ],
    mixed: [
      "Mixed. The critics are divided.\nThat means it MEANT something. Safe films don't divide anyone.",
      "Some loved it, some hated it.\nHistory will sort them out.",
    ],
    bad: [
      "Don't read them. I'm serious. Don't read the reviews.\n...I read them. I need to lie down.",
      "The critics are wrong. They're ALWAYS wrong.\nExcept when they agree with me.",
    ],
  },
};

const ARTHUR = {
  greeting: {
    generic: [
      "Let's talk numbers. What kind of budget are we looking at?",
      "I've seen the concept. Now show me the math.",
    ],
    memory: [
      {
        check: (ctx) => ctx.film === 1,
        line: () => "You've picked a genre and a concept.\nNow comes the part that actually matters. The money.\nYou're new at this, Kid. You've got one option: small. Very small.",
        priority: 100,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.meta?.profit > 0;
        },
        line: () => "The last one made money. I'm in a good mood.\nDon't ruin it. What do you need?",
        priority: 80,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.detail === 'flop';
        },
        line: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          const title = v?.meta?.title || 'the last one';
          return `After ${title}, I've got board members calling.\nActual board members. On the phone. With me.\nWhatever you're about to ask for — be ready to defend it.`;
        },
        priority: 85,
      },
      {
        check: (ctx) => has(ctx.ledger, TAGS.BUDGET_BLUFF_FAIL),
        line: () => "Before we start — I check the numbers now. Personally.\nAfter last time, I don't take anyone's word for anything.\nEspecially yours.",
        priority: 90,
      },
      {
        check: (ctx) => {
          const s = verdictStreak(ctx.ledger);
          return s.count >= 2 && s.type === 'blockbuster';
        },
        line: () => "At this point, Kid, you've earned more trust than most people get in this town.\nThat's not a blank check. But it's close.",
        priority: 95,
      },
      {
        check: (ctx) => indieStreak(ctx.ledger) >= 3,
        line: () => "Indie again. You know, Kid, at some point you have to swing for the fences.\nShareholders don't invest in singles. They invest in home runs.",
        priority: 85,
      },
      {
        check: (ctx) => has(ctx.ledger, TAGS.BUDGET_DOWNGRADED),
        line: () => "Studio budget. Smart. Not reaching too far this time.\nI appreciate the... learning curve.",
        priority: 75,
      },
    ],
  },

  // ── FUNDING FORK (Two-Wallet System) ──
  funding_fork: {
    generic: [
      "Two paths. Someone else's money or yours.\nBoth have a price.",
      "Distributor money is safe. Your money is free.\nChoose your poison.",
    ],
  },

  distributor_present: {
    offers: [
      "I made some calls. Here's what came back.",
      "Two shops are interested. Don't get excited — read the terms.",
    ],
    good: [
      "This is a real offer. Don't insult them by haggling.",
      "They're putting real money on the table. Your move.",
    ],
    weak: [
      "It's not what you wanted. But it's what your track record gets you.",
      "Before you complain — remember your last film's numbers.",
    ],
    none: [
      "Nobody's biting. Not after what happened last time.",
      "I called everyone I know. The answer was the same: not right now.",
      "The market's cold on us. You'll have to self-fund this one.",
    ],
    rejected: [
      "Fine. Your money, your funeral.",
      "Your call, Kid. I'll let them know.",
    ],
  },

  self_fund: {
    generic: [
      "You want to use our own money? Fine.\nHow much are you willing to lose?",
      "Self-funding. Brave or stupid. We'll find out.",
    ],
    confirmed: [
      "Approved. It's your money. Don't waste it.",
      "Budget locked. This comes out of our pocket.\nEvery dollar you spend is a dollar we don't have.",
    ],
  },

  budget_react: {
    indie_approved: [
      "Fifteen million. No objections. Low risk, your call.",
      "Lean budget. I like lean. Lean means disciplined.",
    ],
    studio_prompt: [
      "Sixty million. That's real money.\nConvince me this isn't a vanity project.",
    ],
    blockbuster_prompt: [
      "A hundred and twenty million dollars.\nThat's more than your mother's house is worth.\nYou better have answers.",
    ],
    blockbuster_auto: [
      "Kid, if you'd asked two years ago, I'd have laughed.\nBut your track record speaks. Take it. Don't waste it.",
    ],
    approved: [
      "The numbers work. Don't make me regret this.",
      "Approved. Weekly reports. On my desk. Tuesday mornings.",
    ],
    denied: [
      "I can't justify that number.\nHere's what I CAN give you.",
    ],
    bluff_success: [
      "I checked. You're right. Approved.\nBut I'm watching the dailies.",
    ],
    bluff_caught: [
      "I checked that too. You're wrong.\nDon't try to play me, Kid. Budget: downgraded.",
    ],
  },

  greenlight: {
    positive: [
      "The numbers work. Don't make me regret this.",
      "I'll sign off. Tuesday reports.",
    ],
    cautious: [
      "I'm not confident. But I'm not saying no.\nThat's the most dangerous kind of yes.",
    ],
    memory: [
      {
        check: (ctx) => !has(ctx.ledger, TAGS.FILM_FLOP),
        line: () => "You haven't lost us a dollar yet.\nI'm starting to think you might actually know what you're doing.\nDon't tell anyone I said that.",
        priority: 80,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.detail === 'flop';
        },
        line: () => "I'm approving this against my better judgment.\nIf this one doesn't work, we need to have a different conversation.",
        priority: 85,
      },
    ],
  },

  // Referenced in Film 3+ — calls back to first building purchase
  first_building_callback: {
    writers:   "You put your first dollar into the Writers Bungalow.\nYou're a story person. I respect that.\nBut stories don't pay shareholders.",
    soundstage:"You put your first dollar into the Sound Stage.\nYou think big. I like that.\nJust make sure the big isn't bigger than the box office.",
    casting:   "You put your first dollar into the Casting Office.\nStar power. You understand what sells.\nNow prove you can back it up.",
    marketing: "You put your first dollar into Marketing.\nYou understand buzz.\nBut can you back it up with substance?",
    vfxlab:    "You put your first dollar into the VFX Lab.\nFuture-facing. Bold.\nExpensive. Very expensive.",
    posthouse: "You put your first dollar into the Post House.\nQuality in the edit. That's where movies are really made.\nI wouldn't have guessed that from a Boston kid.",
    commissary:"You put your first dollar into the Commissary.\nFed the crew first. That tells me something about you.\nSomething good, actually.",
    backlot:   "You put your first dollar into the Backlot.\nProduction value. You want to BUILD worlds.\nThat's either vision or ego. We'll find out.",
  },

  // ── MARKETING PHASE ──
  treasury_dip_react: {
    generic: [
      "Dipping into treasury for ad spend. I'm noting it.",
      "Company money for movie ads. Every dollar here is a dollar not building the studio.",
    ],
    memory: [
      {
        check: (ctx) => totalTreasuryDips(ctx.ledger) >= 3,
        line: () => "This is becoming a pattern. Three treasury dips and counting.\nAt what point do we call this a budget problem?",
        priority: 85,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.detail === 'flop';
        },
        line: () => "After the last film's numbers, every treasury dollar is precious.\nI'm letting you do this. I'm not happy about it.",
        priority: 80,
      },
    ],
  },

  // ── PREMIERE PHASE ──
  premiere_boxoffice: {
    profit: [
      "The numbers are in. We're in the black.\nThat's all I ever ask for.",
      "Profitable. Not spectacular, but profitable.\nI'll take it.",
    ],
    loss: [
      "We lost money. I need you to sit with that for a moment.",
      "Red ink. The board won't be happy.\nI'm not happy.",
    ],
    memory: [
      {
        check: (ctx) => {
          const s = verdictStreak(ctx.ledger);
          return s.count >= 2 && ['hit', 'blockbuster'].includes(s.type);
        },
        line: () => "Another profitable film. The streak continues.\nDon't let it make you reckless.",
        priority: 85,
      },
      {
        check: (ctx) => {
          const s = verdictStreak(ctx.ledger);
          return s.count >= 2 && s.type === 'flop';
        },
        line: () => "Two losses in a row.\nI'm not going to sugarcoat it. The board will have questions.",
        priority: 90,
      },
    ],
  },
};

const MAX = {
  greeting: {
    generic: [
      "Baby! I made some calls. People are VERY interested.",
      "Sweetheart! You are not going to BELIEVE who I found.",
      "Chief, I've got a lineup that's going to blow your mind.",
    ],
    memory: [
      {
        check: (ctx) => ctx.film === 1,
        line: () => "Baby! I've been on the phone ALL morning.\nWe're not exactly Paramount yet, so the A-list isn't picking up.\nBut I've got people. GOOD people. Hungry people.",
        priority: 100,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && ['blockbuster','hit'].includes(v.detail);
        },
        line: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          const title = v?.meta?.title || 'the last one';
          return `Baby! Ever since ${title}, my phone won't stop.\nEveryone wants in. I've got OPTIONS.`;
        },
        priority: 80,
      },
      {
        check: (ctx) => {
          const v = lastVerdict(ctx.ledger);
          return v && v.detail === 'flop';
        },
        line: () => "Okay so — slight hiccup. Some people are... hesitant.\nBUT. I found people. Great people. Trust me.",
        priority: 80,
      },
    ],
  },

  talent_present: {
    generic: [
      "Three options. Different vibes. Your call, chief.",
      "I've got range for you. Pick your poison.",
    ],
    rehired: (actor) =>
      `And look who's back — ${actor}. They specifically asked to work with you again.\nThat's loyalty, baby. You don't see that in this town.`,
    grudge: (actor, incident) =>
      `About ${actor}... I gotta be straight with you.\nThey're still sore about ${incident}.\nTheir agent said 'not unless things are different this time.'`,
  },

  demand: {
    generic: [
      "Small wrinkle. You know how it is at this level.",
      "Now, there's a catch. Nothing we can't handle, sweetheart.",
    ],
    denied_prev: (actor) =>
      `So... ${actor} has a condition. Same one as last time.\nPrice went up too. Something about 'respect.'`,
    accepted_prev: (actor) =>
      `Good news — ${actor} remembers how you handled things.\nThey're flexible on the details. Loyalty pays off.`,
    accepted: [
      "Done and done. They're in. They're happy. We're rolling.",
      "Smart move. Happy talent makes great movies.",
    ],
    denied: [
      "Your call, chief. I'll let them know.\nThey won't love it. But they'll survive.",
    ],
  },

  refused: {
    grudge: (actor) =>
      `Bad news. ${actor} passed. Wouldn't even read the script.\n'Creative differences.' Translation: they don't want to work with us.`,
    rep_low: (actor) =>
      `I tried, sweetheart. ${actor}'s people said we're 'not at the right level yet.'\nIt stings. I know. But we'll get there.`,
  },

  chemistry: (a, b, label) =>
    `Oh — oh oh oh. ${a} and ${b}?\nBaby. Those two have HISTORY.\n'${label}' — that's what the trades will call it.`,

  casting_done: [
    "That's a WRAP on casting. Look at this lineup.\nChef's kiss. Absolute chef's kiss.",
    "The cast is SET, baby. This is going to be something special.",
  ],

  walkout: (actor) =>
    `${actor} just locked themselves in their trailer.\nThey're on the phone with their agent. Crew's standing around.\nThey said — direct quote — 'Nothing changes at this studio.'`,

  muse: (actor) =>
    `Three films together. That's not a working relationship.\nThat's a partnership. Scorsese and De Niro.\nYou and ${actor}. It's a thing now.`,

  // ── PREMIERE PHASE ──
  premiere_verdict: {
    blockbuster: [
      "BABY! BLOCKBUSTER! My phone is EXPLODING.\nEveryone wants to work with us!",
      "That's a BLOCKBUSTER, sweetheart.\nRemember this feeling. This is what we do it for.",
    ],
    hit: [
      "A hit, baby! A genuine HIT.\nThe phones are going to ring tomorrow. Trust me.",
      "Hit! I knew it. I FELT it in the casting room.",
    ],
    'modest hit': [
      "Modest hit. Not bad, not bad.\nWe live to fight another day, sweetheart.",
      "It performed. Could've been bigger.\nBut hey — nobody got fired.",
    ],
    'cult classic': [
      "Cult classic. The wrong people saw it.\nBut the RIGHT people? They'll remember this forever.",
      "It didn't make money but it made a NAME.\nSometimes that's worth more. Sometimes.",
    ],
    flop: [
      "Deep breath. It happens to everyone.\nSpielberg flopped. Coppola flopped.\nYou're in good company.",
      "Bad result. I'm not going to pretend otherwise.\nBut I'm already making calls for the next one.",
    ],
  },
};

const DANNY = {
  // Danny's lines are shown as PVM text messages between films.
  // Indexed by trigger, not by beat.

  film1_before: "So you actually did it. Bought a studio. In California.\nYour mother's gonna kill you.",
  film1_before_2: "The bar's fine. Pipe burst last week but Mikey fixed it.\nDon't worry about us. Go make your movie.",
  film1_after_modest: "Saw the numbers. Not bad. Not great. But not bad.\nCouple guys at the bar said they liked it.\nThey were lying but it was nice of them.",
  film1_after_cult: "So nobody went but the people who went loved it.\nStory of your life, kid.",
  film2_before: "Your mom saw something in the trades about you 'expanding.'\nShe asked me what that means. I told her it's a swimming pool.\nShe believed me.",
  film3_nova: "Some kid with a YouTube channel is making movies now?\nThat's what we're competing with?\nJesus Christ, the industry really is over.",

  after_hit: [
    "Alright. Alright alright alright.\nDon't let it go to your head.\nActually, do. You've earned it.",
    "Packed house at Sullivan's for the premiere.\nWell, I put it on the TV. Same thing.",
  ],
  after_flop: [
    "Hey. It happens. Remember that thing we wrote in college\nabout the talking dog? THIS was better than that. You're fine.",
    "Bad weekend. I've had bad weekends.\nYou come back. You always come back.",
  ],
  after_blockbuster: [
    "Holy shit.\nI'm not gonna say I'm proud of you because that's weird.\nBut I am. Okay? I am.",
  ],

  // Memory-aware
  streamer_winning:    "The YouTube kid is winning.\nThat's... fine. That's totally fine.\n...\nIt's not fine.",
  streamer_losing:     "You're beating the internet kid.\nI don't know what that means but I'm proud of you.",
  nova_copies_genre:   "The streamer kid is making a {genre} movie now?\nShe literally stole your homework.",
  rehired_talent:      "Heard you're working with {actor} again.\nThat's good. Loyalty matters.\nSpeaking of loyalty, you missed three Sundays.",
  denied_demands:      "Word gets around even in Boston.\nPeople are saying you're 'difficult.'\nI said 'you should see him at Thanksgiving.'",
  player_doing_well:   "I'm not gonna say I'm impressed.\nBut I showed your mom the article.\nShe cut it out and put it on the fridge.\nRight next to my Little League trophy.",
  player_struggling:   "Listen. You've been down before.\nRemember sophomore year? 0 and 6. Worst season.\nAnd then what happened.\nYou know what happened. Do that.",
  brother_in_law_hit:  "Wait — Kevin's movie was a HIT?\nYour brother-in-law? Wedding Video Kevin?\nI take back everything I said. Almost everything.",
  moms_friend_flop:    "Your mother called the bar.\nShe heard about {title}.\nShe's... 'disappointed.'\nHer word. Not mine.",
  final_film_before:   "I know you're busy but...\nI've been thinking about writing again.\nMaybe not a script. Maybe just...\nI don't know. Forget I said anything.\nGo win.",
  // Funding-related
  self_fund_streak:    "You know you don't have to do everything yourself, right?\nThere are people whose whole job is writing checks.",
  treasury_dip_flop:   "How much of your own money did you put in?\n...don't tell me. I don't want to know.",
  distributor_blockbuster: "So someone else paid for it and you still get rich?\nI'm in the wrong business.",

  endgame_success:     "I flew out. I'm at LAX. Don't ask me why.\nPick me up. Terminal 4.\nBring In-N-Out. Animal style. Don't argue.",
  endgame_struggle:    "Come home for a weekend. That's all I'm asking.\nThe bar misses you. Your stool's still there.\nNobody sits in it. I won't let them.",
};

const NOVA = {
  intro:          "BREAKING: StreamVault backs first-time studio 'Nova Pictures'\nwith $200M content deal. Founder Nova Chase, 27, says\n'traditional Hollywood is a dinosaur.'",
  first_hit:      "Nova Pictures' debut opens strong. Critics mixed, audience loves it.\nChase calls it 'just the beginning.'",
  first_flop:     "Nova Pictures' debut underperforms.\nChase tweets 'we learn, we grow, we go again'",
  copies_genre:   "Nova Pictures announces {genre} project.\nIndustry insiders say Chase is 'studying Pacific Dreams' playbook.'",
  winning:        "Nova Pictures surpasses Pacific Dreams in quarterly revenue.\nChase: 'We respect what they've built. We're just building faster.'",
  struggling:     "Nova Pictures restructures after disappointing quarter.\nChase: 'We're refocusing on quality over quantity.'",
  endgame:        "Hey. I know we've never actually met.\nBut I wanted you to know — I watched your first film\nthe night before I pitched StreamVault on my studio.\nIt's the reason I thought I could do this.\nWhatever happens, thank you for that.\n— NC",
};

// ═══════════════════════════════════════════
// THE ENGINE — getDialogue()
// ═══════════════════════════════════════════

/**
 * Get the best dialogue line for a character + context.
 *
 * @param {string} character - 'carmen' | 'ricky' | 'arthur' | 'max' | 'danny'
 * @param {string} context - e.g. 'greeting', 'genre_react', 'greenlight'
 * @param {object} ctx - { ledger, film, lastFilm, genre, talent, ... }
 * @returns {string} The best line to display
 */
export function getDialogue(character, context, ctx = {}) {
  const banks = { carmen: CARMEN, ricky: RICKY, arthur: ARTHUR, max: MAX, danny: DANNY };
  const bank = banks[character];
  if (!bank) return '...';

  const section = bank[context];
  if (!section) return '...';

  // 1. Check memory lines (highest priority first)
  if (section.memory) {
    const candidates = section.memory
      .filter(m => m.check(ctx))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (candidates.length > 0) {
      const result = candidates[0].line(ctx);
      if (result) return result;
    }
  }

  // 2. Check for direct key matches (like genre_react.hot)
  if (ctx.key && section[ctx.key]) {
    const val = section[ctx.key];
    if (Array.isArray(val)) return pick(val);
    if (typeof val === 'string') return val;
    if (typeof val === 'function') return val(ctx);
  }

  // 3. Fall back to generic
  if (section.generic) return pick(section.generic);
  if (Array.isArray(section)) return pick(section);
  if (typeof section === 'string') return section;

  return '...';
}

/**
 * Get a Danny text message for the PVM.
 * Danny's messages are selected based on game state, not beat.
 */
export function getDannyText(ctx) {
  const { ledger, film } = ctx;

  // Scripted moments first
  if (film === 1 && !lastVerdict(ledger)) return DANNY.film1_before;
  if (film === 2 && !lastVerdict(ledger)) return DANNY.film2_before;
  if (film === 3) {
    if (!has(ledger, TAGS.NOVA_INTRODUCED)) return DANNY.film3_nova;
  }

  // Final film
  const totalBuildings = countTag(ledger, TAGS.BUILDING_BOUGHT) + countTag(ledger, TAGS.RIDE_PLACED);
  if (totalBuildings >= 5) return DANNY.final_film_before;

  // Memory-aware
  const v = lastVerdict(ledger);
  if (v) {
    if (v.detail === 'blockbuster') {
      // Check for brother-in-law blockbuster
      if (has(ledger, TAGS.BROTHER_IN_LAW) && byTag(ledger, TAGS.BROTHER_IN_LAW).some(e => e.film === v.film)) {
        return DANNY.brother_in_law_hit;
      }
      return pick(DANNY.after_blockbuster);
    }
    if (['hit'].includes(v.detail)) return pick(DANNY.after_hit);
    if (v.detail === 'flop') {
      if (has(ledger, TAGS.MOMS_FRIEND) && byTag(ledger, TAGS.MOMS_FRIEND).some(e => e.film === v.film)) {
        return DANNY.moms_friend_flop.replace('{title}', v.meta?.title || 'the movie');
      }
      return pick(DANNY.after_flop);
    }
  }

  // Streamer status
  if (has(ledger, TAGS.NOVA_INTRODUCED)) {
    if (has(ledger, TAGS.NOVA_HIT) && (!v || v.detail === 'flop')) return DANNY.streamer_winning;
    if (has(ledger, TAGS.NOVA_FLOP) && v && ['hit','blockbuster'].includes(v.detail)) return DANNY.streamer_losing;
  }

  // Funding patterns
  if (countTag(ledger, TAGS.FUNDING_SELF) >= 3) return DANNY.self_fund_streak;
  if (has(ledger, TAGS.TREASURY_DIP) && v && v.detail === 'flop') return DANNY.treasury_dip_flop;
  if (has(ledger, TAGS.FUNDING_DISTRIBUTOR) && v && v.detail === 'blockbuster') return DANNY.distributor_blockbuster;

  // Demand patterns
  if (countTag(ledger, TAGS.DEMAND_DENIED) >= 2) return DANNY.denied_demands;

  // Talent loyalty
  const rehires = byTag(ledger, TAGS.TALENT_REHIRED);
  if (rehires.length > 0) {
    return DANNY.rehired_talent.replace('{actor}', rehires[rehires.length - 1].actor);
  }

  // General state
  const flops = countTag(ledger, TAGS.FILM_FLOP);
  const hits = countTag(ledger, TAGS.FILM_HIT) + countTag(ledger, TAGS.FILM_BLOCKBUSTER);
  if (hits > flops + 1) return DANNY.player_doing_well;
  if (flops > hits + 1) return DANNY.player_struggling;

  return pick(DANNY.after_hit);
}

/**
 * Get a Nova Chase news headline for the PVM.
 */
export function getNovaHeadline(ctx) {
  const { ledger, film } = ctx;

  if (film === 3 && !has(ledger, TAGS.NOVA_INTRODUCED)) return NOVA.intro;

  if (has(ledger, TAGS.NOVA_COPIES_GENRE)) {
    const entry = lastByTag(ledger, TAGS.NOVA_COPIES_GENRE);
    return NOVA.copies_genre.replace('{genre}', entry?.detail || 'a');
  }

  const v = lastVerdict(ledger);
  const novaHits = countTag(ledger, TAGS.NOVA_HIT);
  const novaFlops = countTag(ledger, TAGS.NOVA_FLOP);

  if (novaHits > novaFlops) return NOVA.winning;
  if (novaFlops > novaHits) return NOVA.struggling;

  return null; // No nova news this round
}

// Export character data for PVM display
export const CHARACTERS = {
  carmen:  { title: 'CARMEN REYES', role: 'Head of Development', icon: '\u{1F469}\u200D\u{1F4BC}', short: 'The Numbers Girl' },
  ricky:   { title: 'RICKY NAVARRO', role: 'Head Writer', icon: '\u270D\uFE0F', short: 'The Scribe' },
  arthur:  { title: 'ARTHUR COVINGTON III', role: 'Chief Financial Officer', icon: '\u{1F4BC}', short: 'The Suit' },
  max:     { title: 'MAX FONTAINE', role: 'Head of Casting', icon: '\u{1F576}\uFE0F', short: 'The Connector' },
  danny:   { title: 'DANNY SULLIVAN', role: "Sullivan's Bar, Southie", icon: '\u{1F37A}', short: 'The Best Friend' },
  nova:    { title: 'NOVA CHASE', role: 'Founder, Nova Pictures', icon: '\u26A1', short: 'The Streamer' },
};

// Export raw banks for testing / inspection
export const DIALOGUE_BANKS = { CARMEN, RICKY, ARTHUR, MAX, DANNY, NOVA };
