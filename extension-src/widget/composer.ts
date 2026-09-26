// ─── Annotation Composer Module ──────────────────────────────────────────────

import { $, $$ } from '../shared/dom';
import { formatSeconds, parseFormattedTime, escapeHtml } from '../shared/utils';
import { publishAnnotation } from './publish';
import { callFactCheckApi } from './factcheck';
import type { CurrentUser, PageContext } from '../types/annotation';

export interface ComposerState {
  quote: string;
  intent: string | null;
  mediaDataUrl: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  videoClipBlob: Blob | null;
  videoStartTs: number | null;
  videoEndTs: number | null;
  recordedAudioBlob: Blob | null;
  currentMediaTimestamp: number | null;
}

export const composerState: ComposerState = {
  quote: '',
  intent: null,
  mediaDataUrl: null,
  mediaType: null,
  mediaFileName: null,
  videoClipBlob: null,
  videoStartTs: null,
  videoEndTs: null,
  recordedAudioBlob: null,
  currentMediaTimestamp: null,
};

let moduleGetPage: (() => PageContext) | null = null;
let moduleOnResize: ((h: number) => void) | null = null;
let factCheckDebounce: any = null;

// Video Clipper & Trimmer State
let hostVideoDuration = 90;
let videoTotalDuration = 90;
let videoCurrentPlayhead = 0;
let isGrabbingClip = false;
let isPreviewLooping = false;
let trimStart = 0;
let trimEnd = 90;
let grabTimerInterval: any = null;
let grabElapsedSeconds = 0;
let grabTargetDuration = 90;
let shouldSnapStartOnNextState = false;
let isLiveRecording = false;

export function stopGrabTimer(): void {
  if (grabTimerInterval) {
    clearInterval(grabTimerInterval);
    grabTimerInterval = null;
  }
  grabElapsedSeconds = 0;
  isLiveRecording = false;

  const grabBtn = $('#grabClipBtn') as HTMLButtonElement | null;
  if (grabBtn) {
    grabBtn.classList.remove('recording');
    grabBtn.classList.remove('grabbing');
    grabBtn.disabled = false;
  }
  const recBtn = $('#recordNowBtn') as HTMLButtonElement | null;
  if (recBtn) {
    recBtn.classList.remove('recording');
    recBtn.disabled = false;
  }
  const recIcon = $('#recordNowBtnIcon');
  const recLabel = $('#recordNowBtnLabel');
  if (recIcon) recIcon.textContent = '🔴';
  if (recLabel) recLabel.textContent = composerState.videoClipBlob ? 'Re-record' : 'Record Now';

  const grabIcon = $('#grabClipBtnIcon');
  const grabLabel = $('#grabClipBtnLabel');
  if (grabIcon) grabIcon.textContent = '✂️';
  if (grabLabel) grabLabel.textContent = composerState.videoClipBlob ? 'Re-grab' : 'Grab Range';
}

export function stopActiveRecording(): void {
  stopGrabTimer();
  isGrabbingClip = false;
  const clipVideoBtn = $('#clipVideoBtn');
  if (clipVideoBtn) {
    clipVideoBtn.innerText = '⏳';
    clipVideoBtn.classList.remove('recording');
  }
  const recLabel = $('#recordNowBtnLabel');
  if (recLabel) recLabel.textContent = 'Saving...';
  const recIcon = $('#recordNowBtnIcon');
  if (recIcon) recIcon.textContent = '⏳';

  const grabLabel = $('#grabClipBtnLabel');
  if (grabLabel) grabLabel.textContent = 'Saving...';
  const grabIcon = $('#grabClipBtnIcon');
  if (grabIcon) grabIcon.textContent = '⏳';

  window.parent.postMessage({ type: 'STOP_VIDEO' }, '*');
  chrome.runtime.sendMessage({ type: 'stopVideo' }).catch(() => {});
}

