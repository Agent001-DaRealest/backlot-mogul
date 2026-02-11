// Pacific Dreams — Juice Hook
// Combines Web Audio sounds + navigator.vibrate() haptics
// Single import for tactile feedback across all components

import { useCallback } from 'react';
import {
  playClick, playPositiveDing, playNegativeBuzz,
  playCashRegister, playWomp, playDrumroll, playStamp, playConfirm,
} from './sounds';

// ═══════════════════════════════════════════
// HAPTIC UTILITY
// ═══════════════════════════════════════════

function haptic(pattern = 10) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) { /* graceful fail — iOS doesn't support vibrate */ }
}

// ═══════════════════════════════════════════
// useJuice HOOK
// ═══════════════════════════════════════════

export function useJuice() {
  const clickFeedback = useCallback(() => {
    playClick();
    haptic(10);
  }, []);

  const positiveFeedback = useCallback(() => {
    playPositiveDing();
    haptic(15);
  }, []);

  const negativeFeedback = useCallback(() => {
    playNegativeBuzz();
    haptic([20, 10, 20]);
  }, []);

  const cashFeedback = useCallback(() => {
    playCashRegister();
    haptic(25);
  }, []);

  const confirmFeedback = useCallback(() => {
    playConfirm();
    haptic([10, 5, 25]);
  }, []);

  const verdictFeedback = useCallback((verdict) => {
    if (verdict === 'BLOCKBUSTER' || verdict === 'HIT') {
      playStamp();
      haptic([10, 5, 10, 5, 50]);
    } else if (verdict === 'FLOP') {
      playWomp();
      haptic([50, 20, 50]);
    } else {
      playStamp();
      haptic(20);
    }
  }, []);

  const drumrollFeedback = useCallback(() => {
    playDrumroll();
    haptic([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
  }, []);

  const stampFeedback = useCallback(() => {
    playStamp();
    haptic([10, 5, 50]);
  }, []);

  return {
    clickFeedback,
    positiveFeedback,
    negativeFeedback,
    cashFeedback,
    confirmFeedback,
    verdictFeedback,
    drumrollFeedback,
    stampFeedback,
  };
}
