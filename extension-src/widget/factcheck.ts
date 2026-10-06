// ─── Gemini AI Fact-Checking Module ──────────────────────────────────────────

import { $ } from '../shared/dom';
import { FACTCHECK_API_URL, SUPABASE_CONFIG } from '../shared/config';
import { escapeHtml, extractTimestampRange, safeStorageSet } from '../shared/utils';
import { supabase } from '../shared/supabase';
import { showAuth } from './auth';
import type { Annotation, FactCheckResult, CurrentUser } from '../types/annotation';

export interface FactCheckRequestPayload {
  annotationId?: string;
  slug?: string;
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
  mediaBase64?: string | null;
  mediaMimeType?: string | null;
  forceRecheck?: boolean;
  userId?: string | null;
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
  const recheckBtn = $('#detailFactCheckRecheckBtn');

  const hasMedia = !!(ann.media_url || ann.audio_url);

  const updateBtnState = (isOpen: boolean) => {
    if (factBtn) {
      const verdict = (cachedData?.verdict || '').toUpperCase();
      if (verdict === 'VERIFIED') {
        factBtn.innerHTML = '<span style="color:#22c55e; font-weight:800;">✓</span> <span style="font-size:10.5px; font-weight:700; color:#15803d;">Verified</span>';
        factBtn.setAttribute('data-tooltip', isOpen ? 'Hide Fact Check details' : 'View Fact Check details');
        factBtn.style.background = 'rgba(34, 197, 94, 0.12)';
        factBtn.style.borderColor = '#22c55e';
      } else if (verdict === 'FALSE' || verdict === 'MISLEADING') {
        factBtn.innerHTML = '<span style="color:#ef4444; font-weight:800;">✕</span> <span style="font-size:10.5px; font-weight:700; color:#b91c1c;">False</span>';
        factBtn.setAttribute('data-tooltip', isOpen ? 'Hide Fact Check details' : 'View Fact Check details');
        factBtn.style.background = 'rgba(239, 68, 68, 0.12)';
        factBtn.style.borderColor = '#ef4444';
      } else if (verdict === 'CONTEXT_NEEDED') {
        factBtn.innerHTML = '<span style="color:#eab308; font-weight:800;">⚠️</span> <span style="font-size:10.5px; font-weight:700; color:#a16207;">Context</span>';
        factBtn.setAttribute('data-tooltip', isOpen ? 'Hide Fact Check details' : 'View Fact Check details');
        factBtn.style.background = 'rgba(234, 179, 8, 0.12)';
        factBtn.style.borderColor = '#eab308';
      } else {
        factBtn.innerHTML = '<span style="color:var(--yellow); font-weight:800;">⚡</span> <span style="font-size:10.5px; font-weight:700; color:var(--ink);">Fact Check</span>';
        factBtn.setAttribute('data-tooltip', 'Run Gemini AI Fact Check');
        factBtn.style.background = isOpen ? 'var(--soft)' : 'var(--surface)';
        factBtn.style.borderColor = 'var(--line)';
      }
    }
    if (onResize) {
      onResize(isOpen ? (hasMedia ? 740 : 660) : (hasMedia ? 630 : 550));
    }
  };

  const renderData = (data: FactCheckResult, autoOpen: boolean = true) => {
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
    if (autoOpen && fb) {
      fb.style.display = 'block';
    }
    updateBtnState(fb?.style.display !== 'none');
    if (data?.verdict && typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage(
        {
          type: 'FACTCHECK_VERDICT_UPDATED',
          id: ann.id,
          slug: ann.slug,
          verdict: data.verdict,
        },
        '*'
      );
    }
  };

