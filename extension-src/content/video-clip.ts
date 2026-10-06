import { getActiveVideoElement } from './selection';

function getVideoKey(): string {
  try {
    const u = new URL(location.href);
    if (u.hostname.includes('youtube.com')) {
      const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      return u.searchParams.get('v') || (shorts ? shorts[1] : u.pathname);
    }
    return u.origin + u.pathname;
  } catch (_) {
    return location.href;
  }
}

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
let stopRequested = false;
let pendingSendResponse: ((response: unknown) => void) | null = null;

export async function startOffscreenSpeakerBridge(audioStream: MediaStream): Promise<RTCPeerConnection | null> {
  try {
    const pc = new RTCPeerConnection();
    audioStream.getAudioTracks().forEach((track) => pc.addTrack(track, audioStream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime && typeof chrome.runtime.sendMessage === 'function') {
        await chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' });
      }
    } catch (_) {}

    const answer = await new Promise<any>((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome?.runtime && typeof chrome.runtime.sendMessage === 'function') {
          chrome.runtime.sendMessage(
            { type: 'OFFSCREEN_START_AUDIO_BRIDGE', sdp: offer.sdp },
            (res) => {
              if (chrome.runtime?.lastError) {
                // Silently swallow context invalidation
              }
              resolve(res);
            }
          );
        } else {
          resolve(null);
        }
      } catch (_) {
        resolve(null);
      }
    });

    if (answer?.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer.sdp }));
      return pc;
    }
  } catch (err) {
    // Only warn if not extension context invalidated
    if (!(err instanceof Error && err.message?.includes('context invalidated'))) {
      console.debug('[Annotated Bridge] Speaker bridge note:', err);
    }
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
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      const p = chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_AUDIO_BRIDGE' });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  } catch (_) {}
}

export function stopRecordingNow(): void {
  stopRequested = true;
  if (activeVideoRecorder && activeVideoRecorder.state !== 'inactive') {
    try {
      activeVideoRecorder.stop();
    } catch (_) {}
  } else if (isRecordingVideo && pendingSendResponse) {
    isRecordingVideo = false;
    pendingSendResponse({ error: 'Video capture stopped before media was ready' });
    pendingSendResponse = null;
  }
}

