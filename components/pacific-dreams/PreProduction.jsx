'use client';
// ─────────────────────────────────────────────────────────────
// PreProduction.jsx — Backlot Mogul 5-Beat Pre-Production
// Genre → Concept → Budget → Talent → Greenlight
// Runs INSIDE the SP-1000 CRT terminal shell (no hardware wrapper)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../../lib/pacific-dreams/store';
import { TAGS } from '../../lib/pacific-dreams/memoryLedger';
import { COLORS, MONO, DISPLAY } from './GameStyles';
import { getFirstGameRestrictions, rigFirstGameTrends } from '../../lib/pacific-dreams/consequenceEngine';

// ═══════════════════════════════════════════
// DATA (inline — extract to talentData/pitchData later)
// ═══════════════════════════════════════════

const TEAM = {
  development: { title:'THE NUMBERS GIRL', role:'Head of Development', icon:'👩‍💼',
    lines: {
      greeting:["Morning, boss. I crunched last weekend's numbers.","Got the latest audience data. You'll want to see this.","The trades are buzzing. Here's what I'm hearing."],
      hot:["The audience is starving for this. Smart move.","Timing couldn't be better. This genre is on fire.","The data backs you up. Green across the board."],
      cold:["Gutsy. The market's ice cold on this right now.","Going against the grain? I respect it. Risky though.","The numbers say no. But numbers aren't everything."],
      warm:["Solid. Not flashy, but there's an audience.","Steady pick. Won't blow up, won't bomb.","Safe. Sometimes safe is smart."],
      greenlight:["I believe in this one. Let's make it happen.","The package is strong. I'd greenlight it.","Everything checks out on my end. Your call, boss."],
    }},
  writer: { title:'THE SCRIBE', role:'Head Writer', icon:'✍️',
    lines: {
      greeting:["I've been up all night. Three pitches. All gold.","The muse visited. I've got ideas.","I see the movie already. Let me paint the picture."],
      react:["THAT'S the one. I can feel it in my bones.","Yes. YES. This is the film we were born to make.","Good eye. That's got award season written all over it."],
    }},
  finance: { title:'THE SUIT', role:'Chief Financial Officer', icon:'💼',
    lines: {
      greeting:["Let's talk numbers. What kind of budget are we looking at?","I've seen the concept. Now show me the math."],
      approved:["The numbers work. Don't make me regret this.","Approved. But I want weekly reports on my desk."],
      denied:["I can't justify that number. Here's what I CAN give you.","That's a no from me. But I'll meet you partway."],
      repHigh:"Your track record speaks for itself. Take what you need.",
      indieApproved:["Lean budget. No objections.","Indie range? Fine. Low risk, your call."],
    }},
  agent: { title:'THE CONNECTOR', role:'Talent Agent', icon:'🕶️',
    lines: {
      greeting:["Baby! I made some calls. Got people VERY interested.","Sweetheart, you are not going to BELIEVE who I found."],
      present:["Three options. All different vibes. Your call.","I've got range for you. Pick your poison."],
      demand:["Now, there's a catch. You know how it is at this level.","Small wrinkle. Nothing we can't handle, sweetheart."],
      refusal:["Bad news, baby. They passed. Said the project isn't right.","No dice. But listen, I've got someone BETTER."],
      chemistry:["Oh, and heads up — these two have HISTORY together.","Put these two in a room? Magic happens."],
      done:["That's a WRAP on casting, baby. What a lineup.","Chef's kiss. This ensemble? Awards bait."],
    }},
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const GENRES = [
  { id:'action', icon:'💥', label:'Action' },
  { id:'horror', icon:'👻', label:'Horror' },
  { id:'comedy', icon:'😂', label:'Comedy' },
  { id:'drama', icon:'🎭', label:'Drama' },
  { id:'romance', icon:'💕', label:'Romance' },
  { id:'scifi', icon:'🚀', label:'Sci-Fi' },
  { id:'animated', icon:'🎨', label:'Animated' },
];

const PITCHES = {
  action: [
    { title:'LETHAL PROTOCOL', logline:'A disgraced agent goes rogue to stop an arms deal in 24 hours.', tone:'Gritty', qMod:5, scene:'neon-city' },
    { title:'MAXIMUM THUNDER', logline:'An ex-soldier fights through a hijacked skyscraper to save hostages.', tone:'Fun', qMod:3, scene:'skyscraper' },
    { title:'RED HIGHWAY', logline:'Two fugitives race across the desert with stolen evidence.', tone:'Tense', qMod:4, scene:'desert' },
  ],
  horror: [
    { title:'THE HOLLOWING', logline:'A family moves into a farmhouse where the previous owners never actually left.', tone:'Slow-burn', qMod:6, scene:'farmhouse' },
    { title:'SLEEP STUDY', logline:'Overnight test subjects discover the lab is running a very different experiment.', tone:'Clinical', qMod:5, scene:'laboratory' },
    { title:'ROOM SERVICE', logline:"Hotel guests check in. The hotel doesn't let them check out.", tone:'Claustro', qMod:5, scene:'hotel' },
  ],
  comedy: [
    { title:'BEST MAN DOWN', logline:'The best man loses the groom on the morning of the wedding.', tone:'Chaotic', qMod:4, scene:'wedding' },
    { title:'HOA FROM HELL', logline:'A family discovers the neighborhood association is a cult.', tone:'Satire', qMod:6, scene:'suburbs' },
    { title:'REPLY ALL', logline:'An email meant for one person accidentally goes to the entire company.', tone:'Workplace', qMod:4, scene:'office' },
  ],
  drama: [
    { title:'THE WEIGHT OF SOUND', logline:'A concert pianist loses hearing in one ear before the performance of a lifetime.', tone:'Intimate', qMod:7, scene:'concert-hall' },
    { title:'ESTUARY', logline:'Three generations of women reunite at a crumbling family home to settle the estate.', tone:'Family', qMod:5, scene:'old-house' },
    { title:'LAST WINTER', logline:"An aging boxer returns for one final fight he knows he can't win.", tone:'Melancholy', qMod:5, scene:'boxing-ring' },
  ],
  romance: [
    { title:'PLATFORM 9', logline:'Two strangers keep almost meeting at a train station over the course of a year.', tone:'Wistful', qMod:5, scene:'train-station' },
    { title:'MIDNIGHT BAKERY', logline:'An insomniac falls for the person who runs the only bakery open at 2 AM.', tone:'Cozy', qMod:6, scene:'bakery' },
    { title:'SECOND DRAFT', logline:'Two divorced co-authors must write one final book together.', tone:'Bittersweet', qMod:5, scene:'bookshop' },
  ],
  scifi: [
    { title:'THE FOLD', logline:'A physicist discovers that folding spacetime creates a copy of yourself that wants you dead.', tone:'Cerebral', qMod:7, scene:'lab-portal' },
    { title:'COLONY 7', logline:'The last Mars colony receives a signal from Earth. Earth has been silent for 40 years.', tone:'Lonely', qMod:6, scene:'mars-base' },
    { title:'SYNTHETIC', logline:"A robot therapist starts developing real emotions. Her patients don't believe her.", tone:'Philosophical', qMod:5, scene:'android' },
  ],
  animated: [
    { title:'THE LAST CRAYON', logline:'A forgotten crayon at the bottom of the box goes on a quest to be used one more time.', tone:'Heartwarming', qMod:5, scene:'art-supplies' },
    { title:'SKY SHEPHERDS', logline:'A young cloud herder must protect her flock from a storm that eats other clouds.', tone:'Whimsical', qMod:6, scene:'sky-world' },
    { title:'THE UNDERSTUDY', logline:'A puppet in a children\'s show realizes the audience can see the strings.', tone:'Meta', qMod:7, scene:'puppet-stage' },
  ],
};

const DIRECTORS = [
  { archetype:'The Auteur', tier:'a', icon:'🎬', q:28, h:12, cost:14e6, demand:{ label:'Demands Final Cut', desc:'Full creative control. No studio notes.', qBonus:12, hPen:-5 }, refuseBelow:5, tagline:'Visionary genius. Impossible to work with.', quote:'"I don\'t make movies. I make experiences."' },
  { archetype:'The Blockbuster King', tier:'a', icon:'💥', q:18, h:28, cost:16e6, demand:{ label:'Demands 15% More Budget', desc:'Needs more money for "the vision."', costMult:1.15, qBonus:8 }, refuseBelow:3, tagline:'Every film opens #1. Every film goes BOOM.', quote:'"Bigger. Louder. More explosions."' },
  { archetype:'The Festival Darling', tier:'b', icon:'🎭', q:20, h:5, cost:5e6, demand:null, refuseBelow:-5, tagline:'Sundance favorite. Critics love her.', quote:'"Art isn\'t supposed to be comfortable."' },
  { archetype:'The Journeyman', tier:'b', icon:'🎥', q:14, h:8, cost:4e6, demand:null, refuseBelow:-99, tagline:'Reliable. On time. On budget. Never spectacular.', quote:'"I just show up, do the work, and deliver."' },
  { archetype:'The Wunderkind', tier:'c', icon:'🧒', q:8, h:4, cost:800e3, demand:null, refuseBelow:-99, tagline:'Film school prodigy. Zero experience.', quote:'"I\'ve studied every Kubrick frame."' },
  { archetype:'Your Brother-in-Law', tier:'no', icon:'🤷', q:2, h:0, cost:50e3, demand:null, refuseBelow:-99, tagline:'Shoots weddings. Owns a drone.', quote:'"I watched a YouTube tutorial. We\'re good."' },
];
const LEADS = [
  { archetype:'The Movie Star', tier:'a', icon:'⭐', q:20, h:30, cost:20e6, demand:{ label:'Demands Top Billing', desc:'Name above the title. First in every trailer.', hBonus:10 }, refuseBelow:5, tagline:'Opens any movie. 40M followers.', quote:'"I don\'t audition. I arrive."' },
  { archetype:'The Method Actor', tier:'a', icon:'🎭', q:30, h:15, cost:15e6, demand:{ label:'Demands Extra Prep Time', desc:'Needs 3 months to "become" the character.', qBonus:15, hPen:-8 }, refuseBelow:3, tagline:'Disappears into every role.', quote:'"Don\'t call me by my name. I AM the character."' },
  { archetype:'The It Girl', tier:'b', icon:'💫', q:14, h:18, cost:6e6, demand:null, refuseBelow:-3, tagline:'Just had her breakout moment.', quote:'"I\'m being very selective about my next project."' },
  { archetype:'The Action Hunk', tier:'b', icon:'💪', q:10, h:16, cost:5e6, demand:null, refuseBelow:-99, tagline:'Abs. Jawline. Does his own stunts.', quote:'"I didn\'t eat carbs for six months for this."' },
  { archetype:'The Theater Kid', tier:'c', icon:'🎪', q:8, h:2, cost:500e3, demand:null, refuseBelow:-99, tagline:'Shakespeare trained. Camera-shy.', quote:'"The STAGE is where art LIVES."' },
  { archetype:'The Influencer', tier:'no', icon:'📱', q:1, h:6, cost:100e3, demand:null, refuseBelow:-99, tagline:'10M TikTok followers. Zero acting credits.', quote:'"Can I film a behind-the-scenes?"' },
];
const SUPPORT = [
  { archetype:'The Scene Stealer', tier:'a', icon:'🌟', q:22, h:18, cost:10e6, demand:{ label:'Demands More Screen Time', desc:'Wants the role expanded. Will overshadow lead.', qBonus:10, hPen:-5 }, refuseBelow:3, tagline:'They\'ll be the one everyone remembers.', quote:'"Every scene I\'m in becomes the best scene."' },
  { archetype:'The Character Actor', tier:'b', icon:'🎩', q:16, h:5, cost:3e6, demand:null, refuseBelow:-99, tagline:'You\'ve seen their face in everything.', quote:'"I\'ve done 47 films. You\'ve probably seen none."' },
  { archetype:'The Comedian', tier:'b', icon:'😂', q:8, h:14, cost:4e6, demand:null, refuseBelow:-99, tagline:'Stand-up crossover. Improvises every take.', quote:'"The script is just a suggestion, right?"' },
  { archetype:'The Nepo Baby', tier:'c', icon:'👶', q:6, h:10, cost:1.5e6, demand:null, refuseBelow:-99, tagline:'Famous parents. Trying to be taken seriously.', quote:'"I want to earn this on my OWN merits."' },
  { archetype:'The Local Hire', tier:'c', icon:'🏠', q:5, h:1, cost:200e3, demand:null, refuseBelow:-99, tagline:'Community theater legend. First film role.', quote:'"I just want to do a good job."' },
  { archetype:'Your Mom\'s Friend', tier:'no', icon:'👵', q:1, h:0, cost:25e3, demand:null, refuseBelow:-99, tagline:'"She did improv in the 80s." — your mother', quote:'"I was in a commercial once! For a mattress store!"' },
];

const CHEMISTRY = [
  { pair:['The Auteur','The Method Actor'], label:'Obsessive Brilliance', icon:'🧠', q:15, h:0, flavor:'Two perfectionists locked in a room. Terrifying. Beautiful.' },
  { pair:['The Blockbuster King','The Movie Star'], label:'Box Office Dynamite', icon:'💣', q:0, h:20, flavor:'The biggest director + the biggest star = the biggest opening.' },
  { pair:['The Blockbuster King','The Method Actor'], label:'Creative Clash', icon:'⚡', q:-5, h:12, flavor:'They hate each other. The tabloids love it.' },
  { pair:['The Festival Darling','The It Girl'], label:'Indie Breakthrough', icon:'🌱', q:12, h:8, flavor:'The director who finds the moment. The star who lives it.' },
  { pair:['The Movie Star','The Scene Stealer'], label:'Ego War', icon:'👑', q:-3, h:15, flavor:'Two alphas. One screen. Can\'t look away.' },
  { pair:['The Action Hunk','The Comedian'], label:'Buddy Movie Magic', icon:'🤝', q:10, h:10, flavor:'The straight man and the funny one.' },
  { pair:['The Wunderkind','The Theater Kid'], label:'Hungry & Raw', icon:'🔥', q:8, h:0, flavor:'No budget, no ego, no safety net. Just ambition.' },
  { pair:['The Auteur','The Scene Stealer'], label:'Awards Bait', icon:'🏆', q:18, h:5, flavor:'The kind of pairing that makes Oscar voters weep.' },
];

const NEGOT_Q = {
  studio: [
    { prompt:"That's a significant outlay. Why should the board say yes?", options:[
      { text:"The market data backs us up. This genre is hot right now.", cond:'market_hot', ok:"The numbers check out. Approved.", fail:"The data says otherwise. You sure?" },
      { text:"My track record speaks for itself.", cond:'rep_pos', ok:"Fair point. Your films have been performing.", fail:"What track record? Let's not get ahead of ourselves." },
      { text:"The talent attached makes this a guaranteed draw.", cond:'bluff', ok:"Star power does open wallets. Alright.", fail:"I called the agent. Nobody's attached yet. Don't play me." },
    ]},
  ],
  blockbuster: [
    { prompt:"A hundred and twenty million. Convince me this isn't a vanity project.", options:[
      { text:"This genre is ON FIRE right now.", cond:'market_hot', ok:"I've seen the same data. The window is open. Fine.", fail:"The market says the opposite. Come back with real data." },
      { text:"I've built this studio from nothing. Trust the vision.", cond:'rep_high', ok:"You've earned the benefit of the doubt.", fail:"Vision is nice. Profits are nicer. I need more." },
      { text:"The competition has nothing this quarter. We own the release.", cond:'bluff', ok:"I checked — you're right. Clear runway. Approved.", fail:"Two tentpoles open the same week. Did you even check?" },
    ]},
    { prompt:"Even if I approve this, the board will want to know: what's the ceiling?", options:[
      { text:"Blockbusters in this genre regularly clear $300M worldwide.", cond:'market_warm', ok:"The upside is certainly there. I'll sign off.", fail:"Not in this climate. Those days are behind us." },
      { text:"Franchise potential. This isn't one movie — it's a universe.", cond:'always', ok:"Now you're speaking my language. Sequels. Merch. Parks.", fail:null },
      { text:"The talent lineup alone guarantees opening weekend.", cond:'bluff', ok:"Star power is worth something. Fine. Greenlit.", fail:"What talent? I don't see names that move the needle." },
    ]},
  ],
};

// ═══════════════════════════════════════════
// MARKET TREND GENERATOR
// ═══════════════════════════════════════════

function genTrends(isFirstGame) {
  if (isFirstGame) return rigFirstGameTrends();
  const ids = GENRES.map(g => g.id).sort(() => Math.random() - 0.5);
  const t = {};
  ids.forEach((id, i) => { t[id] = i < 2 ? 'hot' : i < 4 ? 'warm' : 'cold'; });
  return t;
}

// ═══════════════════════════════════════════
// PVM CONTENT RENDERERS
// ═══════════════════════════════════════════

function PVMScreen({ content, on }) {
  if (!on) return <div style={{ width:'100%', height:'100%', background:'#030303' }} />;
  if (!content) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ fontFamily:DISPLAY, fontSize:8, color:'#282828', letterSpacing:3 }}>PACIFIC DREAMS</div>
    </div>
  );

  if (content.type === 'character') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:3 }}>
      <div style={{ fontSize:32, lineHeight:1, filter:'drop-shadow(0 0 6px rgba(255,255,255,0.1))' }}>{content.icon}</div>
      <div style={{ fontFamily:MONO, fontSize:9, color:'#ddd', textAlign:'center', letterSpacing:1, textShadow:'0 0 5px rgba(255,255,255,0.2)' }}>{content.title}</div>
      {content.role && <div style={{ fontFamily:MONO, fontSize:7, color:'#666' }}>{content.role}</div>}
    </div>
  );

  if (content.type === 'market') return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:'100%', padding:'6px 10px', gap:3 }}>
      <div style={{ fontFamily:MONO, fontSize:6, color:'#444', letterSpacing:2 }}>MARKET</div>
      {Object.entries(content.trends || {}).slice(0, 6).map(([g, l]) => {
        const c = l === 'hot' ? COLORS.red : l === 'warm' ? COLORS.amber : COLORS.blue;
        const w = l === 'hot' ? '85%' : l === 'warm' ? '50%' : '20%';
        return <div key={g} style={{ display:'flex', alignItems:'center', gap:3 }}>
          <div style={{ fontFamily:MONO, fontSize:5, color:'#777', width:24, textTransform:'uppercase' }}>{g.slice(0, 4)}</div>
          <div style={{ flex:1, height:4, background:'#111', borderRadius:1, overflow:'hidden' }}>
            <div style={{ height:'100%', width:w, background:c, borderRadius:1, transition:'width 0.8s' }} />
          </div>
        </div>;
      })}
    </div>
  );

  if (content.type === 'scene') {
    const scenes = {
      'neon-city':{e:'🌃',bg:'#0a0a2a'},'farmhouse':{e:'🏚️',bg:'#0a1a0a'},'mars-base':{e:'🔴',bg:'#1a0505'},
      'laboratory':{e:'🔬',bg:'#050510'},'wedding':{e:'💒',bg:'#2a2a1a'},'concert-hall':{e:'🎹',bg:'#0a0020'},
      'bakery':{e:'🥐',bg:'#2a1a0a'},'bookshop':{e:'📖',bg:'#1a0a0a'},'lab-portal':{e:'🌀',bg:'#0a0a2a'},
      'sky-world':{e:'☁️',bg:'#1a2a3a'},'puppet-stage':{e:'🎭',bg:'#2a1a2a'},'art-supplies':{e:'🖍️',bg:'#2a2a1a'},
      'default':{e:'🎬',bg:'#0a0a0a'},
    };
    const s = scenes[content.scene] || scenes['default'];
    return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', background:s.bg }}>
      <div style={{ fontSize:28, lineHeight:1 }}>{s.e}</div>
      <div style={{ fontFamily:MONO, fontSize:7, color:'#666', marginTop:3, letterSpacing:1 }}>{(content.label || '').toUpperCase()}</div>
    </div>;
  }

  if (content.type === 'money') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ fontFamily:MONO, fontSize:7, color:'#555', letterSpacing:2, marginBottom:3 }}>BUDGET</div>
      <div style={{ fontFamily:MONO, fontSize:18, fontWeight:700, color:COLORS.green, textShadow:`0 0 10px ${COLORS.green}44` }}>{content.amount}</div>
    </div>
  );

  if (content.type === 'greenlight') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ fontSize:24, lineHeight:1 }}>🎬</div>
      <div style={{ fontFamily:MONO, fontSize:8, color:COLORS.green, marginTop:3, letterSpacing:1, textShadow:`0 0 6px ${COLORS.green}44` }}>GREENLIGHT</div>
    </div>
  );

  return null;
}

