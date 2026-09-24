// ─── Speech-to-Text (STT) Dictation Subsystem ─────────────────────────────────

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

let activeSpeechRecognition: any = null;
let isDictating = false;
let isStarting = false;
let restartTimeoutId: any = null;
let sessionAccumulatedFinal = '';
let currentRunFinal = '';
let consecutiveErrors = 0;

export function sendDictationEvent(
  widgetIframe: HTMLIFrameElement | null,
  eventData: Record<string, unknown>
): void {
  if (widgetIframe?.contentWindow) {
    widgetIframe.contentWindow.postMessage(eventData, '*');
  }
  try {
    chrome.runtime.sendMessage(eventData).catch(() => {});
  } catch (_) {}
}

export function startDictation(widgetIframe: HTMLIFrameElement | null): void {
  if (isDictating || isStarting) return;
  isStarting = true;
  consecutiveErrors = 0;
  sessionAccumulatedFinal = '';
  currentRunFinal = '';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    sendDictationEvent(widgetIframe, {
      type: 'DICTATION_ERROR',
      error: 'Speech recognition is not supported in this browser.',
    });
    isStarting = false;
    return;
  }

  // Permission trigger via getUserMedia if needed
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        initRecognition();
      })
      .catch((err) => {
        console.warn('[Annotated STT] getUserMedia error:', err);
        initRecognition(); // Fall back to direct SpeechRecognition initiation
      });
  } else {
    initRecognition();
  }

  function initRecognition() {
    try {
      activeSpeechRecognition = new SpeechRecognition();
      activeSpeechRecognition.continuous = true;
      activeSpeechRecognition.interimResults = true;
      activeSpeechRecognition.lang = 'en-US';

      activeSpeechRecognition.onstart = () => {
        isDictating = true;
        isStarting = false;
        sendDictationEvent(widgetIframe, { type: 'DICTATION_STARTED' });
      };

      activeSpeechRecognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentRunFinal += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        sendDictationEvent(widgetIframe, {
          type: 'DICTATION_RESULT',
          text: (sessionAccumulatedFinal + currentRunFinal + interim).trim(),
          finalTranscript: (sessionAccumulatedFinal + currentRunFinal).trim(),
          interimTranscript: interim.trim(),
        });
      };

      activeSpeechRecognition.onerror = (event: any) => {
        console.warn('[Annotated STT] Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          cleanupSTT();
          sendDictationEvent(widgetIframe, {
            type: 'DICTATION_ERROR',
            error: 'Microphone permission denied.',
          });
          return;
        }
        if (event.error === 'no-speech') {
          return; // Ignore silence
        }
        consecutiveErrors++;
        if (consecutiveErrors > 3) {
          cleanupSTT();
          sendDictationEvent(widgetIframe, {
            type: 'DICTATION_ERROR',
            error: `Dictation failed: ${event.error}`,
          });
        }
      };

      activeSpeechRecognition.onend = () => {
        sessionAccumulatedFinal += currentRunFinal;
        currentRunFinal = '';
        if (isDictating) {
          // Restart loop if still intended to dictate
          restartTimeoutId = setTimeout(() => {
            if (isDictating && activeSpeechRecognition) {
              try {
                activeSpeechRecognition.start();
              } catch (_) {}
            }
          }, 200);
        } else {
          cleanupSTT();
          sendDictationEvent(widgetIframe, { type: 'DICTATION_ENDED' });
        }
      };

      activeSpeechRecognition.start();
    } catch (err: unknown) {
      cleanupSTT();
      sendDictationEvent(widgetIframe, {
        type: 'DICTATION_ERROR',
        error: `Could not start dictation: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
}

export function cleanupSTT(): void {
  isDictating = false;
  isStarting = false;
  if (restartTimeoutId) {
    clearTimeout(restartTimeoutId);
    restartTimeoutId = null;
  }
  if (activeSpeechRecognition) {
    try {
      activeSpeechRecognition.onstart = null;
      activeSpeechRecognition.onresult = null;
      activeSpeechRecognition.onerror = null;
      activeSpeechRecognition.onend = null;
      activeSpeechRecognition.stop();
      activeSpeechRecognition.abort();
    } catch (_) {}
    activeSpeechRecognition = null;
  }
}

export function stopDictation(widgetIframe: HTMLIFrameElement | null): void {
  isDictating = false;
  cleanupSTT();
  sendDictationEvent(widgetIframe, { type: 'DICTATION_ENDED' });
}
