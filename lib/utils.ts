import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const s = String(url).trim();
    if (s.includes('youtu.be/')) {
      const match = s.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    const match =
      s.match(/[?&]v=([a-zA-Z0-9_-]+)/) ||
      s.match(/\/embed\/([a-zA-Z0-9_-]+)/) ||
      s.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  } catch (_) {}
  return null;
}

export function formatSeconds(sec?: number | null): string {
  if (sec == null || isNaN(sec)) return '';
  const s = Math.floor(sec);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function extractTimestampRange(
  url?: string | null,
  commentText?: string | null
): { start: number; end: number } | null {
  const combined = `${url || ''} ${commentText || ''}`;
  const rangeMatch = combined.match(
    /(?:\[|\(|\b)(?:⏱️\s*|Clip at\s*)?(\d+):(\d+)(?::(\d+))?\s*-\s*(\d+):(\d+)(?::(\d+))?(?:\]|\)|\b)/i
  );
  if (rangeMatch) {
    let s1 = parseInt(rangeMatch[1], 10) * 60 + parseInt(rangeMatch[2], 10);
    if (rangeMatch[3]) s1 = parseInt(rangeMatch[1], 10) * 3600 + parseInt(rangeMatch[2], 10) * 60 + parseInt(rangeMatch[3], 10);
    let s2 = parseInt(rangeMatch[4], 10) * 60 + parseInt(rangeMatch[5], 10);
    if (rangeMatch[6]) s2 = parseInt(rangeMatch[4], 10) * 3600 + parseInt(rangeMatch[5], 10) * 60 + parseInt(rangeMatch[6], 10);
    return { start: s1, end: Math.max(s1 + 5, s2) };
  }

  const secMatch = combined.match(/(?:\[|\(|\b)(\d+)\s*s?\s*-\s*(\d+)\s*s(?:\]|\)|\b)/i);
  if (secMatch) {
    const start = parseInt(secMatch[1], 10);
    const end = Math.max(start + 5, parseInt(secMatch[2], 10));
    return { start, end };
  }

  if (url) {
    const tParam = url.match(/[?&]t=(\d+)s?/i);
    if (tParam) {
      const start = parseInt(tParam[1], 10);
      return { start, end: start + 30 };
    }
  }

  return null;
}
