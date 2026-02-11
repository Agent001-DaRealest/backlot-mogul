// Pacific Dreams / Backlot Mogul — Shared Styles & Constants
// Color palette, font stacks, and reusable inline style objects

export const MONO = "'Share Tech Mono', 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace";
export const DISPLAY = "'Orbitron', 'Share Tech Mono', sans-serif";

export const COLORS = {
  bg: '#0a0a0a',
  surface: '#111111',
  surfaceLight: '#1a1a1a',
  border: '#2a2a2a',
  borderLight: '#333333',

  // Text
  text: '#e0e0e0',
  textDim: '#888888',
  textMuted: '#555555',
  white: '#ffffff',

  // Semantic — Backlot Mogul palette
  green: '#39ff14',
  amber: '#f1c40f',
  red: '#ff4444',
  blue: '#00aaff',
  cyan: '#00ddcc',
  orange: '#ff9e64',

  // Genre accent (used for selected states)
  accent: '#ff6b9d',
};

// Shared base styles
export const baseButton = {
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: 'uppercase',
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  cursor: 'pointer',
  padding: '12px 16px',
  transition: 'all 0.15s ease',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
};

export const baseCard = {
  fontFamily: MONO,
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  padding: 16,
};

export const sectionLabel = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: 3,
  color: COLORS.textDim,
  textTransform: 'uppercase',
  marginBottom: 8,
};

export const screenContainer = {
  fontFamily: MONO,
  color: COLORS.text,
  minHeight: '100dvh',
  background: COLORS.bg,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
};
