'use client';
// ─────────────────────────────────────────────────────────────
// DialogueComponents.jsx — Shared NPC dialogue UI components
// Used by PreProduction, Production, Marketing, Premiere
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { COLORS, MONO } from './GameStyles';

// ═══════════════════════════════════════════
// TYPEWRITER TEXT — character-by-character reveal
// ═══════════════════════════════════════════
export function TypewriterText({ text, speed = 25, onDone }) {
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
// DIALOGUE BOX — full NPC speech panel
// Icon + name + role + italic quoted typewriter text
// ═══════════════════════════════════════════
export function DialogueBox({ character, line, children }) {
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
// NPC QUOTE — compact ambient one-liner
// Used in Premiere and Production for atmosphere
// Just icon + italic quote, no title/role, no typewriter
// ═══════════════════════════════════════════
export function NPCQuote({ character, line }) {
  if (!line) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      padding: '4px 8px',
    }}>
      <div style={{ fontSize: 14, flexShrink: 0 }}>{character.icon}</div>
      <div style={{
        fontFamily: MONO, fontSize: 9,
        color: 'rgba(255,255,255,0.45)', fontStyle: 'italic',
        lineHeight: 1.4,
      }}>
        "{line}"
      </div>
    </div>
  );
}
