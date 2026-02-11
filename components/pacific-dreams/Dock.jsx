'use client';
// Pacific Dreams — Bottom Dock Navigation
// Frosted glass bottom bar with 3 nav icons (only Sound Stage active in Phase 1)

import { MONO, COLORS } from './GameStyles';

const DOCK_ITEMS = [
  { id: 'soundstage', label: 'STAGE', icon: '🎬', active: true },
  { id: 'themepark', label: 'PARK', icon: '🎡', active: false },
  { id: 'executive', label: 'EXEC', icon: '🏢', active: false },
];

export default function Dock() {
  return (
    <div style={{
      height: 56,
      marginTop: 8,
      background: 'rgba(10,10,10,0.85)',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 0,
      flexShrink: 0,
    }}>
      {DOCK_ITEMS.map(item => (
        <button
          key={item.id}
          disabled={!item.active}
          style={{
            fontFamily: MONO,
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: 2,
            color: item.active ? COLORS.amber : COLORS.textMuted,
            background: 'none',
            border: 'none',
            cursor: item.active ? 'pointer' : 'default',
            padding: '8px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            opacity: item.active ? 1 : 0.4,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
