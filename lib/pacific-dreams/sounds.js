// Pacific Dreams — Web Audio API Sound Engine
// Synthesized sound effects — zero audio files, zero dependencies
// Lazy-initializes AudioContext on first user gesture (browser requirement)

let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (happens on iOS after tab switch)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

// ═══════════════════════════════════════════
// UTILITY: Create noise buffer
// ═══════════════════════════════════════════

function createNoiseBuffer(duration = 0.2) {
  const c = getCtx();
  const sampleRate = c.sampleRate;
  const length = sampleRate * duration;
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ═══════════════════════════════════════════
// CLICK — short 1200Hz sine, 30ms decay
// Used for: button taps, UI interactions
// ═══════════════════════════════════════════

export function playClick() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.04);
  } catch (e) { /* graceful fail */ }
}

// ═══════════════════════════════════════════
// POSITIVE DING — 880Hz sine, quick attack, 150ms decay
// Used for: good outcomes, successful selections
// ═══════════════════════════════════════════

export function playPositiveDing() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.2);
  } catch (e) { /* graceful fail */ }
}

// ═══════════════════════════════════════════
// NEGATIVE BUZZ — 150Hz sawtooth, 200ms
// Used for: bad outcomes, quality drops
// ═══════════════════════════════════════════

export function playNegativeBuzz() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;
    gain.gain.setValueAtTime(0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.25);
  } catch (e) { /* graceful fail */ }
}

// ═══════════════════════════════════════════
// CASH REGISTER — white noise burst + 800Hz tone, 200ms
// Used for: money earned, box office reveal
// ═══════════════════════════════════════════

export function playCashRegister() {
  try {
    const c = getCtx();

    // Noise burst
    const noiseSource = c.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(0.08);
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.1, c.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
    noiseSource.connect(noiseGain);
    noiseGain.connect(c.destination);
    noiseSource.start(c.currentTime);

    // Tone ding
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.15, c.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + 0.02);
    osc.stop(c.currentTime + 0.25);
  } catch (e) { /* graceful fail */ }
}

// ═══════════════════════════════════════════
// WOMP WOMP — descending 400→100Hz sawtooth, 500ms
// Used for: FLOP verdict
// ═══════════════════════════════════════════

export function playWomp() {
  try {
    const c = getCtx();

    // First womp
    const osc1 = c.createOscillator();
    const gain1 = c.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(400, c.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(250, c.currentTime + 0.2);
    gain1.gain.setValueAtTime(0.12, c.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
    osc1.connect(gain1);
    gain1.connect(c.destination);
    osc1.start(c.currentTime);
    osc1.stop(c.currentTime + 0.25);

    // Second womp (lower, sadder)
    const osc2 = c.createOscillator();
    const gain2 = c.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(300, c.currentTime + 0.25);
    osc2.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.5);
    gain2.gain.setValueAtTime(0.1, c.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(c.destination);
    osc2.start(c.currentTime + 0.25);
    osc2.stop(c.currentTime + 0.55);
  } catch (e) { /* graceful fail */ }
}

// ═══════════════════════════════════════════
// DRUMROLL — noise burst crescendo, 1.5s
// Used for: verdict buildup
// ═══════════════════════════════════════════

export function playDrumroll() {
  try {
    const c = getCtx();
    const noiseSource = c.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(1.5);
    const gain = c.createGain();

    // Crescendo: start quiet, build up
    gain.gain.setValueAtTime(0.01, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, c.currentTime + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.5);

    // Bandpass filter to make it sound like a drum
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 200;
    filter.Q.value = 0.8;

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noiseSource.start(c.currentTime);
  } catch (e) { /* graceful fail */ }
}

// ═══════════════════════════════════════════
// STAMP — 80Hz square wave + noise burst, 100ms
// Used for: verdict stamp slam
// ═══════════════════════════════════════════

export function playStamp() {
  try {
    const c = getCtx();

    // Heavy thud
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.15);

    // Impact noise
    const noiseSource = c.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(0.05);
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.15, c.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
    noiseSource.connect(noiseGain);
    noiseGain.connect(c.destination);
    noiseSource.start(c.currentTime);
  } catch (e) { /* graceful fail */ }
}

// ═══════════════════════════════════════════
// CONFIRM — two-note ascending beep
// Used for: START PRODUCTION confirmation
// ═══════════════════════════════════════════

export function playConfirm() {
  try {
    const c = getCtx();

    // Low note
    const osc1 = c.createOscillator();
    const gain1 = c.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 660;
    gain1.gain.setValueAtTime(0.15, c.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
    osc1.connect(gain1);
    gain1.connect(c.destination);
    osc1.start(c.currentTime);
    osc1.stop(c.currentTime + 0.12);

    // High note
    const osc2 = c.createOscillator();
    const gain2 = c.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 880;
    gain2.gain.setValueAtTime(0.15, c.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    osc2.connect(gain2);
    gain2.connect(c.destination);
    osc2.start(c.currentTime + 0.1);
    osc2.stop(c.currentTime + 0.25);
  } catch (e) { /* graceful fail */ }
}