export function startGrabTimer(targetDuration: number, isLive: boolean = false): void {
  stopGrabTimer();
  grabElapsedSeconds = 0;
  grabTargetDuration = Math.max(1, targetDuration);
  isLiveRecording = isLive;

  const grabBtn = $('#grabClipBtn') as HTMLButtonElement | null;
  const recBtn = $('#recordNowBtn') as HTMLButtonElement | null;
  const recIcon = $('#recordNowBtnIcon');
  const recLabel = $('#recordNowBtnLabel');
  const grabIcon = $('#grabClipBtnIcon');
  const grabLabel = $('#grabClipBtnLabel');
  const playheadMarker = $('#trimmerPlayheadMarker');
  const playheadLabel = $('#timelineCurrentPlayheadLabel');

  if (isLive) {
    if (recBtn) recBtn.classList.add('recording');
    if (recIcon) recIcon.textContent = '⏹';
    if (recLabel) recLabel.textContent = 'Stop (00:00)';
    if (grabBtn) grabBtn.disabled = true;
  } else {
    if (grabBtn) {
      grabBtn.classList.add('grabbing');
      grabBtn.classList.add('recording');
    }
    if (grabIcon) grabIcon.textContent = '🔴';
    if (grabLabel) grabLabel.textContent = `Recording 00:00 / ${formatSeconds(grabTargetDuration)}`;
    if (recBtn) recBtn.disabled = true;
  }

  const liveStartPoint = isLive ? videoCurrentPlayhead : trimStart;
  const maxBound = Math.max(90, videoTotalDuration);
  if (playheadMarker) {
    playheadMarker.style.display = 'block';
    playheadMarker.style.left = `${Math.min(100, Math.max(0, (liveStartPoint / maxBound) * 100))}%`;
  }
  if (playheadLabel) {
    playheadLabel.textContent = formatSeconds(liveStartPoint);
  }

  grabTimerInterval = setInterval(() => {
    grabElapsedSeconds += 1;
    const currentRecorded = Math.min(grabElapsedSeconds, grabTargetDuration);

    if (isLive) {
      if (recLabel) recLabel.textContent = `Stop (${formatSeconds(currentRecorded)})`;
    } else {
      if (grabLabel) {
        grabLabel.textContent = `Recording ${formatSeconds(currentRecorded)} / ${formatSeconds(grabTargetDuration)}`;
      }
    }

    const currentPlayhead = liveStartPoint + currentRecorded;
    if (playheadMarker) {
      playheadMarker.style.left = `${Math.min(100, Math.max(0, (currentPlayhead / maxBound) * 100))}%`;
    }
    if (playheadLabel) {
      playheadLabel.textContent = formatSeconds(currentPlayhead);
    }

    if (grabElapsedSeconds >= grabTargetDuration) {
      if (isLive) {
        if (recLabel) recLabel.textContent = 'Processing clip...';
        if (recIcon) recIcon.textContent = '⏳';
      } else {
        if (grabLabel) grabLabel.textContent = 'Processing clip...';
        if (grabIcon) grabIcon.textContent = '⏳';
      }
      if (recBtn) recBtn.classList.remove('recording');
      if (grabBtn) grabBtn.classList.remove('recording');
      clearInterval(grabTimerInterval);
      grabTimerInterval = null;
    }
  }, 1000);
}

export function getComposerHeight(): number {
  let base = 370;
  const videoTrimmerBox = $('#videoTrimmerBox');
  const isTrimmerOpen = videoTrimmerBox && !videoTrimmerBox.classList.contains('hidden');

  if (composerState.videoClipBlob) {
    base = 510;
  } else if (isTrimmerOpen) {
    base = 450;
  } else if (composerState.mediaDataUrl) {
    base = 460;
  }
  const factBox = $('#composerFactCheckBox');
  if (factBox && factBox.style.display !== 'none') {
    base += 80;
  }
  return base;
}

export function hideComposerFactCheck(onResize?: (height: number) => void): void {
  const fb = $('#composerFactCheckBox');
  if (fb) fb.style.display = 'none';
  if (onResize) onResize(getComposerHeight());
}

export function triggerComposerFactCheck(
  getPage: () => PageContext,
  onResize: (height: number) => void
): void {
  const quote = composerState.quote.trim();
  const commentEl = $('#comment') as HTMLTextAreaElement | null;
  const comment = commentEl ? commentEl.value.trim() : '';
  const pageCtx = getPage();

  const isVideoPage = !!(pageCtx.url && (pageCtx.url.includes('youtube.com') || pageCtx.url.includes('youtu.be') || pageCtx.url.includes('vimeo.com') || pageCtx.url.includes('tiktok.com')));
  const hasVideoClip = !!(composerState.videoClipBlob || composerState.videoStartTs != null);
  const hasVideoPlayhead = videoCurrentPlayhead > 0 || composerState.currentMediaTimestamp != null;
  const isVideo = hasVideoClip || hasVideoPlayhead || isVideoPage;

  const composerFactCheckBox = $('#composerFactCheckBox');
  const composerFactCheckBadge = $('#composerFactCheckBadge');
  const composerFactCheckText = $('#composerFactCheckText');

  if (!quote && !isVideo && !composerState.mediaDataUrl) {
    if (composerFactCheckBox) {
      composerFactCheckBox.style.display = 'block';
    }
    if (composerFactCheckBadge) {
      composerFactCheckBadge.textContent = 'AI READY';
      composerFactCheckBadge.style.color = 'var(--muted)';
    }
    if (composerFactCheckText) {
      composerFactCheckText.textContent = 'Highlight text on the page or clip a video to fact-check with Gemini AI.';
    }
    onResize(getComposerHeight());
    return;
  }

  if (composerFactCheckBox) {
    composerFactCheckBox.style.display = 'block';
  }
  if (composerFactCheckBadge) {
    composerFactCheckBadge.textContent = 'ANALYZING';
    composerFactCheckBadge.style.color = 'var(--muted)';
  }
  if (composerFactCheckText) {
    if (quote) {
      composerFactCheckText.textContent = 'Analyzing highlighted quote with Google Gemini...';
    } else if (isVideo) {
      const startTs = composerState.videoStartTs ?? (videoCurrentPlayhead > 0 ? videoCurrentPlayhead : composerState.currentMediaTimestamp ?? 0);
      const endTs = composerState.videoEndTs ?? (startTs + 15);
      composerFactCheckText.textContent = `Analyzing video clip (${formatSeconds(startTs)} - ${formatSeconds(endTs)}) with Google Gemini...`;
    } else {
      composerFactCheckText.textContent = 'Analyzing attached media with Google Gemini...';
    }
  }
  onResize(getComposerHeight());

  if (factCheckDebounce) clearTimeout(factCheckDebounce);
  factCheckDebounce = setTimeout(async () => {
    try {
      const startTs = composerState.videoStartTs ?? (videoCurrentPlayhead > 0 ? videoCurrentPlayhead : composerState.currentMediaTimestamp ?? null);
      const endTs = composerState.videoEndTs ?? (startTs != null ? startTs + 15 : null);

      let effectiveQuote = quote;
      if (!effectiveQuote && isVideo) {
        const startFmt = formatSeconds(startTs || 0);
        const endFmt = formatSeconds(endTs || 0);
        if (pageCtx.video_captions) {
          effectiveQuote = `[Video dialogue at ${startFmt}]: "${pageCtx.video_captions}"`;
        } else {
          effectiveQuote = `Video clip (${startFmt} - ${endFmt}) from "${pageCtx.title || 'Video'}"`;
        }
      }

      const data = await callFactCheckApi({
        quote: effectiveQuote || undefined,
        commentary: comment || undefined, // strictly user notes / reaction, NOT the claim!
        sourceUrl: pageCtx.url || location.href,
        sourceTitle: pageCtx.title || document.title,
        timestamp: startTs,
        videoStartTs: startTs,
        videoEndTs: endTs,
        isVideoClip: hasVideoClip || isVideo,
        videoCaptions: pageCtx.video_captions || undefined,
        mediaUrl: composerState.mediaDataUrl ?? null,
      });

      if (composerFactCheckBadge) {
        composerFactCheckBadge.textContent = (data.verdict || 'ANALYZED').replace('_', ' ');
        composerFactCheckBadge.style.color =
          data.verdict === 'VERIFIED'
            ? '#22c55e'
            : data.verdict === 'MISLEADING' || data.verdict === 'FALSE'
            ? '#ef4444'
            : '#eab308';
      }
      if (composerFactCheckText) {
        composerFactCheckText.innerHTML = `<strong>${escapeHtml(data.headline || '')}</strong><br><span style="font-size:10px; color:var(--muted);">${escapeHtml(data.explanation || '')}</span>`;
      }
      onResize(getComposerHeight());
    } catch (err: unknown) {
      if (composerFactCheckText) {
        composerFactCheckText.textContent = `Fact check note: ${err instanceof Error ? err.message : String(err)}`;
      }
      if (composerFactCheckBadge) {
        composerFactCheckBadge.textContent = 'NOTICE';
        composerFactCheckBadge.style.color = '#eab308';
      }
      onResize(getComposerHeight());
    }
  }, 350);
}

