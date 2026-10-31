/**
 * Ruan AI Audio Identity Engine (Web Audio API Synthesizer)
 * 
 * Provides subtle, ethereal, synthesized sound design without any external audio asset dependencies.
 * Respects browser autoplay restrictions and is strictly muted by default until user opts in.
 */

let audioCtx = null;
let isAudioEnabled = false;

// Check if user previously saved preference in localStorage
try {
  const saved = localStorage.getItem('ruan_sound_enabled');
  if (saved === 'true') {
    // Note: AudioContext still requires user interaction before it can resume
    isAudioEnabled = true;
  }
} catch {
  // localStorage may be disabled in restricted sandbox
}

/**
 * Initializes or resumes the Web Audio context upon explicit user interaction.
 */
function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Checks whether sound is globally enabled.
 */
export function getSoundStatus() {
  return isAudioEnabled;
}

/**
 * Toggles global sound on or off. Must be called from a user gesture (button click).
 * @param {boolean} [forcedState] Optional explicit state
 * @returns {boolean} New sound status
 */
export function toggleSound(forcedState) {
  isAudioEnabled = forcedState !== undefined ? forcedState : !isAudioEnabled;
  try {
    localStorage.setItem('ruan_sound_enabled', isAudioEnabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }

  if (isAudioEnabled) {
    const ctx = getAudioContext();
    if (ctx) {
      // Play a gentle confirmation tone to confirm audio activation
      playConfirmationSound();
    }
  }

  return isAudioEnabled;
}

/**
 * Plays a startup activation sound — warm, ambient celestial swell.
 */
export function playStartupSound() {
  if (!isAudioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Ambient sub-bass pad
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(110, now); // A2
  osc1.frequency.exponentialRampToValueAtTime(220, now + 0.9); // A3
  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.08, now + 0.3);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 1.2);

  // Crystal high chime harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(440, now + 0.15); // A4
  osc2.frequency.exponentialRampToValueAtTime(880, now + 0.8); // A5
  gain2.gain.setValueAtTime(0.0001, now);
  gain2.gain.linearRampToValueAtTime(0.05, now + 0.35);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 1.4);
}

/**
 * Plays an orb initialization pulse — soft resonance with subtle shimmer.
 */
export function playOrbInitSound() {
  if (!isAudioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(1800, now + 0.4);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(261.63, now); // C4
  osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.5); // C5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.8);
}

/**
 * Plays a subtle confirmation or action completion sound — two-tone chime.
 */
export function playConfirmationSound() {
  if (!isAudioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  [523.25, 659.25].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.08;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.04, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.35);
  });
}

/**
 * Plays a micro button click / tick interaction.
 */
export function playClickSound() {
  if (!isAudioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

  gain.gain.setValueAtTime(0.02, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

/**
 * Plays a subtle transition sweep for section switching or tabs.
 */
export function playTransitionSound() {
  if (!isAudioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);

  gain.gain.setValueAtTime(0.015, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}
