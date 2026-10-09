// ─── Selection Tracking & Page Metadata ───────────────────────────────────────

import { extractTimestamp } from '../shared/utils';

export interface PageInfoPayload {
  title: string;
  url: string;
  hostname: string;
  selectedText: string;
  quote: string;
  media_timestamp: number | null;
  media_duration?: number | null;
  video_captions?: string;
}

export let lastKnownSelection: string | null = null;
export let lastKnownRect: DOMRect | null = null;
export let lastKnownElement: Element | null = null;

const PREVIEW_PLAYER_SELECTOR =
  '#inline-preview-player, ytd-video-preview, #video-preview, ytd-thumbnail, ytd-rich-grid-media, ytd-moving-thumbnail-renderer, ytd-reel-video-renderer:not([is-active])';

function isPreviewVideo(v: HTMLVideoElement): boolean {
  try {
    return !!v.closest(PREVIEW_PLAYER_SELECTOR);
  } catch (_) {
    return false;
  }
}

function isVisibleVideo(v: HTMLVideoElement): boolean {
  const r = v.getBoundingClientRect();
  return r.width > 80 && r.height > 45;
}

export function getActiveVideoElement(): HTMLVideoElement | null {
  // 1. YouTube: always use the main watch-page player, never hover previews in the sidebar/feed
  if (location.hostname.includes('youtube.com')) {
    const main = document.querySelector('#movie_player video.html5-main-video, #movie_player video') as HTMLVideoElement | null;
    if (main && !isPreviewVideo(main)) return main;
  }

  const allVideos = (Array.from(document.querySelectorAll('video')) as HTMLVideoElement[]).filter(
    (v) => !isPreviewVideo(v)
  );

  // 2. Any currently playing, visible video
  const playing = allVideos.find((v) => !v.paused && !v.ended && v.currentTime > 0 && isVisibleVideo(v));
  if (playing) return playing;

  // 3. Largest visible video with duration > 0
  const valid = allVideos.filter((v) => (v.duration > 0 || v.currentTime > 0) && isVisibleVideo(v));
  if (valid.length > 0) {
    valid.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    return valid[0];
  }

  return allVideos[0] || null;
}

export function getActiveVideoState(): { currentTime: number; duration: number; paused: boolean } {
  const v = getActiveVideoElement();
  let curTime = 0;
  let dur = 0;
  let paused = true;

  if (v) {
    curTime = Math.floor(v.currentTime || 0);
    dur = Math.floor(v.duration || 0);
    paused = v.paused;
  }

  // Also verify movie_player if available (YouTube API)
  try {
    const moviePlayer = document.getElementById('movie_player') as any;
    if (moviePlayer && typeof moviePlayer.getCurrentTime === 'function') {
      const ytCur = Math.floor(moviePlayer.getCurrentTime() || 0);
      const ytDur = Math.floor(moviePlayer.getDuration() || 0);
      if (ytCur > 0 || ytDur > 0) {
        curTime = ytCur;
        if (ytDur > 0) dur = ytDur;
        paused = typeof moviePlayer.getPlayerState === 'function' ? moviePlayer.getPlayerState() !== 1 : paused;
      }
    }
  } catch (_) {}

  return { currentTime: curTime, duration: dur, paused };
}

export function getMediaDuration(): number | null {
  const state = getActiveVideoState();
  return state.duration > 0 ? state.duration : null;
}

export function getActiveVideoCaptions(startSeconds?: number | null, endSeconds?: number | null): string {
  // 1. Check HTML5 video text tracks for cues within the clip window
  const v = getActiveVideoElement();
  const vState = getActiveVideoState();
  const tStart = startSeconds != null ? startSeconds : (vState.currentTime > 0 ? Math.max(0, vState.currentTime - 2) : null);
  const tEnd = endSeconds != null ? endSeconds : (tStart != null ? tStart + 15 : null);

  if (v && v.textTracks) {
    const sStart = tStart != null ? Math.max(0, tStart - 2) : null;
    const sEnd = tEnd != null ? tEnd + 2 : null;

    for (let i = 0; i < v.textTracks.length; i++) {
      const track = v.textTracks[i];
      // If time window specified, scan cues on track
      if (sStart != null && sEnd != null && track.cues && track.cues.length > 0) {
        const cueTexts: string[] = [];
        for (let j = 0; j < track.cues.length; j++) {
          const cue = track.cues[j] as any;
          if (cue && cue.text) {
            const cStart = cue.startTime ?? 0;
            const cEnd = cue.endTime ?? cStart;
            if (cEnd >= sStart && cStart <= sEnd) {
              cueTexts.push(cue.text.trim());
            }
          }
        }
        if (cueTexts.length > 0) return cueTexts.join(' ');
      }

      // Check active cues if playing right now
      if (track.activeCues && track.activeCues.length > 0) {
        const cueTexts: string[] = [];
        for (let j = 0; j < track.activeCues.length; j++) {
          const cue = track.activeCues[j] as any;
          if (cue && cue.text) cueTexts.push(cue.text.trim());
        }
        if (cueTexts.length > 0) return cueTexts.join(' ');
      }
    }
  }

  // 2. Check YouTube captions currently on screen (most direct & accurate for current playback)
  const ytSegments = Array.from(document.querySelectorAll('.ytp-caption-segment, .caption-visual-line'));
  if (ytSegments.length > 0) {
    const text = ytSegments.map((s) => s.textContent?.trim()).filter(Boolean).join(' ');
    if (text) return text;
  }

  // 3. Check YouTube transcript segments wherever they appear in the DOM (even if panel is collapsed or hidden)
  const segments = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
  if (segments.length > 0 && tStart != null && tEnd != null) {
    const matchedTexts: string[] = [];
    for (const seg of segments) {
      const tsEl = seg.querySelector('.segment-timestamp');
      const textEl = seg.querySelector('.segment-text');
      if (!textEl || !textEl.textContent) continue;

      const tsStr = (tsEl?.textContent || '').trim();
      const parts = tsStr.split(':').map((x) => parseInt(x, 10));
      let sec: number | null = null;
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        sec = parts[0] * 60 + parts[1];
      } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }

      // Include segments strictly within the specified clip window
      if (sec != null && sec >= tStart - 2 && sec <= tEnd + 2) {
        matchedTexts.push(textEl.textContent.trim());
      }
    }
    if (matchedTexts.length > 0) {
      return matchedTexts.join(' ');
    }
  }

  return '';
}