function PVMMonitor({ on, content, onToggle }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(null);
  useEffect(() => {
    const k = JSON.stringify(content);
    if (prev.current && k !== prev.current) { setFlash(true); setTimeout(() => setFlash(false), 150); }
    prev.current = k;
  }, [content]);

  return <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'linear-gradient(180deg,#222224 0%,#1a1a1c 25%,#131315 65%,#0e0e10 100%)', borderRadius:5, border:'1px solid #2a2a2c', boxShadow:'0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.03)', padding:'4px 5px 0' }}>
      <div style={{ width:'100%', height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)', marginBottom:3 }} />
      <div style={{ flex:1, background:'#050507', borderRadius:2, padding:2, boxShadow:'inset 0 2px 6px rgba(0,0,0,0.9),0 1px 0 rgba(255,255,255,0.02)' }}>
        <div style={{ width:'100%', height:'100%', background:'#000', borderRadius:1, overflow:'hidden', position:'relative' }}>
          <div style={{ width:'100%', height:'100%', position:'relative', zIndex:1, opacity:flash ? 0 : 1, transition:'opacity 0.05s' }}>
            <PVMScreen content={content} on={on} />
          </div>
          {on && <div style={{ position:'absolute', inset:0, zIndex:8, pointerEvents:'none', background:'repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,0.1) 1px,rgba(0,0,0,0.1) 2px)', mixBlendMode:'multiply' }} />}
          {on && <div style={{ position:'absolute', inset:0, zIndex:10, pointerEvents:'none', background:'radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.3) 100%)' }} />}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 3px' }}>
        <div style={{ display:'flex', gap:2.5 }}>{[0,1,2].map(i => <div key={i} style={{ width:2, height:2, borderRadius:'50%', background:'#1a1a1a' }} />)}</div>
        <div style={{ fontFamily:"'Helvetica Neue',Arial,sans-serif", fontSize:7, fontWeight:700, letterSpacing:3, color:on ? '#4a4a4a' : '#222', transition:'all 0.5s' }}>SE</div>
        <div onClick={e => { e.stopPropagation(); onToggle?.(); }} style={{ cursor:'pointer', padding:1 }}>
          <div style={{ width:4, height:4, borderRadius:'50%', background:on ? COLORS.green : '#1a1100', boxShadow:on ? `0 0 3px ${COLORS.green},0 0 8px ${COLORS.green}66` : 'none', transition:'all 0.3s', border:`1px solid ${on ? '#2a8a0a' : '#1a1a1a'}` }} />
        </div>
      </div>
    </div>
  </div>;
}

