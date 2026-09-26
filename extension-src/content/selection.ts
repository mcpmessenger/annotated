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

export function getActiveVideoElement(): HTMLVideoElement | null {
  // 1. YouTube primary player video
  const yt = document.querySelector('video.html5-main-video, .html5-video-player video') as HTMLVideoElement | null;
  if (yt && (yt.duration > 0 || yt.currentTime > 0 || !yt.paused)) return yt;

  // 2. Any currently playing video
  const allVideos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
  const playing = allVideos.find((v) => !v.paused && !v.ended && v.currentTime > 0);
  if (playing) return playing;

  // 3. Largest visible video with duration > 0
  const valid = allVideos.filter((v) => v.duration > 0 || v.currentTime > 0);
  if (valid.length > 0) {
    valid.sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight));
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

export function getActiveVideoCaptions(): string {
  // Check YouTube captions on screen
  const ytSegments = Array.from(document.querySelectorAll('.ytp-caption-segment, .caption-visual-line'));
  if (ytSegments.length > 0) {
    const text = ytSegments.map((s) => s.textContent?.trim()).filter(Boolean).join(' ');
    if (text) return text;
  }

  // Check HTML5 video text tracks
  const v = getActiveVideoElement();
  if (v && v.textTracks) {
    for (let i = 0; i < v.textTracks.length; i++) {
      const track = v.textTracks[i];
      if (track.activeCues && track.activeCues.length > 0) {
        const cueTexts: string[] = [];
        for (let j = 0; j < track.activeCues.length; j++) {
          const cue = track.activeCues[j] as any;
          if (cue && cue.text) cueTexts.push(cue.text);
        }
        if (cueTexts.length > 0) return cueTexts.join(' ');
      }
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
    video_captions: getActiveVideoCaptions() || undefined,
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
    chrome.storage.local.set({ pendingSelection: { ...payload, timestamp: Date.now() } });
    chrome.runtime.sendMessage({ type: 'selection', ...payload }).catch(() => {});
  } catch (_) {}

  if (onSelectionRecorded) {
    onSelectionRecorded(payload);
  }
}
