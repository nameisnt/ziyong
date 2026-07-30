import { ref } from 'vue';

export function useSpeechInput() {
  const supported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const listening = ref(false);
  const transcript = ref('');
  const error = ref('');
  let recognition = null;

  function ensureRecognition() {
    if (!supported) return null;
    if (recognition) return recognition;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = event => {
      transcript.value = Array.from(event.results).map(result => result[0]?.transcript || '').join('');
    };
    recognition.onerror = event => {
      error.value = event.error || '语音识别失败';
      listening.value = false;
    };
    recognition.onend = () => {
      listening.value = false;
    };
    return recognition;
  }

  function start() {
    error.value = '';
    if (!supported) {
      error.value = '当前浏览器不支持 Web Speech API';
      return false;
    }
    if (listening.value) return true;
    transcript.value = '';
    const instance = ensureRecognition();
    try {
      instance.start();
      listening.value = true;
      return true;
    } catch (caughtError) {
      if (caughtError.name === 'InvalidStateError') return true;
      error.value = caughtError.message || '语音识别启动失败';
      listening.value = false;
      return false;
    }
  }

  function stop() {
    if (!recognition) return;
    try { recognition.stop(); } catch {}
    listening.value = false;
  }

  return { supported, listening, transcript, error, start, stop };
}