function ScoreBar({ funds, reputation, filmCount }) {
  const fmt = n => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;
  return <div style={{ height:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'8px 12px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
    <div>
      <div style={{ fontFamily:DISPLAY, fontSize:10, fontWeight:900, color:'#fff', letterSpacing:2 }}>PACIFIC DREAMS</div>
      <div style={{ fontFamily:MONO, fontSize:8, color:'rgba(255,255,255,0.3)', marginTop:1 }}>Film #{filmCount + 1}</div>
    </div>
    <div style={{ display:'flex', gap:0, alignItems:'flex-end' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:MONO, fontSize:6, color:'rgba(255,255,255,0.2)', letterSpacing:1 }}>FUNDS</div>
        <div style={{ fontFamily:MONO, fontSize:15, fontWeight:700, color:COLORS.green, textShadow:`0 0 6px ${COLORS.green}44`, marginTop:1 }}>{fmt(funds)}</div>
      </div>
      <div style={{ width:1, height:22, background:'rgba(255,255,255,0.05)', margin:'0 8px' }} />
      <div>
        <div style={{ fontFamily:MONO, fontSize:6, color:'rgba(255,255,255,0.2)', letterSpacing:1 }}>REP</div>
        <div style={{ fontFamily:MONO, fontSize:15, fontWeight:700, color:reputation >= 0 ? COLORS.orange : COLORS.red, marginTop:1 }}>{reputation >= 0 ? `+${reputation}` : reputation}</div>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════
// TYPEWRITER TEXT
// ═══════════════════════════════════════════
function TypewriterText({ text, speed = 25, onDone }) {
  const [shown, setShown] = useState('');
  const idx = useRef(0);
  useEffect(() => {
    setShown(''); idx.current = 0;
    const t = setInterval(() => {
      idx.current++;
      if (idx.current >= text.length) { clearInterval(t); onDone?.(); }
      setShown(text.slice(0, idx.current));
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span>{shown}<span style={{ opacity:0.4, animation:'blink 0.8s step-end infinite' }}>▌</span></span>;
}

// ═══════════════════════════════════════════
// CHARACTER DIALOGUE BOX
// ═══════════════════════════════════════════
function DialogueBox({ character, line, children }) {
  return <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.04)', flexShrink:0 }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
      <div style={{ fontSize:18 }}>{character.icon}</div>
      <div>
        <div style={{ fontFamily:MONO, fontSize:9, color:COLORS.orange, letterSpacing:1 }}>{character.title}</div>
        <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.3)' }}>{character.role}</div>
      </div>
    </div>
    <div style={{ fontFamily:MONO, fontSize:10, color:'rgba(255,255,255,0.55)', lineHeight:1.6, fontStyle:'italic', minHeight:32 }}>
      "<TypewriterText text={line} />"
    </div>
    {children}
  </div>;
}

// ═══════════════════════════════════════════
// BEAT PROGRESS DOTS
// ═══════════════════════════════════════════
function BeatDots({ current, labels }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'6px 0', borderTop:'1px solid rgba(255,255,255,0.04)', flexShrink:0 }}>
    {labels.map((l, i) => <div key={i} style={{ display:'flex', alignItems:'center', gap:3 }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:i < current ? COLORS.orange : i === current ? '#fff' : 'rgba(255,255,255,0.1)', transition:'all 0.3s', boxShadow:i === current ? '0 0 6px rgba(255,255,255,0.3)' : 'none' }} />
      <div style={{ fontFamily:MONO, fontSize:6, color:i <= current ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', letterSpacing:0.5 }}>{l}</div>
    </div>)}
  </div>;
}

// ═══════════════════════════════════════════
// TALENT CARD
// ═══════════════════════════════════════════
function TalentCard({ talent, selected, refused, onSelect }) {
  const tierColor = { a:COLORS.orange, b:COLORS.amber, c:'#888', no:'#555' };
  const tierLabel = { a:'A-LIST', b:'B-LIST', c:'C-LIST', no:'NO-NAME' };
  const fmt = n => n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

  return <div onClick={() => !refused && onSelect?.(talent)} style={{
    padding:'10px 12px', borderRadius:8, cursor:refused ? 'not-allowed' : 'pointer',
    background:selected ? `${COLORS.orange}1a` : refused ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
    border:`1px solid ${selected ? `${COLORS.orange}4d` : refused ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'}`,
    opacity:refused ? 0.4 : 1, transition:'all 0.15s',
  }}>
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ fontSize:22 }}>{talent.icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:MONO, fontSize:10, color:selected ? '#fff' : 'rgba(255,255,255,0.7)', letterSpacing:0.5 }}>{talent.archetype}</div>
        <div style={{ fontFamily:MONO, fontSize:7, color:tierColor[talent.tier], letterSpacing:1 }}>{tierLabel[talent.tier]} · {fmt(talent.cost)}</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontFamily:MONO, fontSize:9, color:COLORS.green }}>Q+{talent.q}</div>
        <div style={{ fontFamily:MONO, fontSize:9, color:COLORS.amber }}>H+{talent.h}</div>
      </div>
    </div>
    <div style={{ fontFamily:MONO, fontSize:8, color:'rgba(255,255,255,0.3)', marginTop:4, fontStyle:'italic' }}>{talent.tagline}</div>
    {talent.demand && <div style={{ fontFamily:MONO, fontSize:7, color:COLORS.red, marginTop:3 }}>⚠️ {talent.demand.label}</div>}
    {refused && <div style={{ fontFamily:MONO, fontSize:7, color:COLORS.red, marginTop:3 }}>✗ PASSED ON YOUR PROJECT</div>}
  </div>;
}

