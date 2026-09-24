// ─── Selection Tracking & Page Metadata ───────────────────────────────────────

import { extractTimestamp } from '../shared/utils';

export interface PageInfoPayload {
  title: string;
  url: string;
  hostname: string;
  selectedText: string;
  quote: string;
  media_timestamp: number | null;
}

export let lastKnownSelection: string | null = null;
export let lastKnownRect: DOMRect | null = null;
export let lastKnownElement: Element | null = null;

export function getMediaTimestamp(): number | null {
  try {
    const moviePlayer = document.getElementById('movie_player') as any;
    if (moviePlayer && typeof moviePlayer.getCurrentTime === 'function') {
      const t = moviePlayer.getCurrentTime();
      if (t != null && !isNaN(t) && t > 0) return Math.floor(t);
    }
  } catch (_) {}

  // Scoped video search
  try {
    if (lastKnownElement) {
      const container = lastKnownElement.closest(
        'div[data-testid="videoPlayer"], div[data-testid="videoComponent"], .html5-video-player, video, audio'
      );
      if (container) {
        const media = container.querySelector('video, audio') as HTMLMediaElement | null;
        if (media && media.currentTime != null && !isNaN(media.currentTime) && media.currentTime > 0) {
          return Math.floor(media.currentTime);
        }
      }
    }
  } catch (_) {}

  // Global video search
  try {
    const v = document.querySelector('video, audio') as HTMLMediaElement | null;
    if (v && v.currentTime != null && !isNaN(v.currentTime) && v.currentTime > 0) {
      return Math.floor(v.currentTime);
    }
  } catch (_) {}

  return null;
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
  const url = getExactSourceUrl();
  const rawTs = getMediaTimestamp();
  const mediaTs = rawTs != null ? rawTs : extractTimestamp(url, '');

  return {
    title: getSmartPageTitle(),
    url,
    hostname: location.hostname,
    selectedText: sel,
    quote: sel,
    media_timestamp: mediaTs,
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
