export type MiniGameSound = 'fail' | 'move' | 'reset' | 'select' | 'success';

export const miniGameSoundEnabled = ref(true);

let audioContext: AudioContext | null = null;

const soundNotes: Record<MiniGameSound, Array<[frequency: number, delay: number, duration: number]>> = {
  fail: [
    [220, 0, 0.09],
    [150, 0.09, 0.16],
  ],
  move: [[360, 0, 0.055]],
  reset: [
    [280, 0, 0.055],
    [360, 0.055, 0.07],
  ],
  select: [[480, 0, 0.045]],
  success: [
    [440, 0, 0.08],
    [554, 0.08, 0.08],
    [659, 0.16, 0.15],
  ],
};

export function playMiniGameSound(sound: MiniGameSound) {
  if (!miniGameSoundEnabled.value) return;
  audioContext ??= new AudioContext();
  void audioContext.resume();
  const start = audioContext.currentTime;
  soundNotes[sound].forEach(([frequency, delay, duration]) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + delay);
    gain.gain.exponentialRampToValueAtTime(0.055, start + delay + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
    oscillator.connect(gain);
    gain.connect(audioContext!.destination);
    oscillator.start(start + delay);
    oscillator.stop(start + delay + duration);
  });
}

export function toggleMiniGameSound() {
  miniGameSoundEnabled.value = !miniGameSoundEnabled.value;
  if (miniGameSoundEnabled.value) playMiniGameSound('select');
}
