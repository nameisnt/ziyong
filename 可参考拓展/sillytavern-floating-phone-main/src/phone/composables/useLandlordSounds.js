export function useLandlordSounds() {
  let ctx = null;

  function getCtx() {
    if (ctx) return ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    return ctx;
  }

  function tone(freq = 440, duration = 0.08, type = 'sine', gainValue = 0.05) {
    try {
      const audio = getCtx();
      if (!audio) return;
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainValue, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration);
    } catch (error) {
      console.warn('[LandlordSounds] audio failed:', error);
    }
  }

  function sequence(notes, gap = 0.05) {
    notes.forEach((note, index) => setTimeout(() => tone(note[0], note[1], note[2], note[3]), index * gap * 1000));
  }

  return {
    unlock: getCtx,
    playClick: () => tone(520, 0.04, 'triangle', 0.035),
    playDeal: () => sequence([[420, 0.035, 'square', 0.025], [520, 0.035, 'square', 0.02], [620, 0.035, 'square', 0.018]], 0.035),
    playSelect: () => tone(760, 0.035, 'sine', 0.03),
    playPlayCards: () => sequence([[360, 0.04, 'triangle', 0.035], [680, 0.07, 'triangle', 0.03]], 0.04),
    playPass: () => tone(180, 0.09, 'sawtooth', 0.025),
    playBomb: () => sequence([[90, 0.13, 'sawtooth', 0.08], [55, 0.18, 'square', 0.05]], 0.04),
    playWin: () => sequence([[520, 0.08, 'sine', 0.04], [660, 0.08, 'sine', 0.04], [880, 0.14, 'sine', 0.045]], 0.09),
    playLose: () => sequence([[360, 0.12, 'triangle', 0.04], [260, 0.12, 'triangle', 0.035], [180, 0.18, 'triangle', 0.03]], 0.11),
  };
}