export function updatePublishButton(): void {
  const commentEl = $('#comment') as HTMLTextAreaElement | null;
  const c = commentEl ? commentEl.value.trim() : '';
  const canPublish =
    c.length > 0 ||
    !!composerState.videoClipBlob ||
    !!composerState.mediaDataUrl ||
    !!composerState.recordedAudioBlob ||
    !!composerState.quote;
  const pubBtn = $('#publishBtn') as HTMLButtonElement | null;
  if (pubBtn) {
    pubBtn.disabled = !canPublish;
  }
}

export function setQuote(value: string): void {
  const clean = (value || '').trim().replace(/^["“](.*)["”]$/s, '$1').trim();
  composerState.quote = clean;
  const qEl = $('#quote');
  if (qEl) {
    qEl.textContent = composerState.quote || 'Select text on any page to anchor a comment here.';
  }
  const fb = $('#composerFactCheckBox');
  if (fb && fb.style.display !== 'none' && clean && moduleGetPage && moduleOnResize) {
    triggerComposerFactCheck(moduleGetPage, moduleOnResize);
  }
  updatePublishButton();
}

export function setMedia(
  dataUrl: string,
  type: string,
  name: string,
  onResize: (height: number) => void
): void {
  composerState.mediaDataUrl = dataUrl;
  composerState.mediaType = type;
  composerState.mediaFileName = name;

  const previewImg = $('#previewImg') as HTMLImageElement | null;
  const previewVideo = $('#previewVideo') as HTMLVideoElement | null;
  const mediaPreviewIcon = $('#mediaPreviewIcon');
  const previewName = $('#previewName');
  const mediaPreview = $('#mediaPreview');

  if (previewImg) previewImg.classList.add('hidden');
  if (previewVideo) previewVideo.classList.add('hidden');

  if (type === 'video') {
    if (previewVideo) {
      previewVideo.src = dataUrl;
      previewVideo.classList.remove('hidden');
    }
    if (mediaPreviewIcon) mediaPreviewIcon.textContent = '🎬';
  } else {
    if (previewImg) {
      previewImg.src = dataUrl;
      previewImg.classList.remove('hidden');
    }
    if (mediaPreviewIcon) mediaPreviewIcon.textContent = '📸';
  }

  if (previewName) {
    previewName.textContent = name.length > 25 ? `${name.slice(0, 22)}...` : name;
  }
  if (mediaPreview) mediaPreview.classList.remove('hidden');

  onResize(getComposerHeight());
  updatePublishButton();
}

