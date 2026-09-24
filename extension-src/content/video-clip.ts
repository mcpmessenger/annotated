// ─── Multimodal 240p Video Clipper & Audio Fusion Subsystem ───────────────────

declare global {
  interface Window {
    ysFixWebmDuration?: (blob: Blob, duration: number, callback: (fixedBlob: Blob) => void) => void;
  }
}

let activeVideoRecorder: MediaRecorder | null = null;
let activeRecordStream: MediaStream | null = null;
let activeAudioStream: MediaStream | null = null;
let activeSpeakerBridge: RTCPeerConnection | null = null;
let activeVideoEl: HTMLVideoElement | null = null;
let activeAnimFrameId: number | null = null;
let isRecordingVideo = false;
let pendingSendResponse: ((response: unknown) => void) | null = null;

export async function startOffscreenSpeakerBridge(audioStream: MediaStream): Promise<RTCPeerConnection | null> {
  try {
    const pc = new RTCPeerConnection();
    audioStream.getAudioTracks().forEach((track) => pc.addTrack(track, audioStream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' });

    const answer = await new Promise<any>((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'OFFSCREEN_START_AUDIO_BRIDGE', sdp: offer.sdp },
        (res) => resolve(res)
      );
    });

    if (answer?.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer.sdp }));
      return pc;
    }
  } catch (err) {
    console.warn('[Annotated Bridge] Speaker bridge failed:', err);
  }
  return null;
}

export function stopOffscreenSpeakerBridge(): void {
  if (activeSpeakerBridge) {
    try {
      activeSpeakerBridge.close();
    } catch (_) {}
    activeSpeakerBridge = null;
  }
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_AUDIO_BRIDGE' }).catch(() => {});
}

export function stopRecordingNow(): void {
  if (isRecordingVideo && activeVideoRecorder && activeVideoRecorder.state !== 'inactive') {
    try {
      activeVideoRecorder.stop();
    } catch (_) {}
  }
}

export async function capture240pVideoClip(
  durationSeconds: number = 15,
  sendResponse: (res: unknown) => void
): Promise<void> {
  if (isRecordingVideo) {
    sendResponse({ error: 'Video recording already in progress' });
    return;
  }

  const videoEl = document.querySelector('video');
  if (!videoEl) {
    sendResponse({ error: 'No video playing on page' });
    return;
  }

  isRecordingVideo = true;
  pendingSendResponse = sendResponse;
  activeVideoEl = videoEl;
  const startTs = Math.floor(videoEl.currentTime || 0);

  const canvas = document.createElement('canvas');
  canvas.width = 426;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  const canvasStream = canvas.captureStream(24);
  const renderLoop = () => {
    if (!isRecordingVideo) return;
    if (ctx && activeVideoEl && !activeVideoEl.paused && !activeVideoEl.ended) {
      ctx.drawImage(activeVideoEl, 0, 0, canvas.width, canvas.height);
    }
    activeAnimFrameId = requestAnimationFrame(renderLoop);
  };
  renderLoop();

  let finalStream = canvasStream;
  let audioContext: AudioContext | null = null;

  try {
    const tabStreamId = await new Promise<string | null>((resolve) => {
      chrome.runtime.sendMessage({ type: 'getTabAudioStreamId' }, (res) => {
        resolve(res?.streamId || null);
      });
    });

    if (tabStreamId) {
      activeAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: tabStreamId,
          },
        } as any,
        video: false,
      });

      activeSpeakerBridge = await startOffscreenSpeakerBridge(activeAudioStream);
      finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...activeAudioStream.getAudioTracks(),
      ]);
    }
  } catch (err) {
    console.warn('[Annotated Video] Tab audio capture fallback:', err);
    try {
      audioContext = new AudioContext();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0; // Silent audio
      osc.connect(gain);
      const dest = audioContext.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
    } catch (_) {}
  }

  activeRecordStream = finalStream;
  const chunks: Blob[] = [];

  try {
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

    activeVideoRecorder = new MediaRecorder(finalStream, {
      mimeType,
      videoBitsPerSecond: 600000,
    });

    activeVideoRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    activeVideoRecorder.onstop = () => {
      isRecordingVideo = false;
      if (activeAnimFrameId) cancelAnimationFrame(activeAnimFrameId);
      stopOffscreenSpeakerBridge();
      if (activeAudioStream) {
        activeAudioStream.getTracks().forEach((t) => t.stop());
        activeAudioStream = null;
      }
      if (canvasStream) canvasStream.getTracks().forEach((t) => t.stop());
      if (audioContext) audioContext.close().catch(() => {});

      const endTs = Math.floor(videoEl.currentTime || startTs + durationSeconds);
      const rawBlob = new Blob(chunks, { type: 'video/webm' });
      const durationMs = (endTs - startTs) * 1000;

      const finishWithBlob = (blob: Blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (pendingSendResponse) {
            pendingSendResponse({
              dataUrl: reader.result,
              duration: Math.max(1, endTs - startTs),
              startTs,
              endTs,
            });
            pendingSendResponse = null;
          }
        };
        reader.readAsDataURL(blob);
      };

      if (window.ysFixWebmDuration) {
        window.ysFixWebmDuration(rawBlob, durationMs, (fixedBlob) => {
          finishWithBlob(fixedBlob);
        });
      } else {
        finishWithBlob(rawBlob);
      }
    };

    activeVideoRecorder.start(500);

    setTimeout(() => {
      if (isRecordingVideo && activeVideoRecorder && activeVideoRecorder.state !== 'inactive') {
        stopRecordingNow();
      }
    }, durationSeconds * 1000);
  } catch (err: unknown) {
    isRecordingVideo = false;
    sendResponse({ error: err instanceof Error ? err.message : String(err) });
  }
}