export function getMediaTimestamp(isTextSelection: boolean = false): number | null {
  // If the user highlighted text, only capture a video timestamp if the selection
  // originated directly within a video player, captions, or transcript container.
  if (isTextSelection) {
    if (!lastKnownElement) return null;
    const mediaContainer = lastKnownElement.closest(
      'div[data-testid="videoPlayer"], div[data-testid="videoComponent"], .html5-video-player, ytd-player, .ytp-caption-window-container, ytd-transcript-renderer, ytd-transcript-segment-renderer, video, audio'
    );
    if (!mediaContainer || lastKnownElement.closest('ytd-comments, #comments, ytd-item-section-renderer, #secondary, #description')) {
      return null;
    }
  }

  const state = getActiveVideoState();
  return state.currentTime > 0 ? state.currentTime : null;
}

export function seekToTimestamp(seconds: number): void {
  try {
    const moviePlayer = document.getElementById('movie_player') as any;
    if (moviePlayer && typeof moviePlayer.seekTo === 'function') {
      moviePlayer.seekTo(seconds, true);
      if (typeof moviePlayer.playVideo === 'function') moviePlayer.playVideo();
      return;
    }
  } catch (_) {}

  const v = document.querySelector('video, audio') as HTMLMediaElement | null;
  if (v) {
    try {
      v.currentTime = seconds;
      v.play().catch(() => {});
    } catch (_) {}
  }
}

export function getSmartPageTitle(targetEl?: Element | null): string {
  const el = targetEl || lastKnownElement;
  if (el) {
    const tweet = el.closest('article[data-testid="tweet"]');
    if (tweet) {
      const author = tweet.querySelector('[data-testid="User-Name"] span')?.textContent || 'User';
      return `Post by ${author} on X`;
    }
  }

  // Clean YouTube video title
  if (location.hostname.includes('youtube.com')) {
    const ytTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, ytd-watch-flexy #title h1');
    if (ytTitle && ytTitle.textContent?.trim()) {
      return ytTitle.textContent.trim();
    }
    return (document.title || '').replace(/ - YouTube$/, '').trim() || 'YouTube Video';
  }

  return document.title || 'Current page';
}

export function getExactSourceUrl(targetEl?: Element | null): string {
  const el = targetEl || lastKnownElement;
  if (el) {
    const tweet = el.closest('article[data-testid="tweet"]');
    if (tweet) {
      const timeLink = tweet.querySelector('time')?.closest('a') as HTMLAnchorElement | null;
      if (timeLink?.href) return timeLink.href;
      const statusLink = tweet.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null;
      if (statusLink?.href) return statusLink.href;
    }
  }
  const canonical = (document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href;
  return canonical || location.href;
}

export function buildPageInfo(): PageInfoPayload {
  const sel = window.getSelection()?.toString().trim() || lastKnownSelection || '';
  const isTextSelection = sel.length > 0;
  const url = getExactSourceUrl();
  const rawTs = getMediaTimestamp(isTextSelection);
  // When text is selected, never attach URL timestamp unless text was inside a media container
  const mediaTs = rawTs != null ? rawTs : (isTextSelection ? null : extractTimestamp(url, ''));

  return {
    title: getSmartPageTitle(),
    url,
    hostname: location.hostname,
    selectedText: sel,
    quote: sel,
    media_timestamp: mediaTs,
    media_duration: getMediaDuration(),
    video_captions: getActiveVideoCaptions(mediaTs, mediaTs != null ? mediaTs + 15 : null) || undefined,
  };
}

export function recordSelection(onSelectionRecorded?: (payload: PageInfoPayload) => void): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

  const text = sel.toString().trim();
  if (text.length < 2) return;

  lastKnownSelection = text;
  const range = sel.getRangeAt(0);
  lastKnownRect = range.getBoundingClientRect();
  lastKnownElement = range.commonAncestorContainer as Element;
  if (lastKnownElement.nodeType === Node.TEXT_NODE) {
    lastKnownElement = lastKnownElement.parentElement;
  }

  const payload = buildPageInfo();
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ pendingSelection: { ...payload, timestamp: Date.now() } });
    }
    if (typeof chrome !== 'undefined' && chrome?.runtime && typeof chrome.runtime.sendMessage === 'function') {
      const p = chrome.runtime.sendMessage({ type: 'selection', ...payload });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  } catch (_) {}

  if (onSelectionRecorded) {
    onSelectionRecorded(payload);
  }
}