export async function capture240pVideoClip(
  durationSeconds: number = 90,
  sendResponse: (res: unknown) => void,
  startTsParam?: number,
  endTsParam?: number,
  isLiveRecord?: boolean
): Promise<void> {
  if (isRecordingVideo) {
    sendResponse({ error: 'Video recording already in progress' });
    return;
  }

  const videoEl = getActiveVideoElement() || (document.querySelector('video') as HTMLVideoElement | null);
  if (!videoEl) {
    sendResponse({ error: 'No video playing on page' });
    return;
  }

  // If live recording: do NOT seek, start immediately and ensure video plays
  if (isLiveRecord) {
    try {
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    } catch (_) {}
  } else if (startTsParam != null && startTsParam >= 0) {
    // Range grab: seek video to start point first
    try {
      const moviePlayer = document.getElementById('movie_player') as any;
      if (moviePlayer && typeof moviePlayer.seekTo === 'function') {
        moviePlayer.seekTo(startTsParam, true);
        if (typeof moviePlayer.playVideo === 'function') moviePlayer.playVideo();
      } else {
        videoEl.currentTime = startTsParam;
        videoEl.play().catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 250));
    } catch (_) {}
  }

  if (endTsParam != null && startTsParam != null && endTsParam > startTsParam && !isLiveRecord) {
    durationSeconds = Math.min(90, Math.max(1, endTsParam - startTsParam));
  } else if (!durationSeconds || durationSeconds <= 0) {
    durationSeconds = 90;
  } else if (durationSeconds > 90) {
    durationSeconds = 90;
  }

  isRecordingVideo = true;
  stopRequested = false;
  pendingSendResponse = sendResponse;
  activeVideoEl = videoEl;
  const sourceVideoKey = getVideoKey();
  const startTs = isLiveRecord ? Math.floor(videoEl.currentTime || 0) : (startTsParam != null ? startTsParam : Math.floor(videoEl.currentTime || 0));

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
    const tabStreamId = await Promise.race([
      new Promise<string | null>((resolve) => {
        try {
          if (typeof chrome !== 'undefined' && chrome?.runtime && typeof chrome.runtime.sendMessage === 'function') {
            chrome.runtime.sendMessage({ type: 'getTabAudioStreamId' }, (res) => {
              if (chrome.runtime?.lastError) {
                resolve(null);
                return;
              }
              resolve(res?.streamId || null);
            });
          } else {
            resolve(null);
          }
        } catch (_) {
          resolve(null);
        }
      }),
      new Promise<null>((r) => setTimeout(() => r(null), 1200)),
    ]);

    if (tabStreamId && !stopRequested) {
      try {
        const streamPromise = navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: tabStreamId,
            },
          } as any,
          video: false,
        });
        const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 1500));
        const resStream = await Promise.race([streamPromise, timeoutPromise]);
        if (resStream && !stopRequested) {
          activeAudioStream = resStream;
          activeSpeakerBridge = await startOffscreenSpeakerBridge(activeAudioStream);
          finalStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...activeAudioStream.getAudioTracks(),
          ]);
        }
      } catch (_) {}
    }
  } catch (err) {
    if (!(err instanceof Error && err.message?.includes('context invalidated'))) {
      console.debug('[Annotated Video] Tab audio capture fallback note:', err);
    }
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

  if (stopRequested) {
    isRecordingVideo = false;
    if (activeAnimFrameId) cancelAnimationFrame(activeAnimFrameId);
    stopOffscreenSpeakerBridge();
    if (activeAudioStream) {
      activeAudioStream.getTracks().forEach((t) => t.stop());
      activeAudioStream = null;
    }
    if (canvasStream) canvasStream.getTracks().forEach((t) => t.stop());
    if (pendingSendResponse) {
      pendingSendResponse({ error: 'Video capture stopped' });
      pendingSendResponse = null;
    }
    return;
  }

  activeRecordStream = finalStream;
  const chunks: Blob[] = [];

  try {
    // Prefer video/mp4 with H.264/AAC for universal cross-platform playback (Roku, iOS, Safari, Web)
    const mp4Mimes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];
    const webmMimes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    let selectedMime = '';
    for (const m of mp4Mimes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }
    if (!selectedMime) {
      for (const m of webmMimes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }
    }

    const mimeType = selectedMime || 'video/webm';
    const isMp4 = mimeType.startsWith('video/mp4');

    activeVideoRecorder = new MediaRecorder(finalStream, {
      mimeType,
      videoBitsPerSecond: 600000,
    });

    activeVideoRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    activeVideoRecorder.onerror = (e) => {
      console.warn('[Annotated Video] MediaRecorder error:', e);
      stopRecordingNow();
    };

    activeVideoRecorder.onstop = () => {
      try {
        isRecordingVideo = false;
        if (activeAnimFrameId) cancelAnimationFrame(activeAnimFrameId);
        stopOffscreenSpeakerBridge();
        if (activeAudioStream) {
          activeAudioStream.getTracks().forEach((t) => t.stop());
          activeAudioStream = null;
        }
        if (canvasStream) canvasStream.getTracks().forEach((t) => t.stop());
        if (audioContext) audioContext.close().catch(() => {});

        if (getVideoKey() !== sourceVideoKey) {
          if (pendingSendResponse) {
            pendingSendResponse({ error: 'Page switched to a different video during recording — clip discarded. Please re-record.' });
            pendingSendResponse = null;
          }
          return;
        }

        const endTs = endTsParam != null && !isLiveRecord ? endTsParam : Math.max(startTs + 1, Math.floor(videoEl.currentTime || startTs + 1));
        const outputMime = isMp4 ? 'video/mp4' : 'video/webm';
        const rawBlob = new Blob(chunks, { type: outputMime });
        const durationMs = Math.max(1000, (endTs - startTs) * 1000);

        let hasFinished = false;
        const finishWithBlob = (blob: Blob) => {
          if (hasFinished) return;
          hasFinished = true;
          const reader = new FileReader();
          reader.onloadend = () => {
            if (pendingSendResponse) {
              pendingSendResponse({
                dataUrl: reader.result,
                duration: Math.max(1, endTs - startTs),
                startTs,
                endTs,
                mimeType: blob.type || outputMime,
              });
              pendingSendResponse = null;
            }
          };
          reader.onerror = () => {
            if (pendingSendResponse) {
              pendingSendResponse({ error: 'Failed to read recorded video blob' });
              pendingSendResponse = null;
            }
          };
          reader.readAsDataURL(blob);
        };

        // Safety fallback timer to prevent hanging
        const hardTimeout = setTimeout(() => {
          if (!hasFinished) {
            finishWithBlob(rawBlob);
          }
        }, 1200);

        // Only fix WebM duration header if it's WebM (ysFixWebmDuration would corrupt MP4 moov atoms)
        if (!isMp4 && typeof window.ysFixWebmDuration === 'function') {
          try {
            window.ysFixWebmDuration(rawBlob, durationMs, (fixedBlob) => {
              clearTimeout(hardTimeout);
              finishWithBlob(fixedBlob || rawBlob);
            });
          } catch (_) {
            clearTimeout(hardTimeout);
            finishWithBlob(rawBlob);
          }
        } else {
          clearTimeout(hardTimeout);
          finishWithBlob(rawBlob);
        }
      } catch (err: unknown) {
        if (pendingSendResponse) {
          pendingSendResponse({ error: err instanceof Error ? err.message : String(err) });
          pendingSendResponse = null;
        }
      }
    };

    activeVideoRecorder.start(500);

    if (stopRequested) {
      stopRecordingNow();
      return;
    }

    setTimeout(() => {
      if (isRecordingVideo && activeVideoRecorder && activeVideoRecorder.state !== 'inactive') {
        stopRecordingNow();
      }
    }, durationSeconds * 1000);
  } catch (err: unknown) {
    isRecordingVideo = false;
    sendResponse({ error: err instanceof Error ? err.message : String(err) });
    pendingSendResponse = null;
  }
}