export function removeMedia(onResize: (height: number) => void): void {
  composerState.mediaDataUrl = null;
  composerState.mediaType = null;
  composerState.mediaFileName = null;

  const previewImg = $('#previewImg') as HTMLImageElement | null;
  const previewVideo = $('#previewVideo') as HTMLVideoElement | null;
  const mediaInput = $('#mediaInput') as HTMLInputElement | null;
  const mediaPreview = $('#mediaPreview');

  if (previewImg) previewImg.src = '';
  if (previewVideo) previewVideo.src = '';
  if (mediaInput) mediaInput.value = '';
  if (mediaPreview) mediaPreview.classList.add('hidden');

  onResize(getComposerHeight());
  updatePublishButton();
}

export function updateVideoState(currentTime: number, duration: number, _paused?: boolean): void {
  if (duration && duration > 0) {
    hostVideoDuration = Math.round(duration);
    videoTotalDuration = Math.max(90, hostVideoDuration);
  } else {
    videoTotalDuration = Math.max(90, videoTotalDuration);
  }
  videoCurrentPlayhead = Math.max(0, Math.round(currentTime || 0));

  // If trimmer is open and no clip blob exists yet:
  // Auto-snap START to active video playhead so trimmer opens to the exact moment!
  const box = $('#videoTrimmerBox');
  const isTrimmerOpen = box && !box.classList.contains('hidden');
  if (!composerState.videoClipBlob && isTrimmerOpen) {
    if (shouldSnapStartOnNextState || trimStart === 0) {
      if (videoCurrentPlayhead > 0) {
        trimStart = videoCurrentPlayhead;
        trimEnd = Math.min(videoTotalDuration, trimStart + 90);
        shouldSnapStartOnNextState = false;
        syncTrimUI('external');
      }
    }
  }

  const playheadMarker = $('#trimmerPlayheadMarker');
  const playheadLabel = $('#timelineCurrentPlayheadLabel');
  const endLabel = $('#timelineEndLabel');
  const sliderStart = $('#trimStartSlider') as HTMLInputElement | null;
  const sliderEnd = $('#trimEndSlider') as HTMLInputElement | null;

  const bound = Math.max(90, videoTotalDuration);
  if (sliderStart) sliderStart.max = String(bound);
  if (sliderEnd) sliderEnd.max = String(bound);
  if (endLabel) endLabel.textContent = formatSeconds(bound);

  if (playheadMarker && bound > 0 && !isGrabbingClip) {
    const pct = Math.min(100, Math.max(0, (videoCurrentPlayhead / bound) * 100));
    playheadMarker.style.left = `${pct}%`;
    playheadMarker.style.display = 'block';
  }
  if (playheadLabel && !composerState.videoClipBlob && !isGrabbingClip) {
    playheadLabel.textContent = formatSeconds(videoCurrentPlayhead);
  }
}

export function syncTrimUI(source?: string): void {
  const sliderStart = $('#trimStartSlider') as HTMLInputElement | null;
  const sliderEnd = $('#trimEndSlider') as HTMLInputElement | null;
  const inputStart = $('#trimStartInput') as HTMLInputElement | null;
  const inputEnd = $('#trimEndInput') as HTMLInputElement | null;
  const fmtStart = $('#trimStartFormatted') as HTMLInputElement | null;
  const fmtEnd = $('#trimEndFormatted') as HTMLInputElement | null;
  const activeFill = $('#trimmerActiveFill');
  const durBadge = $('#trimDurationBadge');
  const durLabel = $('#trimDurationLabel');
  const startLabel = $('#timelineStartLabel');
  const endLabel = $('#timelineEndLabel');
  const previewVideo = $('#videoPreviewEl') as HTMLVideoElement | null;

  const maxBound = Math.max(90, videoTotalDuration);

  // Clamp rules:
  // 1. Duration between 1s and 90s
  // 2. 0 <= trimStart < trimEnd <= maxBound
  if (trimStart < 0) trimStart = 0;
  if (trimStart > maxBound - 1) trimStart = maxBound - 1;
  if (trimEnd < trimStart + 1) trimEnd = trimStart + 1;
  if (trimEnd > maxBound) trimEnd = maxBound;

  if (trimEnd - trimStart > 90) {
    if (source === 'slider-end' || source === 'input-stop' || source === 'end-step') {
      trimStart = Math.max(0, trimEnd - 90);
    } else {
      trimEnd = Math.min(maxBound, trimStart + 90);
    }
  }

  const duration = Math.min(90, Math.max(1, trimEnd - trimStart));

  // Sliders
  if (sliderStart) {
    sliderStart.max = String(maxBound);
    sliderStart.value = String(trimStart);
  }
  if (sliderEnd) {
    sliderEnd.max = String(maxBound);
    sliderEnd.value = String(trimEnd);
  }

  // Active Fill Bar
  if (activeFill) {
    const leftPct = (trimStart / maxBound) * 100;
    const widthPct = (duration / maxBound) * 100;
    activeFill.style.left = `${leftPct}%`;
    activeFill.style.width = `${widthPct}%`;
  }

  // Hidden inputs
  if (inputStart) inputStart.value = String(trimStart);
  if (inputEnd) inputEnd.value = String(trimEnd);

  // Formatted inputs (do not overwrite if currently focused by user)
  if (fmtStart && document.activeElement !== fmtStart) {
    fmtStart.value = formatSeconds(trimStart);
  }
  if (fmtEnd && document.activeElement !== fmtEnd) {
    fmtEnd.value = formatSeconds(trimEnd);
  }

  // Badges & Labels
  if (durBadge) durBadge.textContent = `${duration}s`;
  if (durLabel) durLabel.textContent = `${duration}s`;
  if (startLabel) startLabel.textContent = formatSeconds(0);
  if (endLabel) endLabel.textContent = formatSeconds(maxBound);

  // State
  composerState.videoStartTs = trimStart;
  composerState.videoEndTs = trimEnd;

  // Video preview or host seek
  if (previewVideo && previewVideo.src && !previewVideo.paused) {
    // let it play
  } else if (previewVideo && previewVideo.src) {
    if (source === 'slider-start' || source === 'input-start' || source === 'start-step') {
      previewVideo.currentTime = trimStart;
    } else if (source === 'slider-end' || source === 'input-stop' || source === 'end-step') {
      previewVideo.currentTime = trimEnd;
    }
  } else if (source === 'slider-start' || source === 'input-start' || source === 'start-step') {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'SEEK_MEDIA', seconds: trimStart }, '*');
    }
  }
}

