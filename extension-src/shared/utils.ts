// ─── Shared Utilities ─────────────────────────────────────────────────────────

export function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return map[c] || c;
  });
}

export function initials(name?: string | null): string {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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

export function parseFormattedTime(raw?: string | null): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Split by colons: HH:MM:SS or MM:SS or SS
  const parts = s.split(':').map((p) => p.trim());
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const sec = parseFloat(parts[2]);
    if (!isNaN(h) && !isNaN(m) && !isNaN(sec)) {
      return Math.max(0, h * 3600 + m * 60 + Math.floor(sec));
    }
  } else if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const sec = parseFloat(parts[1]);
    if (!isNaN(m) && !isNaN(sec)) {
      return Math.max(0, m * 60 + Math.floor(sec));
    }
  } else if (parts.length === 1) {
    const sec = parseFloat(parts[0].replace(/s$/i, ''));
    if (!isNaN(sec)) {
      return Math.max(0, Math.floor(sec));
    }
  }
  return null;
}

export function extractTimestamp(url?: string | null, comment?: string | null): number | null {
  if (!url && !comment) return null;

  // 1. Check URL query/hash parameters for t=...
  const urlStr = String(url || '');
  const tMatch = urlStr.match(/[?&#]t=([0-9hms]+)/i);
  if (tMatch) {
    const val = tMatch[1].toLowerCase();
    if (/[hms]/.test(val)) {
      let h = 0, m = 0, s = 0;
      const hM = val.match(/(\d+)h/);
      const mM = val.match(/(\d+)m/);
      const sM = val.match(/(\d+)s/);
      if (hM) h = parseInt(hM[1], 10);
      if (mM) m = parseInt(mM[1], 10);
      if (sM) s = parseInt(sM[1], 10);
      if (!hM && !mM && !sM && /^\d+s?$/.test(val)) {
        return parseInt(val.replace('s', ''), 10);
      }
      return h * 3600 + m * 60 + s;
    } else if (/^\d+$/.test(val)) {
      return parseInt(val, 10);
    }
  }

  // 2. Comment bracketed timestamp: [⏱️ 01:24], [01:24], or [1:02:24]
  const commentMatch = String(comment || '').match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\]/);
  if (commentMatch) {
    if (commentMatch[3]) {
      return parseInt(commentMatch[1], 10) * 3600 + parseInt(commentMatch[2], 10) * 60 + parseInt(commentMatch[3], 10);
    }
    return parseInt(commentMatch[1], 10) * 60 + parseInt(commentMatch[2], 10);
  }
  return null;
}

export function extractTimestampRange(
  url?: string | null,
  comment?: string | null
): { start: number; end: number } | null {
  const urlStr = String(url || '');
  const commentStr = String(comment || '');

  // Range in comment: [01:24 - 01:40] or [⏱️ 01:24 - 01:40]
  const rangeCommentMatch = commentStr.match(
    /\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\s*-\s*(\d+):(\d+)(?::(\d+))?\]/
  );
  if (rangeCommentMatch) {
    let s1 = parseInt(rangeCommentMatch[1], 10) * 60 + parseInt(rangeCommentMatch[2], 10);
    if (rangeCommentMatch[3]) {
      s1 = parseInt(rangeCommentMatch[1], 10) * 3600 + parseInt(rangeCommentMatch[2], 10) * 60 + parseInt(rangeCommentMatch[3], 10);
    }

    let s2 = parseInt(rangeCommentMatch[4], 10) * 60 + parseInt(rangeCommentMatch[5], 10);
    if (rangeCommentMatch[6]) {
      s2 = parseInt(rangeCommentMatch[4], 10) * 3600 + parseInt(rangeCommentMatch[5], 10) * 60 + parseInt(rangeCommentMatch[6], 10);
    }

    return { start: s1, end: Math.max(s1 + 5, s2) };
  }

  // Range in URL: t=84s-100s or t=84-100
  const urlRangeMatch = urlStr.match(/[?&#]t=(\d+)(?:s)?-(\d+)(?:s)?/i);
  if (urlRangeMatch) {
    const s1 = parseInt(urlRangeMatch[1], 10);
    const s2 = parseInt(urlRangeMatch[2], 10);
    return { start: s1, end: Math.max(s1 + 5, s2) };
  }

  // Fallback to single timestamp
  const startTs = extractTimestamp(url, comment);
  if (startTs != null && startTs >= 0) {
    return { start: startTs, end: startTs + 15 };
  }

  return null;
}

export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  try {
    if (url.includes('youtube.com') && url.includes('v=')) {
      return new URL(url).searchParams.get('v');
    }
    if (url.includes('youtu.be/')) {
      const parts = new URL(url).pathname.split('/');
      return parts[1] || null;
    }
  } catch (_) {}
  return null;
}

export function pageKey(url?: string | null): string {
  try {
    const u = new URL(url || (typeof location !== 'undefined' ? location.href : 'https://annotated.com'));
    return `page:${u.origin}${u.pathname}`;
  } catch (_) {
    return 'page:https://annotated.com/';
  }
}

export function openExternalUrl(url?: string | null): void {
  if (!url) return;
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'OPEN_TAB', url }, '*');
      return;
    }
  } catch (_) {}

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (_) {}
}
