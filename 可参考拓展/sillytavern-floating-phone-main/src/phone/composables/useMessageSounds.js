let audioContext = null;
let unlocked = false;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

function tone({ frequency = 440, duration = 0.06, type = 'sine', gain = 0.045 } = {}) {
  const context = getContext();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});

  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0.0001, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(gain, context.currentTime + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
}

export function useMessageSounds() {
  function unlock() {
    if (unlocked) return;
    const context = getContext();
    if (context?.state === 'suspended') context.resume().catch(() => {});
    unlocked = true;
  }

  function play(name) {
    unlock();
    const sounds = {
      send: { frequency: 720, duration: 0.055, type: 'triangle', gain: 0.035 },
      reply: { frequency: 520, duration: 0.09, type: 'sine', gain: 0.04 },
      userTrigger: { frequency: 780, duration: 0.07, type: 'triangle', gain: 0.04 },
      roleTrigger: { frequency: 560, duration: 0.08, type: 'sine', gain: 0.045 },
      click: { frequency: 320, duration: 0.035, type: 'square', gain: 0.018 },
      panel: { frequency: 390, duration: 0.045, type: 'triangle', gain: 0.025 },
      special: { frequency: 860, duration: 0.08, type: 'triangle', gain: 0.045 },
      error: { frequency: 190, duration: 0.12, type: 'sawtooth', gain: 0.025 },
    };
    tone(sounds[name] || sounds.click);
  }

  return { unlock, play };
}