export function openVideoTrimmer(onResize: (height: number) => void): void {
  const box = $('#videoTrimmerBox');
  if (!box) return;
  box.classList.remove('hidden');

  shouldSnapStartOnNextState = true;
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'GET_VIDEO_STATE' }, '*');
  }

  // Default start to current video playhead if active
  if (videoCurrentPlayhead > 0) {
    trimStart = videoCurrentPlayhead;
    trimEnd = Math.min(videoTotalDuration, trimStart + 90);
    shouldSnapStartOnNextState = false;
  } else if (trimStart === 0 && (trimEnd === 15 || trimEnd === 0)) {
    trimEnd = Math.min(videoTotalDuration, 90);
  }

  syncTrimUI('external');
  onResize(getComposerHeight());
}

export function handleVideoCaptured(data: any, onResize: (height: number) => void): void {
  stopGrabTimer();
  isGrabbingClip = false;
  const clipBtn = $('#clipVideoBtn');
  if (clipBtn) {
    clipBtn.classList.remove('recording');
    clipBtn.innerText = '🎥';
  }

  const grabClipBtn = $('#grabClipBtn') as HTMLButtonElement | null;
  const grabClipBtnIcon = $('#grabClipBtnIcon');
  const grabClipBtnLabel = $('#grabClipBtnLabel');
  if (grabClipBtn) {
    grabClipBtn.classList.remove('grabbing');
    grabClipBtn.classList.remove('recording');
    grabClipBtn.disabled = false;
  }
  if (grabClipBtnIcon) grabClipBtnIcon.textContent = '✂️';
  if (grabClipBtnLabel) grabClipBtnLabel.textContent = 'Re-grab Range';

  const recBtn = $('#recordNowBtn') as HTMLButtonElement | null;
  const recIcon = $('#recordNowBtnIcon');
  const recLabel = $('#recordNowBtnLabel');
  if (recBtn) {
    recBtn.classList.remove('recording');
    recBtn.disabled = false;
  }
  if (recIcon) recIcon.textContent = '🔴';
  if (recLabel) recLabel.textContent = 'Re-record';

  const loopBtn = $('#previewTrimLoopBtn');
  if (loopBtn) loopBtn.style.display = 'inline-flex';

  const modeBadge = $('#trimModeBadge');
  if (modeBadge) modeBadge.textContent = 'TRIMMED';

  if (data.error) {
    const statusEl = $('#status');
    if (statusEl) {
      statusEl.textContent = `Video grab error: ${data.error}`;
      setTimeout(() => {
        if (statusEl.textContent?.startsWith('Video grab error:')) statusEl.textContent = '';
      }, 4000);
    }
    return;
  }

  if (data.dataUrl) {
    fetch(data.dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        composerState.videoClipBlob = blob;
        if (data.startTs != null) composerState.videoStartTs = data.startTs;
        if (data.endTs != null) composerState.videoEndTs = data.endTs;

        const preview = $('#videoPreviewEl') as HTMLVideoElement | null;
        if (preview) {
          preview.src = URL.createObjectURL(blob);
          preview.load();
        }
        $('#videoTrimmerBox')?.classList.remove('hidden');
        onResize(getComposerHeight());
        updatePublishButton();

        // If fact check box is open, automatically update it for the captured video clip
        const fb = $('#composerFactCheckBox');
        if (fb && fb.style.display !== 'none' && moduleGetPage) {
          triggerComposerFactCheck(moduleGetPage, onResize);
        }
      });
  }
}

