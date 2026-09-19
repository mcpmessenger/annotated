// Offscreen Document Audio Playback Bridge
// Allows captured tab audio to play directly through system speakers without feedback into tabCapture

let activePc = null;
let activeAudio = null;
let activeAudioCtx = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OFFSCREEN_START_AUDIO_BRIDGE') {
    handleAudioBridge(msg.sdp, sendResponse);
    return true; // async response
  }
  if (msg.type === 'OFFSCREEN_STOP_AUDIO_BRIDGE') {
    cleanupAudio();
    sendResponse({ ok: true });
    return false;
  }
});

async function handleAudioBridge(offerSdp, sendResponse) {
  cleanupAudio();
  try {
    const pc = new RTCPeerConnection();
    activePc = pc;

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      try {
        const audio = new Audio();
        audio.srcObject = stream;
        audio.volume = 1.0;
        audio.play().catch(() => {
          // Fallback to AudioContext if HTMLAudioElement fails
          try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtxClass({ latencyHint: 'playback' });
            if (ctx.state === 'suspended') ctx.resume();
            const src = ctx.createMediaStreamSource(stream);
            src.connect(ctx.destination);
            activeAudioCtx = ctx;
          } catch (_) {}
        });
        activeAudio = audio;
      } catch (err) {
        console.warn('[Annotated Offscreen] Playback init warning:', err);
      }
    };

    await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering to complete so host candidates are embedded
    if (pc.iceGatheringState !== 'complete') {
      await new Promise((resolve) => {
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 60);
      });
    }

    sendResponse({ sdp: pc.localDescription.sdp });
  } catch (err) {
    console.warn('[Annotated Offscreen] Bridge error:', err);
    sendResponse({ error: err.message });
  }
}

function cleanupAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.srcObject = null;
    } catch (_) {}
    activeAudio = null;
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch (_) {}
    activeAudioCtx = null;
  }
  if (activePc) {
    try {
      activePc.close();
    } catch (_) {}
    activePc = null;
  }
}
