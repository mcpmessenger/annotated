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

  // 2. Comment bracketed or parenthesized timestamp: [01:24], (01:24), ⏱️ 01:24, or 1:02:24
  const commentMatch = String(comment || '').match(/(?:\[|\(|\b)(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?(?:\]|\)|\b)/);
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

  // 1. Range in comment/quote: [01:24 - 01:40], (00:02 - 01:07), or Clip at 00:02 - 01:07
  const rangeCommentMatch = commentStr.match(
    /(?:\[|\(|\b)(?:⏱️\s*|Clip at\s*)?(\d+):(\d+)(?::(\d+))?\s*-\s*(\d+):(\d+)(?::(\d+))?(?:\]|\)|\b)/i
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

  // 2. Seconds range in comment/quote: (2s - 67s) or [2s - 67s] or 2s - 67s
  const secRangeMatch = commentStr.match(/(?:\[|\(|\b)(\d+)\s*s?\s*-\s*(\d+)\s*s(?:\]|\)|\b)/i);
  if (secRangeMatch) {
    const s1 = parseInt(secRangeMatch[1], 10);
    const s2 = parseInt(secRangeMatch[2], 10);
    return { start: s1, end: Math.max(s1 + 5, s2) };
  }

  // 3. Range in URL: t=84s-100s or t=84-100
  const urlRangeMatch = urlStr.match(/[?&#]t=(\d+)(?:s)?-(\d+)(?:s)?/i);
  if (urlRangeMatch) {
    const s1 = parseInt(urlRangeMatch[1], 10);
    const s2 = parseInt(urlRangeMatch[2], 10);
    return { start: s1, end: Math.max(s1 + 5, s2) };
  }

  // 4. Fallback to single timestamp
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

export function safeSendRuntimeMessage(message: any, callback?: (response: any) => void): void {
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime && typeof chrome.runtime.sendMessage === 'function') {
      if (callback) {
        chrome.runtime.sendMessage(message, (res) => {
          if (chrome.runtime?.lastError) {
            // Silently swallow extension context invalidated or lastError
          }
          callback(res);
        });
      } else {
        const p = chrome.runtime.sendMessage(message);
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } else if (callback) {
      callback(undefined);
    }
  } catch (_) {
    if (callback) callback(undefined);
  }
}

const memStorage: Record<string, any> = {};

function getLocalFallback(key: string): any {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(`ann_${key}`);
      return v ? JSON.parse(v) : undefined;
    }
  } catch (_) {}
  return memStorage[key];
}

function setLocalFallback(key: string, val: any): void {
  memStorage[key] = val;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`ann_${key}`, JSON.stringify(val));
    }
  } catch (_) {}
}

function removeLocalFallback(key: string): void {
  delete memStorage[key];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`ann_${key}`);
    }
  } catch (_) {}
}

function getAllLocalFallback(): Record<string, any> {
  const res: Record<string, any> = { ...memStorage };
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ann_')) {
          const rawKey = k.slice(4);
          const v = localStorage.getItem(k);
          if (v) {
            try {
              res[rawKey] = JSON.parse(v);
            } catch (_) {
              res[rawKey] = v;
            }
          }
        }
      }
    }
  } catch (_) {}
  return res;
}

export async function safeStorageGet(key: string | null): Promise<Record<string, any>> {
  try {
    if (
      typeof chrome !== 'undefined' &&
      chrome?.storage?.local &&
      typeof chrome.storage.local.get === 'function'
    ) {
      return await new Promise<Record<string, any>>((resolve) => {
        try {
          chrome.storage.local.get(key, (items) => {
            if (chrome.runtime?.lastError) {
              resolve(key ? { [key]: getLocalFallback(key) } : getAllLocalFallback());
              return;
            }
            resolve(items || {});
          });
        } catch (_) {
          resolve(key ? { [key]: getLocalFallback(key) } : getAllLocalFallback());
        }
      });
    }
  } catch (_) {}
  return key ? { [key]: getLocalFallback(key) } : getAllLocalFallback();
}

export async function safeStorageSet(items: Record<string, any>): Promise<void> {
  for (const [k, v] of Object.entries(items)) {
    setLocalFallback(k, v);
  }
  try {
    if (
      typeof chrome !== 'undefined' &&
      chrome?.storage?.local &&
      typeof chrome.storage.local.set === 'function'
    ) {
      await new Promise<void>((resolve) => {
        try {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime?.lastError) {
              // ignore
            }
            resolve();
          });
        } catch (_) {
          resolve();
        }
      });
    }
  } catch (_) {}
}

export async function safeStorageRemove(key: string | string[]): Promise<void> {
  const keys = Array.isArray(key) ? key : [key];
  for (const k of keys) {
    removeLocalFallback(k);
  }
  try {
    if (
      typeof chrome !== 'undefined' &&
      chrome?.storage?.local &&
      typeof chrome.storage.local.remove === 'function'
    ) {
      await new Promise<void>((resolve) => {
        try {
          chrome.storage.local.remove(key, () => {
            if (chrome.runtime?.lastError) {
              // ignore
            }
            resolve();
          });
        } catch (_) {
          resolve();
        }
      });
    }
  } catch (_) {}
}