export function clearVideo(onResize: (height: number) => void): void {
  stopGrabTimer();
  composerState.videoClipBlob = null;
  composerState.videoStartTs = null;
  composerState.videoEndTs = null;
  isGrabbingClip = false;

  const videoTrimmerBox = $('#videoTrimmerBox');
  const videoPreviewEl = $('#videoPreviewEl') as HTMLVideoElement | null;
  const clipVideoBtn = $('#clipVideoBtn');
  const grabClipBtn = $('#grabClipBtn') as HTMLButtonElement | null;
  const grabClipBtnIcon = $('#grabClipBtnIcon');
  const grabClipBtnLabel = $('#grabClipBtnLabel');
  const recBtn = $('#recordNowBtn') as HTMLButtonElement | null;
  const recIcon = $('#recordNowBtnIcon');
  const recLabel = $('#recordNowBtnLabel');
  const trimModeBadge = $('#trimModeBadge');
  const loopBtn = $('#previewTrimLoopBtn');
  const playheadMarker = $('#trimmerPlayheadMarker');

  if (videoTrimmerBox) videoTrimmerBox.classList.add('hidden');
  if (videoPreviewEl) {
    videoPreviewEl.pause();
    videoPreviewEl.src = '';
  }
  if (clipVideoBtn) {
    clipVideoBtn.innerText = '🎥';
    clipVideoBtn.classList.remove('recording');
  }
  if (grabClipBtn) {
    grabClipBtn.disabled = false;
    grabClipBtn.classList.remove('grabbing');
    grabClipBtn.classList.remove('recording');
  }
  if (grabClipBtnIcon) grabClipBtnIcon.textContent = '✂️';
  if (grabClipBtnLabel) grabClipBtnLabel.textContent = 'Grab Range';
  if (recBtn) {
    recBtn.disabled = false;
    recBtn.classList.remove('recording');
  }
  if (recIcon) recIcon.textContent = '🔴';
  if (recLabel) recLabel.textContent = 'Record Now';
  if (trimModeBadge) trimModeBadge.textContent = 'CLIPPER';
  if (loopBtn) loopBtn.style.display = 'none';
  if (playheadMarker) playheadMarker.style.display = 'none';

  onResize(getComposerHeight());
  updatePublishButton();
}

export function showComposer(onResize: (height: number) => void): void {
  $('#annotationDetailCard')?.classList.add('hidden');
  $('#composerSection')?.classList.remove('hidden');
  onResize(getComposerHeight());
}