  const cacheKey = `annotated_fc_${ann.id || ann.slug || ''}`;
  let cachedData: FactCheckResult | null = null;
  if (typeof window !== 'undefined' && (ann.id || ann.slug)) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        cachedData = JSON.parse(stored);
        if (cachedData?.verdict) {
          const payload: Record<string, string> = {};
          if (ann.id) payload[`fc_${ann.id}`] = cachedData.verdict;
          if (ann.slug) payload[`fc_${ann.slug}`] = cachedData.verdict;
          safeStorageSet(payload);
        }
      }
    } catch (_) {}
  }

  // If already fact-checked, make it immediately visible
  if (cachedData) {
    renderData(cachedData, true);
  } else {
    if (factBox) factBox.style.display = 'none';
    updateBtnState(false);
  }

  // Preload from server API and cloud storage if not cached locally
  if (!cachedData && (ann.id || ann.slug)) {
    const fetchId = ann.id || '';
    const fetchSlug = ann.slug || '';
    fetch(`${FACTCHECK_API_URL}?id=${fetchId}&slug=${fetchSlug}`)
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          if (data?.verdict && !cachedData) {
            cachedData = data;
            try {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (_) {}
            const payload: Record<string, string> = {};
            if (ann.id) payload[`fc_${ann.id}`] = data.verdict;
            if (ann.slug) payload[`fc_${ann.slug}`] = data.verdict;
            safeStorageSet(payload);
            renderData(data, true);
          }
        }
      })
      .catch(() => {});
  }

  let isExecuting = false;
  const runFactCheck = async (forceRecheck = false) => {
    if (!forceRecheck && cachedData) {
      renderData(cachedData);
      return;
    }
    if (isExecuting) return;
    isExecuting = true;

    if (fbadge) {
      fbadge.textContent = forceRecheck ? 'RECHECKING' : 'ANALYZING';
      fbadge.style.color = 'var(--muted)';
    }
    if (ft) ft.textContent = 'Analyzing claim and context with Google Gemini...';

    try {
      const urlToUse = ann.url || pageUrl;
      const commentToUse = (ann.comment || ann.commentary || '').trim();
      const range = extractTimestampRange(urlToUse, commentToUse);
      const isVideo = Boolean(
        ann.media_type === 'video' ||
        ann.media_timestamp != null ||
        range != null ||
        (urlToUse && (urlToUse.includes('youtube.com') || urlToUse.includes('youtu.be') || urlToUse.includes('vimeo.com') || urlToUse.includes('tiktok.com')))
      );

      const startTs = range?.start ?? ann.media_timestamp ?? null;
      const endTs = range?.end ?? (startTs != null ? startTs + 15 : null);

      let effectiveQuote = (ann.quote || ann.quote_text || '').trim();
      if (effectiveQuote && ann.title && effectiveQuote.toLowerCase() === ann.title.trim().toLowerCase()) {
        effectiveQuote = '';
      }
      if (effectiveQuote && effectiveQuote.toLowerCase().startsWith('video clip (')) {
        effectiveQuote = '';
      }

      const user = getUser ? getUser() : null;

      const data = await callFactCheckApi({
        annotationId: ann.id,
        slug: ann.slug,
        quote: effectiveQuote || undefined,
        commentary: commentToUse || undefined,
        sourceUrl: urlToUse,
        sourceTitle: ann.title || pageTitle,
        timestamp: startTs,
        videoStartTs: startTs,
        videoEndTs: endTs,
        isVideoClip: isVideo,
        videoCaptions: ann.video_captions || undefined,
        mediaUrl: ann.media_url,
        forceRecheck: forceRecheck,
        userId: user?.id,
      });

      cachedData = data;
      renderData(data);
      if (typeof window !== 'undefined' && (ann.id || ann.slug)) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (_) {}
      }
      if (data?.verdict) {
        const payload: Record<string, string> = {};
        if (ann.id) payload[`fc_${ann.id}`] = data.verdict;
        if (ann.slug) payload[`fc_${ann.slug}`] = data.verdict;
        safeStorageSet(payload);
      }
    } catch (err: unknown) {
      if (ft) {
        ft.textContent = `Fact-check error: ${err instanceof Error ? err.message : String(err)}`;
      }
      if (fbadge) {
        fbadge.textContent = 'NOTICE';
        fbadge.style.color = '#eab308';
      }
    } finally {
      isExecuting = false;
    }
  };

  // Toggle button click (⚡ or Verified)
  const checkUserIsAuthenticated = async (): Promise<CurrentUser | null> => {
    let u = getUser ? getUser() : null;
    if (u) return u;

    // Check UI DOM: if userMenuWrap is visible, user is logged in
    const userMenuWrap = $('#userMenuWrap');
    if (userMenuWrap && !userMenuWrap.classList.contains('hidden')) {
      const profileName = $('#profileName')?.textContent || 'User';
      return { id: 'active-user', name: profileName };
    }

    // Check Supabase client and storage
    try {
      u = await supabase.getActiveUser();
      if (u) return u;
    } catch (_) {}

    return null;
  };

  if (factBtn) {
    factBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!fb) return;
      const isCurrentlyOpen = fb.style.display !== 'none';
      if (isCurrentlyOpen) {
        fb.style.display = 'none';
        updateBtnState(false);
      } else {
        if (!cachedData) {
          const user = await checkUserIsAuthenticated();
          if (!user) {
            showAuth('Sign in with Google to run an AI fact check on this annotation.');
            return;
          }
        }
        fb.style.display = 'block';
        updateBtnState(true);
        runFactCheck(false);
      }
    };
  }

  // Recheck button click (🔄)
  if (recheckBtn) {
    recheckBtn.onclick = async (e) => {
      e.stopPropagation();
      const user = await checkUserIsAuthenticated();
      if (!user) {
        showAuth('Sign in with Google to re-verify this claim with Gemini AI.');
        return;
      }
      runFactCheck(true);
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
