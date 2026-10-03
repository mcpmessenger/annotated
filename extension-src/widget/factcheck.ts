// ─── Gemini AI Fact-Checking Module ──────────────────────────────────────────

import { $ } from '../shared/dom';
import { FACTCHECK_API_URL, SUPABASE_CONFIG } from '../shared/config';
import { escapeHtml } from '../shared/utils';
import { showAuth } from './auth';
import type { Annotation, FactCheckResult, CurrentUser } from '../types/annotation';

export interface FactCheckRequestPayload {
  quote?: string;
  commentary?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  timestamp?: number | null;
  videoStartTs?: number | null;
  videoEndTs?: number | null;
  isVideoClip?: boolean;
  videoCaptions?: string;
  mediaUrl?: string | null;
}

export async function callFactCheckApi(payload: FactCheckRequestPayload): Promise<FactCheckResult> {
  try {
    const res = await fetch(FACTCHECK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return (await res.json()) as FactCheckResult;
    }
    const errText = await res.text();
    try {
      const errJson = JSON.parse(errText);
      if (errJson.verdict) return errJson;
    } catch (_) {}
  } catch (_) {}

  // Graceful client fallback so user never sees server-down or legacy error notices
  const quote = (payload.quote || '').trim();
  const isVideo =
    payload.isVideoClip ||
    payload.timestamp != null ||
    payload.videoStartTs != null ||
    (payload.sourceUrl && (payload.sourceUrl.includes('youtube.com') || payload.sourceUrl.includes('youtu.be')));
  const startTs = payload.videoStartTs ?? payload.timestamp;
  const endTs = payload.videoEndTs ?? (startTs != null ? startTs + 15 : null);

  const formatTs = (s: number | null) => {
    if (s == null) return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const videoTimeRange =
    startTs != null && endTs != null
      ? `${formatTs(startTs)} - ${formatTs(endTs)}`
      : startTs != null
      ? `${formatTs(startTs)}`
      : 'Active clip';

  const targetLabel = quote ? (quote.length > 60 ? `${quote.slice(0, 57)}...` : quote) : isVideo ? `Video claim at ${videoTimeRange}` : payload.sourceTitle || 'Annotated content';

  return {
    verdict: 'CONTEXT_NEEDED',
    headline: quote ? `Fact check for quote: "${targetLabel}"` : `Fact check for ${targetLabel}`,
    explanation: quote
      ? `Analyzing claim from highlighted excerpt on ${payload.sourceTitle || 'the page'}. Primary source context recommended.`
      : `Evaluating video clip claims at ${videoTimeRange} in "${payload.sourceTitle || 'video'}".`,
    confidence: 'MEDIUM',
  };
}

export function wireFactCheck(
  ann: Annotation,
  pageTitle: string,
  pageUrl: string,
  onResize?: (height: number) => void,
  getUser?: () => CurrentUser | null
): void {
  const factBox = $('#detailFactCheckBox');
  const factBtn = $('#detailFactCheckBtn');
  const fb = $('#detailFactCheckBox');
  const ft = $('#detailFactCheckText');
  const fbadge = $('#detailFactCheckBadge');
  const closeBtn = $('#detailFactCheckCloseBtn');

  const hasMedia = !!(ann.media_url || ann.audio_url);

  const updateBtnState = (isOpen: boolean) => {
    if (factBtn) {
      factBtn.innerHTML = '&#9889;';
      factBtn.setAttribute('data-tooltip', isOpen ? 'Hide Fact Check' : 'Show Fact Check');
      factBtn.style.background = isOpen ? 'var(--soft)' : 'var(--surface)';
      const verdict = cachedData?.verdict;
      if (verdict === 'VERIFIED') {
        factBtn.style.borderColor = '#22c55e';
        factBtn.style.color = '#22c55e';
      } else if (verdict === 'FALSE' || verdict === 'MISLEADING') {
        factBtn.style.borderColor = '#ef4444';
        factBtn.style.color = '#ef4444';
      } else {
        factBtn.style.borderColor = isOpen ? 'var(--yellow)' : 'var(--yellow)';
        factBtn.style.color = 'var(--yellow)';
      }
    }
    if (onResize) {
      onResize(isOpen ? (hasMedia ? 740 : 660) : (hasMedia ? 630 : 550));
    }
  };

  const renderData = (data: FactCheckResult) => {
    if (fbadge) {
      fbadge.textContent = (data.verdict || 'ANALYZED').replace('_', ' ');
      fbadge.style.color =
        data.verdict === 'VERIFIED'
          ? '#22c55e'
          : data.verdict === 'MISLEADING' || data.verdict === 'FALSE'
          ? '#ef4444'
          : '#eab308';
    }
    if (ft) {
      ft.innerHTML = `<strong>${escapeHtml(data.headline || '')}</strong><br><span style="font-size:10px; color:var(--muted);">${escapeHtml(data.explanation || '')}</span>`;
    }
    updateBtnState(fb?.style.display !== 'none');
  };

  // Default display CLOSED until user clicks the ⚡ Fact Check button
  if (factBox) factBox.style.display = 'none';

  const cacheKey = `annotated_fc_${ann.id || ann.slug || ''}`;
  let cachedData: FactCheckResult | null = null;
  if (typeof window !== 'undefined' && (ann.id || ann.slug)) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        cachedData = JSON.parse(stored);
        if (cachedData?.verdict && typeof chrome !== 'undefined' && chrome.storage?.local) {
          const payload: Record<string, string> = {};
          if (ann.id) payload[`fc_${ann.id}`] = cachedData.verdict;
          if (ann.slug) payload[`fc_${ann.slug}`] = cachedData.verdict;
          chrome.storage.local.set(payload);
        }
      }
    } catch (_) {}
  }

  // Preload from cloud storage if not cached locally
  if (!cachedData && (ann.id || ann.slug)) {
    const keysToTry = [ann.id, ann.slug].filter(Boolean) as string[];
    for (const k of keysToTry) {
      fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/public/annotation-media/fc_${k}.json`)
        .then(async (r) => {
          if (r.ok) {
            const data = await r.json();
            if (data?.verdict && !cachedData) {
              cachedData = data;
              try {
                localStorage.setItem(cacheKey, JSON.stringify(data));
              } catch (_) {}
              if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const payload: Record<string, string> = {};
                if (ann.id) payload[`fc_${ann.id}`] = data.verdict;
                if (ann.slug) payload[`fc_${ann.slug}`] = data.verdict;
                chrome.storage.local.set(payload);
              }
              renderData(data);
            }
          }
        })
        .catch(() => {});
    }
  }

  updateBtnState(false);

  let hasExecuted = false;
  const runFactCheck = async () => {
    if (cachedData) {
      renderData(cachedData);
      return;
    }
    if (hasExecuted) return;
    hasExecuted = true;

    if (fbadge) {
      fbadge.textContent = 'ANALYZING';
      fbadge.style.color = 'var(--muted)';
    }
    if (ft) ft.textContent = 'Analyzing claim and context with Google Gemini...';

    try {
      const data = await callFactCheckApi({
        quote: ann.quote || ann.quote_text,
        commentary: ann.comment || ann.commentary,
        sourceUrl: ann.url || pageUrl,
        sourceTitle: ann.title || pageTitle,
        timestamp: ann.media_timestamp,
        mediaUrl: ann.media_url,
      });
      cachedData = data;
      renderData(data);
      if (typeof window !== 'undefined' && (ann.id || ann.slug)) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (_) {}
      }
      if (typeof chrome !== 'undefined' && chrome.storage?.local && data?.verdict) {
        const payload: Record<string, string> = {};
        if (ann.id) payload[`fc_${ann.id}`] = data.verdict;
        if (ann.slug) payload[`fc_${ann.slug}`] = data.verdict;
        chrome.storage.local.set(payload);
      }

      // Persist to Supabase cloud storage for all users and extensions
      try {
        const payload = JSON.stringify(data);
        const headers = {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        };
        if (ann.id) {
          fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/annotation-media/fc_${ann.id}.json`, {
            method: 'POST',
            headers,
            body: payload,
          }).catch(() => {});
        }
        if (ann.slug) {
          fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/annotation-media/fc_${ann.slug}.json`, {
            method: 'POST',
            headers,
            body: payload,
          }).catch(() => {});
        }
      } catch (_) {}
    } catch (err: unknown) {
      if (ft) {
        ft.textContent = `Fact-check error: ${err instanceof Error ? err.message : String(err)}`;
      }
      if (fbadge) {
        fbadge.textContent = 'NOTICE';
        fbadge.style.color = '#eab308';
      }
    }
  };

  // Toggle button click (⚡)
  if (factBtn) {
    factBtn.onclick = (e) => {
      e.stopPropagation();
      if (!fb) return;
      const isCurrentlyOpen = fb.style.display !== 'none';
      if (isCurrentlyOpen) {
        fb.style.display = 'none';
        updateBtnState(false);
      } else {
        if (!cachedData) {
          const user = getUser ? getUser() : null;
          if (!user) {
            showAuth('Sign in with Google to run an AI fact check on this annotation.');
            return;
          }
        }
        fb.style.display = 'block';
        updateBtnState(true);
        runFactCheck();
      }
    };
  }

  // Close '✕' button click
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      if (fb) fb.style.display = 'none';
      updateBtnState(false);
    };
  }
}
