'use client';
// Pacific Dreams — JuicyButton
// Drop-in <button> replacement with press animation, click sound, and haptic feedback
// Manages pressed state via mouseDown/touchStart → mouseUp/touchEnd/mouseLeave

import { useState } from 'react';
import { useJuice } from '../../lib/pacific-dreams/juice';
import { baseButton } from './GameStyles';

export default function JuicyButton({ children, onClick, style = {}, disabled, soundOverride, ...props }) {
  const [pressed, setPressed] = useState(false);
  const { clickFeedback } = useJuice();

  const handlePointerDown = () => {
    if (!disabled) setPressed(true);
  };

  const handlePointerUp = () => {
    setPressed(false);
  };

  const handleClick = (e) => {
    if (disabled) return;
    // Allow parent to provide a custom sound via soundOverride
    if (soundOverride) {
      soundOverride();
    } else {
      clickFeedback();
    }
    onClick?.(e);
  };

  return (
    <button
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...baseButton,
        ...style,
        transform: pressed
          ? `translateY(2px) ${style.transform || ''}`
          : (style.transform || 'none'),
        boxShadow: pressed
          ? 'inset 0 1px 3px rgba(0,0,0,0.4)'
          : (style.boxShadow || 'none'),
        transition: 'transform 0.08s ease, box-shadow 0.08s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease',
      }}
      {...props}
    >
      {children}
    </button>
  );
}