export function initComposer(
  getCurrentUser: () => CurrentUser | null,
  getPage: () => PageContext,
  onResize: (height: number) => void,
  onPublished: () => void,
  onRequireAuth?: () => void
): void {
  moduleGetPage = getPage;
  moduleOnResize = onResize;

  const commentEl = $('#comment') as HTMLTextAreaElement | null;
  const counterEl = $('#counter');
  const publishBtn = $('#publishBtn') as HTMLButtonElement | null;
  const statusEl = $('#status');

  // Input changes
  commentEl?.addEventListener('input', (e) => {
    const val = (e.target as HTMLTextAreaElement).value;
    if (counterEl) counterEl.textContent = String(val.length);
    updatePublishButton();
  });

  // Intent emoji selector (Quick React in composer)
  const emojiButtons = $$('.emoji-btn, [data-intent]');
  emojiButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const emoji = btn.dataset.emoji || btn.dataset.intent || btn.textContent?.trim();
      const isAlreadyActive = btn.classList.contains('active');

      emojiButtons.forEach((b) => {
        b.classList.remove('active');
        (b as HTMLElement).style.background = '';
        (b as HTMLElement).style.borderRadius = '';
      });

      if (isAlreadyActive) {
        composerState.intent = null;
      } else {
        btn.classList.add('active');
        (btn as HTMLElement).style.background = 'var(--yellow)';
        (btn as HTMLElement).style.borderRadius = '6px';
        composerState.intent = emoji || null;
      }
      updatePublishButton();
    });
  });

  // Screenshot click -> postMessage to parent content script
  const scBtn = $('#screenshotBtn');
  if (scBtn) {
    scBtn.innerHTML = '📸';
    scBtn.addEventListener('click', () => {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'TAKE_SCREENSHOT' }, '*');
      } else {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
          if (response?.dataUrl) {
            setMedia(response.dataUrl, 'image', `screenshot_${Date.now()}.png`, onResize);
          }
        });
      }
    });
  }

  // File upload input
  $('#uploadBtn')?.addEventListener('click', () => $('#mediaInput')?.click());
  $('#mediaInput')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setMedia(ev.target?.result as string, type, file.name, onResize);
    };
    reader.readAsDataURL(file);
  });

  $('#removeMedia')?.addEventListener('click', () => removeMedia(onResize));

  // Video clipping triggers
  const clipVideoBtn = $('#clipVideoBtn');

  clipVideoBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const box = $('#videoTrimmerBox');
    const isHidden = !box || box.classList.contains('hidden');

    if (isHidden) {
      openVideoTrimmer(onResize);
    } else if (isGrabbingClip) {
      stopActiveRecording();
    } else {
      clearVideo(onResize);
    }
  });

  $('#clearVideoBtn')?.addEventListener('click', () => clearVideo(onResize));
  $('#removeMediaBtn')?.addEventListener('click', () => clearVideo(onResize));

  // Record Now Action Button (Live capture starting from active video moment)
  const recordNowBtn = $('#recordNowBtn') as HTMLButtonElement | null;
  recordNowBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isGrabbingClip) {
      stopActiveRecording();
      return;
    }

    isGrabbingClip = true;
    const dur = 90; // up to 90s live capture
    startGrabTimer(dur, true);

    if (clipVideoBtn) {
      clipVideoBtn.innerText = '🛑';
      clipVideoBtn.classList.add('recording');
    }

    const currentStart = videoCurrentPlayhead > 0 ? videoCurrentPlayhead : trimStart;
    trimStart = currentStart;
    trimEnd = Math.min(videoTotalDuration, trimStart + 90);
    syncTrimUI('external');

    window.parent.postMessage(
      {
        type: 'CAPTURE_VIDEO',
        duration: dur,
        startTs: currentStart,
        endTs: trimEnd,
        isLiveRecord: true,
      },
      '*'
    );
    chrome.runtime
      .sendMessage({
        type: 'captureVideo',
        duration: dur,
        startTs: currentStart,
        endTs: trimEnd,
        isLiveRecord: true,
      })
      .catch(() => {});
  });

  // Grab Clip Action Button (Range capture)
  const grabClipBtn = $('#grabClipBtn') as HTMLButtonElement | null;
  grabClipBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isGrabbingClip) {
      stopActiveRecording();
      return;
    }

    isGrabbingClip = true;
    const dur = Math.min(90, Math.max(1, trimEnd - trimStart));
    startGrabTimer(dur, false);

    if (clipVideoBtn) {
      clipVideoBtn.innerText = '🛑';
      clipVideoBtn.classList.add('recording');
    }

    window.parent.postMessage(
      {
        type: 'CAPTURE_VIDEO',
        duration: dur,
        startTs: trimStart,
        endTs: trimEnd,
        isLiveRecord: false,
      },
      '*'
    );
    chrome.runtime
      .sendMessage({
        type: 'captureVideo',
        duration: dur,
        startTs: trimStart,
        endTs: trimEnd,
        isLiveRecord: false,
      })
      .catch(() => {});
  });

  // Dual Range Sliders
  const sliderStart = $('#trimStartSlider') as HTMLInputElement | null;
  const sliderEnd = $('#trimEndSlider') as HTMLInputElement | null;

  sliderStart?.addEventListener('input', () => {
    if (!sliderStart) return;
    trimStart = parseInt(sliderStart.value, 10) || 0;
    if (trimStart >= trimEnd) {
      trimStart = Math.max(0, trimEnd - 1);
    }
    syncTrimUI('slider-start');
  });

  sliderEnd?.addEventListener('input', () => {
    if (!sliderEnd) return;
    trimEnd = parseInt(sliderEnd.value, 10) || 15;
    if (trimEnd <= trimStart) {
      trimEnd = Math.min(videoTotalDuration, trimStart + 1);
    }
    syncTrimUI('slider-end');
  });

  // High-Precision Formatted Text Inputs
  const fmtStart = $('#trimStartFormatted') as HTMLInputElement | null;
  const fmtEnd = $('#trimEndFormatted') as HTMLInputElement | null;

  const commitStartFormatted = () => {
    if (!fmtStart) return;
    const parsed = parseFormattedTime(fmtStart.value);
    if (parsed != null) {
      trimStart = parsed;
      syncTrimUI('input-start');
    } else {
      fmtStart.value = formatSeconds(trimStart);
    }
  };

  const commitEndFormatted = () => {
    if (!fmtEnd) return;
    const parsed = parseFormattedTime(fmtEnd.value);
    if (parsed != null) {
      trimEnd = parsed;
      syncTrimUI('input-stop');
    } else {
      fmtEnd.value = formatSeconds(trimEnd);
    }
  };

  fmtStart?.addEventListener('blur', commitStartFormatted);
  fmtStart?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitStartFormatted();
      fmtStart.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      trimStart = Math.min(Math.max(0, trimEnd - 1), trimStart + step);
      syncTrimUI('start-step');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      trimStart = Math.max(0, trimStart - step);
      syncTrimUI('start-step');
    }
  });

  fmtEnd?.addEventListener('blur', commitEndFormatted);
  fmtEnd?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEndFormatted();
      fmtEnd.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      trimEnd = Math.min(videoTotalDuration, trimEnd + step);
      syncTrimUI('end-step');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      trimEnd = Math.max(trimStart + 1, trimEnd - step);
      syncTrimUI('end-step');
    }
  });

  // Step Adjustment Buttons (-1s, +1s, Shift: 5s)
  $('#startMinusBtn')?.addEventListener('click', (e) => {
    const step = (e as MouseEvent).shiftKey ? 5 : 1;
    trimStart = Math.max(0, trimStart - step);
    syncTrimUI('start-step');
  });
  $('#startPlusBtn')?.addEventListener('click', (e) => {
    const step = (e as MouseEvent).shiftKey ? 5 : 1;
    trimStart = Math.min(videoTotalDuration - 1, trimStart + step);
    syncTrimUI('start-step');
  });
  $('#endMinusBtn')?.addEventListener('click', (e) => {
    const step = (e as MouseEvent).shiftKey ? 5 : 1;
    trimEnd = Math.max(trimStart + 1, trimEnd - step);
    syncTrimUI('end-step');
  });
  $('#endPlusBtn')?.addEventListener('click', (e) => {
    const step = (e as MouseEvent).shiftKey ? 5 : 1;
    trimEnd = Math.min(videoTotalDuration, trimEnd + step);
    syncTrimUI('end-step');
  });

  // "📍 Now" Snap-to-Playhead Buttons
  $('#setStartCurrentBtn')?.addEventListener('click', () => {
    const preview = $('#videoPreviewEl') as HTMLVideoElement | null;
    let now = videoCurrentPlayhead;
    if (composerState.videoClipBlob && preview && !isNaN(preview.currentTime)) {
      now = Math.floor(preview.currentTime);
    }
    trimStart = Math.min(videoTotalDuration - 1, Math.max(0, now));
    if (trimEnd <= trimStart) {
      trimEnd = Math.min(videoTotalDuration, trimStart + 15);
    }
    syncTrimUI('now');
  });

  $('#setEndCurrentBtn')?.addEventListener('click', () => {
    const preview = $('#videoPreviewEl') as HTMLVideoElement | null;
    let now = videoCurrentPlayhead;
    if (composerState.videoClipBlob && preview && !isNaN(preview.currentTime)) {
      now = Math.floor(preview.currentTime);
    }
    trimEnd = Math.min(videoTotalDuration, Math.max(1, now));
    if (trimEnd <= trimStart) {
      trimStart = Math.max(0, trimEnd - 15);
    }
    syncTrimUI('now');
  });

  // Video Preview scrubbing & loop sync
  const videoPreviewEl = $('#videoPreviewEl') as HTMLVideoElement | null;
  const loopBtn = $('#previewTrimLoopBtn');

  loopBtn?.addEventListener('click', () => {
    isPreviewLooping = !isPreviewLooping;
    loopBtn.classList.toggle('active', isPreviewLooping);
    if (videoPreviewEl && isPreviewLooping && videoPreviewEl.paused) {
      videoPreviewEl.play().catch(() => {});
    }
  });

  videoPreviewEl?.addEventListener('loadedmetadata', () => {
    if (videoPreviewEl && videoPreviewEl.duration > 0) {
      const playheadLabel = $('#timelineCurrentPlayheadLabel');
      if (playheadLabel) playheadLabel.textContent = '00:00';
    }
  });

  videoPreviewEl?.addEventListener('timeupdate', () => {
    if (!videoPreviewEl) return;
    const cur = videoPreviewEl.currentTime || 0;
    const dur = videoPreviewEl.duration || videoTotalDuration;

    const playheadMarker = $('#trimmerPlayheadMarker');
    const playheadLabel = $('#timelineCurrentPlayheadLabel');
    if (playheadMarker && dur > 0) {
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
      playheadMarker.style.left = `${pct}%`;
      playheadMarker.style.display = 'block';
    }
    if (playheadLabel) {
      playheadLabel.textContent = formatSeconds(Math.floor(cur));
    }

    if (isPreviewLooping && cur >= dur) {
      videoPreviewEl.currentTime = 0;
      videoPreviewEl.play().catch(() => {});
    }
  });

  // Dictation click -> postMessage to parent content script
  let isDictating = false;
  let baseComment = '';
  const dictateBtn = $('#dictateBtn');

  dictateBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isDictating) {
      isDictating = false;
      dictateBtn.classList.remove('recording');
      window.parent.postMessage({ type: 'STOP_DICTATION' }, '*');
    } else {
      isDictating = true;
      baseComment = commentEl ? commentEl.value : '';
      if (baseComment && !baseComment.endsWith(' ') && !baseComment.endsWith('\n')) {
        baseComment += ' ';
      }
      dictateBtn.classList.add('recording');
      window.parent.postMessage({ type: 'START_DICTATION' }, '*');
    }
  });

  // Composer Fact Check with Gemini AI
  const composerFactCheckBtn = $('#composerFactCheckBtn');
  const composerFactCheckCloseBtn = $('#composerFactCheckCloseBtn');

  composerFactCheckCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideComposerFactCheck(onResize);
  });

  composerFactCheckBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const fb = $('#composerFactCheckBox');
    if (fb && fb.style.display !== 'none') {
      hideComposerFactCheck(onResize);
    } else {
      triggerComposerFactCheck(getPage, onResize);
    }
  });

  // Publish button
  publishBtn?.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing…';

    const payload = {
      comment: commentEl ? commentEl.value : '',
      quote: composerState.quote,
      intent: composerState.intent,
      mediaDataUrl: composerState.mediaDataUrl,
      mediaType: composerState.mediaType,
      mediaFileName: composerState.mediaFileName,
      videoClipBlob: composerState.videoClipBlob,
      videoStartTs: composerState.videoStartTs,
      videoEndTs: composerState.videoEndTs,
      recordedAudioBlob: composerState.recordedAudioBlob,
      currentMediaTimestamp: composerState.currentMediaTimestamp,
      page: getPage(),
      currentUser: user,
    };

    await publishAnnotation(
      payload,
      (msg, _pct) => {
        if (statusEl) statusEl.textContent = msg;
      },
      () => {
        if (commentEl) commentEl.value = '';
        if (counterEl) counterEl.textContent = '0';
        setQuote('');
        removeMedia(onResize);
        clearVideo(onResize);
        hideComposerFactCheck(onResize);
        emojiButtons.forEach((b) => {
          b.classList.remove('active');
          (b as HTMLElement).style.background = '';
        });
        composerState.intent = null;
        composerState.currentMediaTimestamp = null;
        publishBtn.textContent = 'Publish';
        updatePublishButton();
        if (statusEl) {
          statusEl.textContent = 'Published!';
          setTimeout(() => {
            if (statusEl.textContent === 'Published!') statusEl.textContent = '';
          }, 4000);
        }
        onPublished();
      },
      (err) => {
        publishBtn.disabled = false;
        publishBtn.textContent = 'Publish';
        if (statusEl) {
          statusEl.textContent = err;
          setTimeout(() => {
            if (statusEl.textContent === err) statusEl.textContent = '';
          }, 5000);
        }
      }
    );
  });
}
