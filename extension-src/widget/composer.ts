// ─── Annotation Composer Module ──────────────────────────────────────────────

import { $, $$ } from '../shared/dom';
import { formatSeconds, escapeHtml } from '../shared/utils';
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

export function getComposerHeight(): number {
  let base = 390;
  if (composerState.videoClipBlob) {
    base = 630;
  } else if (composerState.mediaDataUrl) {
    base = 510;
  }
  const factBox = $('#composerFactCheckBox');
  if (factBox && factBox.style.display !== 'none') {
    base += 130;
  }
  return base;
}

export function hideComposerFactCheck(onResize?: (height: number) => void): void {
  const fb = $('#composerFactCheckBox');
  if (fb) fb.style.display = 'none';
  if (onResize) onResize(getComposerHeight());
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

export function clearVideo(onResize: (height: number) => void): void {
  composerState.videoClipBlob = null;
  const videoTrimmerBox = $('#videoTrimmerBox');
  const videoPreviewEl = $('#videoPreviewEl') as HTMLVideoElement | null;
  const clipVideoBtn = $('#clipVideoBtn');

  if (videoTrimmerBox) videoTrimmerBox.classList.add('hidden');
  if (videoPreviewEl) {
    videoPreviewEl.pause();
    videoPreviewEl.src = '';
  }
  if (clipVideoBtn) {
    clipVideoBtn.innerText = '🎥';
    clipVideoBtn.classList.remove('recording');
  }

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
  onPublished: () => void
): void {
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
  let isVideoRecording = false;

  clipVideoBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isVideoRecording) {
      isVideoRecording = false;
      clipVideoBtn.innerText = '⏳';
      clipVideoBtn.classList.remove('recording');
      window.parent.postMessage({ type: 'STOP_VIDEO' }, '*');
      chrome.runtime.sendMessage({ type: 'stopVideo' }).catch(() => {});
    } else {
      isVideoRecording = true;
      clipVideoBtn.innerText = '🛑';
      clipVideoBtn.classList.add('recording');
      window.parent.postMessage({ type: 'CAPTURE_VIDEO', duration: 90 }, '*');
      chrome.runtime.sendMessage({ type: 'captureVideo', duration: 90 }).catch(() => {});
    }
  });

  $('#clearVideoBtn')?.addEventListener('click', () => clearVideo(onResize));
  $('#removeMediaBtn')?.addEventListener('click', () => clearVideo(onResize));

  // Video trimmer change listener
  const trimStartInput = $('#trimStartInput') as HTMLInputElement | null;
  const trimEndInput = $('#trimEndInput') as HTMLInputElement | null;
  const trimDurationLabel = $('#trimDurationLabel');
  const updateTrim = () => {
    if (!trimStartInput || !trimEndInput || !trimDurationLabel) return;
    let start = parseInt(trimStartInput.value, 10) || 0;
    let end = parseInt(trimEndInput.value, 10) || 15;
    if (end - start > 90) end = start + 90;
    if (end <= start) end = start + 1;
    trimEndInput.value = String(end);
    trimDurationLabel.innerText = `${end - start}s`;
  };
  trimStartInput?.addEventListener('change', updateTrim);
  trimEndInput?.addEventListener('change', updateTrim);

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
  const composerFactCheckBox = $('#composerFactCheckBox');
  const composerFactCheckBadge = $('#composerFactCheckBadge');
  const composerFactCheckText = $('#composerFactCheckText');
  const composerFactCheckCloseBtn = $('#composerFactCheckCloseBtn');

  composerFactCheckCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideComposerFactCheck(onResize);
  });

  composerFactCheckBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const quote = composerState.quote.trim();
    const comment = commentEl ? commentEl.value.trim() : '';

    if (!quote && !comment) {
      if (statusEl) {
        statusEl.textContent = 'Select text on the page or write a comment to fact check!';
        setTimeout(() => {
          if (statusEl.textContent && statusEl.textContent.includes('Select text')) statusEl.textContent = '';
        }, 3500);
      }
      commentEl?.focus();
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
      composerFactCheckText.textContent = 'Analyzing claim and context with Google Gemini...';
    }
    onResize(getComposerHeight());

    try {
      const pageCtx = getPage();
      const data = await callFactCheckApi({
        quote,
        commentary: comment,
        sourceUrl: pageCtx.url || location.href,
        sourceTitle: pageCtx.title || document.title,
        timestamp: composerState.videoStartTs ?? composerState.currentMediaTimestamp ?? null,
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
  });

  // Publish button
  publishBtn?.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) return;

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
