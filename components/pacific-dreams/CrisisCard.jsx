'use client';
// Pacific Dreams — Crisis Card Component
// Binary-choice crisis card with entrance/exit animation, choice flash, and sound feedback

import { useState, useEffect } from 'react';
import { MONO, COLORS } from './GameStyles';
import JuicyButton from './JuicyButton';
import { useJuice } from '../../lib/pacific-dreams/juice';

export default function CrisisCard({ crisis, cardIndex, totalCards, onResolve }) {
  const [entered, setEntered] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [exiting, setExiting] = useState(false);
  const { positiveFeedback, negativeFeedback } = useJuice();

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleChoose = (option) => {
    if (chosen) return;
    setChosen(option);

    // Determine if outcome is positive or negative
    const chosenOption = option === 'A' ? crisis.optionA : crisis.optionB;
    const isNegative = chosenOption.qualityDelta < 0 || chosenOption.hypeDelta < -2;

    // Play appropriate sound
    if (isNegative) {
      negativeFeedback();
    } else {
      positiveFeedback();
    }

    // Exit animation, then resolve
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => onResolve(option), 300);
    }, 500);
  };

  const renderDelta = (val, label) => {
    if (val === 0) return <span style={{ color: COLORS.textMuted }}>{'\u2014'}</span>;
    const positive = val > 0;
    return (
      <span style={{ color: positive ? COLORS.green : COLORS.red, fontWeight: 600 }}>
        {positive ? '+' : ''}{val} {label}
      </span>
    );
  };

  return (
    <div style={{
      fontFamily: MONO,
      background: COLORS.surface,
      border: `1px solid ${COLORS.amber}`,
      padding: 20,
      maxWidth: 440,
      margin: '0 auto',
      transform: exiting
        ? 'translateY(-20px)'
        : entered ? 'translateY(0)' : 'translateY(20px)',
      opacity: exiting ? 0 : entered ? 1 : 0,
      transition: 'all 0.35s ease-out',
    }}>
      {/* Card counter */}
      <div style={{
        fontSize: 9,
        letterSpacing: 3,
        color: COLORS.textMuted,
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>CRISIS {cardIndex + 1} / {totalCards}</span>
        <span style={{ color: COLORS.amber }}>PRODUCTION</span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: COLORS.amber,
        letterSpacing: 1,
        marginBottom: 8,
        textShadow: '0 0 8px rgba(255,204,0,0.3)',
      }}>
        {crisis.title}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12,
        color: COLORS.textDim,
        lineHeight: 1.6,
        marginBottom: 20,
      }}>
        {crisis.description}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['A', 'B'].map(opt => {
          const option = opt === 'A' ? crisis.optionA : crisis.optionB;
          const isChosen = chosen === opt;
          const isOther = chosen && chosen !== opt;
          return (
            <JuicyButton
              key={opt}
              onClick={() => handleChoose(opt)}
              disabled={!!chosen}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                borderColor: isChosen ? COLORS.green : isOther ? COLORS.border : COLORS.borderLight,
                color: isOther ? COLORS.textMuted : COLORS.text,
                opacity: isOther ? 0.2 : 1,
                background: isChosen ? 'rgba(51,255,102,0.05)' : COLORS.surface,
                transform: isOther ? 'translateX(-4px)' : 'none',
                animation: isChosen ? 'pdFlashBorder 0.4s ease-out' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
                  {option.label}
                </span>
                <span style={{ fontSize: 9, color: COLORS.textMuted }}>{opt}</span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.textDim, lineHeight: 1.4 }}>
                {option.desc}
              </div>
              <div style={{ fontSize: 10, display: 'flex', gap: 12, marginTop: 2 }}>
                {renderDelta(option.qualityDelta, 'QTY')}
                {renderDelta(option.hypeDelta, 'HYPE')}
              </div>
            </JuicyButton>
          );
        })}
      </div>
    </div>
  );
}