// ═══════════════════════════════════════════
// MAIN PREPRODUCTION COMPONENT
// ═══════════════════════════════════════════

export default function PreProduction() {
  // ── Store subscriptions ──
  const funds = useStore(s => s.funds);
  const reputation = useStore(s => s.reputation);
  const filmNumber = useStore(s => s.filmNumber);
  const isFirstGame = useStore(s => s.isFirstGame);
  const ledger = useStore(s => s.ledger);
  const setPhase = useStore(s => s.setPhase);
  const setCurrentFilm = useStore(s => s.setCurrentFilm);
  const adjustQuality = useStore(s => s.adjustQuality);
  const adjustHype = useStore(s => s.adjustHype);
  const logMemory = useStore(s => s.logMemory);
  const hireTalent = useStore(s => s.hireTalent);
  const acceptDemand = useStore(s => s.acceptDemand);
  const denyDemand = useStore(s => s.denyDemand);
  const hasBuilding = useStore(s => s.hasBuilding);

  // ── First-game restrictions ──
  const builtBuildings = useStore(s => s.getBuiltBuildings)();
  const restrictions = isFirstGame ? getFirstGameRestrictions(filmNumber, builtBuildings) : null;

  const [pvmOn, setPvmOn] = useState(true);

  // PreProd state
  const [beat, setBeat] = useState(0); // 0=market,1=concept,2=money,3=talent,4=greenlight
  const [trends] = useState(() => genTrends(isFirstGame));
  const [genre, setGenre] = useState(null);
  const [pitchOptions, setPitchOptions] = useState([]);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [rating, setRating] = useState(null);
  const [budgetTier, setBudgetTier] = useState(null);
  const [negotiating, setNegotiating] = useState(null);
  const [negoResult, setNegoResult] = useState(null);
  const [negoStep, setNegoStep] = useState(0);
  const [cast, setCast] = useState({ director:null, lead:null, support:null });
  const [castingRole, setCastingRole] = useState('director');
  const [demandPopup, setDemandPopup] = useState(null);
  const [chemistryFound, setChemistryFound] = useState([]);
  const [greenlightFlash, setGreenlightFlash] = useState(false);

  // PVM content
  const [pvmContent, setPvmContent] = useState({ type:'character', icon:TEAM.development.icon, title:TEAM.development.title, role:TEAM.development.role });

  // Dialogue
  const [dialogue, setDialogue] = useState(pick(TEAM.development.lines.greeting));

  const BEAT_LABELS = ['MARKET','CONCEPT','MONEY','TALENT','GREEN'];

  // ─── Helpers ───
  const trendColor = t => t === 'hot' ? COLORS.red : t === 'warm' ? COLORS.amber : COLORS.blue;
  const trendIcon = t => t === 'hot' ? '🔥 HOT' : t === 'warm' ? '── WARM' : '🧊 COLD';
  const fmt = n => n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

  // ─── Tier locking (first-game + buildings) ───
  function isTierLocked(tier) {
    if (restrictions?.talentTiersLocked?.includes(tier)) return true;
    if (tier === 'a' && !hasBuilding('casting')) return true;
    return false;
  }
  function isBudgetLocked(tier) {
    if (restrictions?.budgetLocked?.includes(tier)) return true;
    if (tier === 'blockbuster' && !hasBuilding('soundstage')) return true;
    return false;
  }
  function isGenreLocked(genreId) {
    if (genreId === 'scifi' && !hasBuilding('vfxlab')) return true;
    return false;
  }

  // ─── BEAT 0: Market ───
  function selectGenre(g) {
    setGenre(g);
    const trend = trends[g.id];
    setDialogue(pick(TEAM.development.lines[trend] || TEAM.development.lines.warm));
    const pool = (PITCHES[g.id] || PITCHES.action).sort(() => Math.random() - 0.5).slice(0, 2);
    // If Writers Bungalow built, show 3 pitches
    if (hasBuilding('writers')) {
      const full = (PITCHES[g.id] || PITCHES.action).sort(() => Math.random() - 0.5);
      setPitchOptions(full);
    } else {
      setPitchOptions(pool);
    }
    setPvmContent({ type:'scene', scene:pool[0]?.scene || 'default', label:g.label });

    // ── Log memory ──
    logMemory(filmNumber, 'market', TAGS.GENRE_PICKED, { detail: g.id, meta: { trend } });
    if (trend === 'cold') {
      logMemory(filmNumber, 'market', TAGS.GENRE_COLD_PICK, { detail: g.id });
    }

    setTimeout(() => setBeat(1), 800);
  }

  // ─── BEAT 1: Concept ───
  function selectPitch(p) {
    setSelectedPitch(p);
    setDialogue(pick(TEAM.writer.lines.react));
    setPvmContent({ type:'scene', scene:p.scene, label:p.title });

    // ── Log memory ──
    logMemory(filmNumber, 'concept', TAGS.PITCH_CHOSEN, { detail: p.title, meta: { tone: p.tone, qMod: p.qMod } });
  }
  function selectRating(r) {
    setRating(r);
    setPvmContent({ type:'character', icon:TEAM.finance.icon, title:TEAM.finance.title, role:TEAM.finance.role });
    setDialogue(pick(TEAM.finance.lines.greeting));

    // ── Log memory ──
    logMemory(filmNumber, 'concept', TAGS.RATING_CHOSEN, { detail: r });

    setTimeout(() => setBeat(2), 600);
  }

  // ─── BEAT 2: Money ───
  function selectBudget(tier) {
    if (tier === 'indie') {
      setBudgetTier('indie');
      setDialogue(pick(TEAM.finance.lines.indieApproved));
      setPvmContent({ type:'money', amount:'$15M' });

      // ── Log memory ──
      logMemory(filmNumber, 'money', TAGS.BUDGET_TIER, { detail: 'indie' });
      logMemory(filmNumber, 'money', TAGS.BUDGET_AUTO_APPROVED, {});

      setTimeout(() => startCasting(), 800);
    } else if (tier === 'studio') {
      setBudgetTier('studio');
      const q = NEGOT_Q.studio[0];
      setNegotiating(q);
      setDialogue(q.prompt);
      setPvmContent({ type:'money', amount:'$60M' });

      logMemory(filmNumber, 'money', TAGS.BUDGET_TIER, { detail: 'studio' });
    } else {
      setBudgetTier('blockbuster');
      const q = NEGOT_Q.blockbuster[0];
      setNegotiating(q);
      setNegoStep(0);
      setDialogue(q.prompt);
      setPvmContent({ type:'money', amount:'$120M' });

      logMemory(filmNumber, 'money', TAGS.BUDGET_TIER, { detail: 'blockbuster' });
    }
  }

  function answerNegotiation(opt) {
    let success = false;
    if (opt.cond === 'market_hot') success = trends[genre?.id] === 'hot';
    else if (opt.cond === 'market_warm') success = trends[genre?.id] !== 'cold';
    else if (opt.cond === 'rep_pos') success = reputation > 0;
    else if (opt.cond === 'rep_high') success = reputation >= 5;
    else if (opt.cond === 'bluff') success = Math.random() > 0.35;
    else if (opt.cond === 'always') success = true;

    // ── Log bluff attempts ──
    if (opt.cond === 'bluff') {
      logMemory(filmNumber, 'money', TAGS.BUDGET_BLUFFED, { meta: { success } });
      if (!success) logMemory(filmNumber, 'money', TAGS.BUDGET_BLUFF_FAIL, {});
    }

    if (success) {
      setDialogue(opt.ok);
      setNegoResult('approved');
      // If blockbuster and more questions
      if (budgetTier === 'blockbuster' && negoStep < NEGOT_Q.blockbuster.length - 1) {
        setTimeout(() => {
          const next = NEGOT_Q.blockbuster[negoStep + 1];
          setNegoStep(negoStep + 1);
          setNegotiating(next);
          setDialogue(next.prompt);
          setNegoResult(null);
        }, 1200);
        return;
      }
      setDialogue(pick(TEAM.finance.lines.approved));
      setTimeout(() => startCasting(), 1000);
    } else {
      setDialogue(opt.fail || "I'm not convinced.");
      setNegoResult('denied');
      if (budgetTier === 'blockbuster') {
        setBudgetTier('studio');
        setPvmContent({ type:'money', amount:'$60M' });
        setDialogue(pick(TEAM.finance.lines.denied));
        logMemory(filmNumber, 'money', TAGS.BUDGET_DOWNGRADED, { detail: 'blockbuster_to_studio' });
      }
      setTimeout(() => startCasting(), 1200);
    }
    setNegotiating(null);
  }

  function startCasting() {
    setBeat(3);
    setCastingRole('director');
    setDialogue(pick(TEAM.agent.lines.greeting));
    setPvmContent({ type:'character', icon:TEAM.agent.icon, title:TEAM.agent.title, role:TEAM.agent.role });
  }

  // ─── BEAT 3: Talent ───
  function getRoster() {
    if (castingRole === 'director') return DIRECTORS;
    if (castingRole === 'lead') return LEADS;
    return SUPPORT;
  }

  function getPool() {
    const roster = getRoster();
    const sorted = [...roster].sort((a, b) => (b.q + b.h) - (a.q + a.h));
    return [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]];
  }

  function isRefused(t) {
    if (isTierLocked(t.tier)) return true;
    if (t.tier === 'a' && reputation < t.refuseBelow) return true;
    if (t.tier === 'b' && reputation < t.refuseBelow) return true;
    return false;
  }

  function selectTalent(t) {
    if (t.demand) {
      setDemandPopup(t);
      setDialogue(pick(TEAM.agent.lines.demand));
      return;
    }
    confirmTalent(t, false);
  }

  function confirmTalent(t, demandAccepted) {
    setDemandPopup(null);
    const newCast = { ...cast, [castingRole]:t };
    setCast(newCast);
    setPvmContent({ type:'character', icon:t.icon, title:t.archetype.toUpperCase(), role:`${castingRole.charAt(0).toUpperCase() + castingRole.slice(1)}` });

    // ── Log memory + talent relations ──
    logMemory(filmNumber, 'talent', TAGS.TALENT_HIRED, {
      actor: t.archetype, detail: castingRole, meta: { tier: t.tier, cost: t.cost },
    });
    hireTalent(t.archetype, filmNumber);
    if (demandAccepted && t.demand) {
      logMemory(filmNumber, 'talent', TAGS.DEMAND_ACCEPTED, { actor: t.archetype, detail: t.demand.label });
      acceptDemand(t.archetype, filmNumber);
      // Apply demand bonuses
      if (t.demand.qBonus) adjustQuality(t.demand.qBonus);
      if (t.demand.hBonus) adjustHype(t.demand.hBonus);
      if (t.demand.hPen) adjustHype(t.demand.hPen);
    }

    // Check chemistry
    const archetypes = Object.values(newCast).filter(Boolean).map(c => c.archetype);
    const chems = CHEMISTRY.filter(ch => ch.pair.every(p => archetypes.includes(p)));
    if (chems.length > chemistryFound.length) {
      setChemistryFound(chems);
      setDialogue(pick(TEAM.agent.lines.chemistry) + ` "${chems[chems.length - 1].label}"`);
    } else {
      setDialogue(pick(TEAM.agent.lines.present));
    }

    // Next role
    if (castingRole === 'director') { setTimeout(() => setCastingRole('lead'), 600); }
    else if (castingRole === 'lead') { setTimeout(() => setCastingRole('support'), 600); }
    else {
      setDialogue(pick(TEAM.agent.lines.done));

      // ── Check for all-star or cheap cast ──
      const allTiers = Object.values(newCast).filter(Boolean).map(c => c.tier);
      if (allTiers.every(t => t === 'a')) {
        logMemory(filmNumber, 'talent', TAGS.ALL_STAR_CAST, {});
      }
      if (allTiers.every(t => t === 'no')) {
        logMemory(filmNumber, 'talent', TAGS.CHEAP_CAST, {});
      }

      setTimeout(() => {
        setBeat(4);
        setPvmContent({ type:'greenlight' });
        setDialogue(pick(TEAM.development.lines.greenlight));
      }, 800);
    }
  }

  // ─── BEAT 4: Greenlight ───
  function greenlight() {
    setGreenlightFlash(true);

    // ── Build the film object and push to store ──
    const budgetAmount = budgetTier === 'blockbuster' ? 120e6 : budgetTier === 'studio' ? 60e6 : 15e6;
    const filmData = {
      genre: genre.id,
      genreLabel: genre.label,
      pitch: selectedPitch,
      title: selectedPitch?.title || 'UNTITLED',
      rating,
      budgetTier,
      budget: budgetAmount,
      cast,
      trends: { ...trends },
    };

    setCurrentFilm(filmData);

    // Apply quality/hype from talent stats
    let qTotal = 0, hTotal = 0;
    Object.values(cast).filter(Boolean).forEach(t => { qTotal += t.q; hTotal += t.h; });
    if (selectedPitch?.qMod) qTotal += selectedPitch.qMod;
    // Market trend bonus
    if (trends[genre.id] === 'hot') qTotal += 15;
    else if (trends[genre.id] === 'cold') qTotal -= 10;
    // Chemistry bonuses
    chemistryFound.forEach(c => { qTotal += c.q; hTotal += c.h; });
    // Building bonuses
    if (hasBuilding('posthouse')) qTotal += 12;
    if (hasBuilding('marketing')) hTotal += 12;
    if (hasBuilding('backlot')) { qTotal += 6; hTotal += 4; }

    adjustQuality(qTotal);
    adjustHype(hTotal);

    // Spend budget from funds
    useStore.getState().spendFunds(budgetAmount);

    setTimeout(() => {
      setGreenlightFlash(false);
      setPhase('production');
    }, 1200);
  }

  // ─── Quality/Hype estimate ───
  function getEstimates() {
    let q = 30, h = 20; // base
    if (selectedPitch) q += selectedPitch.qMod || 0;
    if (genre && trends[genre.id] === 'hot') q += 15;
    else if (genre && trends[genre.id] === 'cold') q -= 10;
    if (cast.director) { q += cast.director.q; h += cast.director.h; }
    if (cast.lead) { q += cast.lead.q; h += cast.lead.h; }
    if (cast.support) { q += cast.support.q; h += cast.support.h; }
    chemistryFound.forEach(c => { q += c.q; h += c.h; });
    return { q:Math.max(0, Math.min(100, q)), h:Math.max(0, Math.min(100, h)) };
  }

  const TOP_H = 110;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', position:'relative', fontFamily:MONO }}>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes pulseGreen{0%,100%{box-shadow:0 0 20px ${COLORS.green}4d}50%{box-shadow:0 0 40px ${COLORS.green}99,0 0 60px ${COLORS.green}33}}`}</style>

      {/* Greenlight flash overlay */}
      {greenlightFlash && <div style={{ position:'absolute', inset:0, zIndex:50, background:`radial-gradient(ellipse,${COLORS.green}4d,transparent 70%)`, pointerEvents:'none' }} />}

      {/* TOP ROW */}
      <div style={{ display:'flex', gap:6, padding:6, height:TOP_H, flexShrink:0, borderBottom:'1px solid #1a1a1c' }}>
        <div style={{ flex:1 }}><ScoreBar funds={funds} reputation={reputation} filmCount={filmNumber} /></div>
        <div style={{ flex:1 }}><PVMMonitor on={pvmOn} content={pvmContent} onToggle={() => setPvmOn(!pvmOn)} /></div>
      </div>

      {/* ACTION AREA */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ═══ BEAT 0: MARKET ═══ */}
        {beat === 0 && <>
          <DialogueBox character={TEAM.development} line={dialogue} />
          <div style={{ flex:1, padding:'8px 10px', overflow:'auto' }}>
            <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:2, marginBottom:6 }}>SELECT GENRE</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {GENRES.map(g => {
                const t = trends[g.id];
                const locked = isGenreLocked(g.id);
                return <div key={g.id} onClick={() => !locked && selectGenre(g)} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, cursor:locked ? 'not-allowed' : 'pointer',
                  background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', opacity:locked ? 0.3 : 1, transition:'all 0.15s',
                }}>
                  <div style={{ fontSize:18, width:26, textAlign:'center' }}>{g.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:MONO, fontSize:11, color:'rgba(255,255,255,0.6)' }}>{g.label}</div>
                  </div>
                  <div style={{ fontFamily:MONO, fontSize:8, color:trendColor(t), textShadow:`0 0 4px ${trendColor(t)}33` }}>
                    {locked ? '🔒 LOCKED' : trendIcon(t)}
                  </div>
                </div>;
              })}
            </div>
          </div>
        </>}

        {/* ═══ BEAT 1: CONCEPT ═══ */}
        {beat === 1 && <>
          <DialogueBox character={selectedPitch ? TEAM.writer : TEAM.writer} line={selectedPitch ? dialogue : pick(TEAM.writer.lines.greeting)} />
          <div style={{ flex:1, padding:'8px 10px', overflow:'auto' }}>
            {!selectedPitch ? <>
              <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:2, marginBottom:6 }}>CHOOSE YOUR PITCH</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {pitchOptions.map((p, i) => <div key={i} onClick={() => selectPitch(p)} style={{
                  padding:'12px 14px', borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', transition:'all 0.15s',
                }}>
                  <div style={{ fontFamily:DISPLAY, fontSize:11, color:'#fff', letterSpacing:1, marginBottom:4 }}>{p.title}</div>
                  <div style={{ fontFamily:MONO, fontSize:9, color:'rgba(255,255,255,0.45)', lineHeight:1.5, marginBottom:6 }}>{p.logline}</div>
                  <div style={{ display:'flex', gap:12 }}>
                    <div style={{ fontFamily:MONO, fontSize:8, color:COLORS.orange }}>Tone: {p.tone}</div>
                    <div style={{ fontFamily:MONO, fontSize:8, color:COLORS.green }}>Quality: +{p.qMod}</div>
                  </div>
                </div>)}
              </div>
            </> : <>
              <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:2, marginBottom:6 }}>SELECT RATING</div>
              <div style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, marginBottom:10 }}>
                <div style={{ fontFamily:DISPLAY, fontSize:11, color:COLORS.orange, letterSpacing:1 }}>{selectedPitch.title}</div>
                <div style={{ fontFamily:MONO, fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:4 }}>{selectedPitch.logline}</div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['G','PG','PG-13','R','NC-17'].map(r => <div key={r} onClick={() => selectRating(r)} style={{
                  padding:'8px 14px', borderRadius:6, cursor:'pointer', fontFamily:MONO, fontSize:11,
                  background:rating === r ? `${COLORS.orange}26` : 'rgba(255,255,255,0.03)',
                  border:`1px solid ${rating === r ? `${COLORS.orange}4d` : 'rgba(255,255,255,0.06)'}`,
                  color:rating === r ? COLORS.orange : 'rgba(255,255,255,0.5)', transition:'all 0.15s',
                }}>{r}</div>)}
              </div>
            </>}
          </div>
        </>}

        {/* ═══ BEAT 2: MONEY ═══ */}
        {beat === 2 && <>
          <DialogueBox character={TEAM.finance} line={dialogue} />
          <div style={{ flex:1, padding:'8px 10px', overflow:'auto' }}>
            {!budgetTier ? <>
              <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:2, marginBottom:6 }}>SELECT BUDGET</div>
              {[
                { tier:'indie', label:'INDIE', amount:'$15M', desc:'Lean and scrappy.', note:'Auto-approved', icon:'🎥' },
                { tier:'studio', label:'STUDIO', amount:'$60M', desc:'Proper production value.', note:'1 question', icon:'🎬' },
                { tier:'blockbuster', label:'BLOCKBUSTER', amount:'$120M', desc:'Tentpole territory.', note:'2 questions — can be denied', icon:'💰' },
              ].map(b => {
                const locked = isBudgetLocked(b.tier);
                return <div key={b.tier} onClick={() => !locked && selectBudget(b.tier)} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:8, cursor:locked ? 'not-allowed' : 'pointer',
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', marginBottom:5, transition:'all 0.15s',
                  opacity:locked ? 0.35 : 1,
                }}>
                  <div style={{ fontSize:20 }}>{b.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:MONO, fontSize:11, color:'#fff', letterSpacing:0.5 }}>{b.label} — {b.amount}</div>
                    <div style={{ fontFamily:MONO, fontSize:8, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{b.desc}</div>
                  </div>
                  <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.25)' }}>{locked ? '🔒' : b.note}</div>
                </div>;
              })}
            </> : negotiating ? <>
              <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:2, marginBottom:6 }}>MAKE YOUR CASE</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {negotiating.options.map((opt, i) => <div key={i} onClick={() => answerNegotiation(opt)} style={{
                  padding:'10px 12px', borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.06)', transition:'all 0.15s',
                }}>
                  <div style={{ fontFamily:MONO, fontSize:10, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>{opt.text}</div>
                </div>)}
              </div>
            </> : <>
              <div style={{ padding:'16px', textAlign:'center' }}>
                <div style={{ fontFamily:MONO, fontSize:10, color:negoResult === 'approved' ? COLORS.green : COLORS.amber, letterSpacing:1 }}>
                  {budgetTier.toUpperCase()} BUDGET {negoResult === 'denied' ? '(DOWNGRADED)' : 'APPROVED'}
                </div>
              </div>
            </>}
          </div>
        </>}

        {/* ═══ BEAT 3: TALENT ═══ */}
        {beat === 3 && <>
          <DialogueBox character={TEAM.agent} line={dialogue} />
          <div style={{ flex:1, padding:'8px 10px', overflow:'auto' }}>
            {demandPopup ? <>
              <div style={{ fontFamily:MONO, fontSize:7, color:COLORS.red, letterSpacing:2, marginBottom:6 }}>⚠️ DEMAND</div>
              <div style={{ padding:'12px 14px', background:`${COLORS.red}0f`, border:`1px solid ${COLORS.red}26`, borderRadius:8, marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ fontSize:22 }}>{demandPopup.icon}</div>
                  <div style={{ fontFamily:MONO, fontSize:11, color:'#fff' }}>{demandPopup.archetype}</div>
                </div>
                <div style={{ fontFamily:MONO, fontSize:9, color:COLORS.orange, marginBottom:4 }}>{demandPopup.demand.label}</div>
                <div style={{ fontFamily:MONO, fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{demandPopup.demand.desc}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <div onClick={() => confirmTalent(demandPopup, true)} style={{ flex:1, padding:'10px', borderRadius:6, cursor:'pointer', textAlign:'center', fontFamily:MONO, fontSize:10, background:`${COLORS.green}14`, border:`1px solid ${COLORS.green}33`, color:COLORS.green }}>ACCEPT</div>
                <div onClick={() => {
                  setDemandPopup(null);
                  setDialogue(pick(TEAM.agent.lines.present));
                  logMemory(filmNumber, 'talent', TAGS.DEMAND_DENIED, { actor: demandPopup.archetype, detail: demandPopup.demand.label });
                  denyDemand(demandPopup.archetype, filmNumber);
                }} style={{ flex:1, padding:'10px', borderRadius:6, cursor:'pointer', textAlign:'center', fontFamily:MONO, fontSize:10, background:`${COLORS.red}14`, border:`1px solid ${COLORS.red}33`, color:COLORS.red }}>PASS</div>
              </div>
            </> : <>
              <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:2, marginBottom:6 }}>
                {castingRole.toUpperCase()} — {cast[castingRole] ? '✓ CAST' : 'CHOOSE'}
              </div>
              {/* Role tabs */}
              <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                {['director','lead','support'].map(r => <div key={r} style={{
                  fontFamily:MONO, fontSize:8, padding:'3px 8px', borderRadius:4, letterSpacing:1,
                  background:castingRole === r ? `${COLORS.orange}1a` : 'transparent',
                  color:cast[r] ? COLORS.green : castingRole === r ? COLORS.orange : 'rgba(255,255,255,0.2)',
                  border:`1px solid ${castingRole === r ? `${COLORS.orange}33` : 'transparent'}`,
                }}>{r.toUpperCase()} {cast[r] ? '✓' : ''}</div>)}
              </div>
              {/* Talent cards */}
              {!cast[castingRole] && <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {getPool().map((t, i) => <TalentCard key={i} talent={t} selected={false} refused={isRefused(t)} onSelect={selectTalent} />)}
              </div>}
              {cast[castingRole] && <div style={{ padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:28 }}>{cast[castingRole].icon}</div>
                <div style={{ fontFamily:MONO, fontSize:11, color:COLORS.orange, marginTop:4 }}>{cast[castingRole].archetype}</div>
                <div style={{ fontFamily:MONO, fontSize:8, color:'rgba(255,255,255,0.3)', marginTop:2 }}>Cast as {castingRole}</div>
              </div>}
              {/* Chemistry banner */}
              {chemistryFound.length > 0 && <div style={{ marginTop:8, padding:'8px 12px', background:`${COLORS.orange}0f`, border:`1px solid ${COLORS.orange}26`, borderRadius:8 }}>
                {chemistryFound.map((c, i) => <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:i < chemistryFound.length - 1 ? 4 : 0 }}>
                  <div style={{ fontSize:14 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontFamily:MONO, fontSize:9, color:COLORS.orange }}>{c.label}</div>
                    <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.3)' }}>{c.flavor}</div>
                  </div>
                  <div style={{ marginLeft:'auto', fontFamily:MONO, fontSize:8 }}>
                    {c.q !== 0 && <span style={{ color:c.q > 0 ? COLORS.green : COLORS.red }}>Q{c.q > 0 ? '+' : ''}{c.q} </span>}
                    {c.h !== 0 && <span style={{ color:COLORS.amber }}>H+{c.h}</span>}
                  </div>
                </div>)}
              </div>}
            </>}
          </div>
        </>}

        {/* ═══ BEAT 4: GREENLIGHT ═══ */}
        {beat === 4 && <>
          <DialogueBox character={TEAM.development} line={dialogue} />
          <div style={{ flex:1, padding:'8px 10px', overflow:'auto' }}>
            {/* Summary */}
            <div style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, marginBottom:8 }}>
              <div style={{ fontFamily:DISPLAY, fontSize:12, color:'#fff', letterSpacing:1, marginBottom:6 }}>{selectedPitch?.title || 'UNTITLED'}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                <div style={{ fontFamily:MONO, fontSize:8, color:trendColor(trends[genre?.id] || 'warm'), padding:'2px 6px', background:'rgba(255,255,255,0.04)', borderRadius:3 }}>{genre?.icon} {genre?.label} ({trendIcon(trends[genre?.id] || 'warm')})</div>
                <div style={{ fontFamily:MONO, fontSize:8, color:'rgba(255,255,255,0.4)', padding:'2px 6px', background:'rgba(255,255,255,0.04)', borderRadius:3 }}>{rating}</div>
                <div style={{ fontFamily:MONO, fontSize:8, color:COLORS.green, padding:'2px 6px', background:'rgba(255,255,255,0.04)', borderRadius:3 }}>{budgetTier?.toUpperCase()}</div>
              </div>
              {/* Cast list */}
              {['director','lead','support'].map(r => cast[r] && <div key={r} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <div style={{ fontSize:14 }}>{cast[r].icon}</div>
                <div style={{ fontFamily:MONO, fontSize:9, color:'rgba(255,255,255,0.6)' }}>{cast[r].archetype}</div>
                <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.25)', marginLeft:'auto' }}>{r}</div>
              </div>)}
            </div>

            {/* Estimates */}
            {(() => { const e = getEstimates(); return <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.25)', letterSpacing:1, marginBottom:3 }}>QUALITY</div>
                <div style={{ height:8, background:'#111', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${e.q}%`, background:`linear-gradient(90deg,${COLORS.green}aa,${COLORS.green})`, borderRadius:4, transition:'width 1s' }} />
                </div>
                <div style={{ fontFamily:MONO, fontSize:9, color:COLORS.green, marginTop:2 }}>{e.q}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:MONO, fontSize:7, color:'rgba(255,255,255,0.25)', letterSpacing:1, marginBottom:3 }}>HYPE</div>
                <div style={{ height:8, background:'#111', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${e.h}%`, background:`linear-gradient(90deg,${COLORS.amber}aa,${COLORS.amber})`, borderRadius:4, transition:'width 1s' }} />
                </div>
                <div style={{ fontFamily:MONO, fontSize:9, color:COLORS.amber, marginTop:2 }}>{e.h}</div>
              </div>
            </div>; })()}

            {/* Chemistry */}
            {chemistryFound.length > 0 && <div style={{ marginBottom:10 }}>
              {chemistryFound.map((c, i) => <div key={i} style={{ fontFamily:MONO, fontSize:8, color:COLORS.orange, marginBottom:2 }}>💫 {c.label}: Q{c.q > 0 ? '+' : ''}{c.q} H{c.h > 0 ? '+' : ''}{c.h}</div>)}
            </div>}

            {/* GREENLIGHT BUTTON */}
            {!greenlightFlash ? <div onClick={greenlight} style={{
              padding:'16px', borderRadius:10, cursor:'pointer', textAlign:'center',
              background:`linear-gradient(180deg,${COLORS.green}26,${COLORS.green}14)`,
              border:`2px solid ${COLORS.green}66`,
              animation:'pulseGreen 2s ease-in-out infinite',
              transition:'all 0.15s',
            }}>
              <div style={{ fontFamily:DISPLAY, fontSize:16, fontWeight:900, color:COLORS.green, letterSpacing:4, textShadow:`0 0 12px ${COLORS.green}66` }}>
                ▶▶ GREENLIGHT ▶▶
              </div>
              <div style={{ fontFamily:MONO, fontSize:8, color:`${COLORS.green}80`, marginTop:4, letterSpacing:2 }}>CAMERAS ROLLING</div>
            </div> : <div style={{ padding:'20px', textAlign:'center' }}>
              <div style={{ fontFamily:DISPLAY, fontSize:18, fontWeight:900, color:'#fff', letterSpacing:4, textShadow:`0 0 20px ${COLORS.green}80` }}>🎬 PRODUCTION BEGINS</div>
            </div>}
          </div>
        </>}

        {/* Beat dots */}
        <BeatDots current={beat} labels={BEAT_LABELS} />
      </div>
    </div>
  );
}
