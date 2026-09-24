// ─── Gemini AI Fact-Checking Module ──────────────────────────────────────────

import { $ } from '../shared/dom';
import { FACTCHECK_API_URL } from '../shared/config';
import { escapeHtml } from '../shared/utils';
import type { Annotation, FactCheckResult } from '../types/annotation';

export interface FactCheckRequestPayload {
  quote?: string;
  commentary?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  timestamp?: number | null;
  mediaUrl?: string | null;
}

export async function callFactCheckApi(payload: FactCheckRequestPayload): Promise<FactCheckResult> {
  const res = await fetch(FACTCHECK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    try {
      const errJson = JSON.parse(errorText);
      throw new Error(errJson.error || `Fact-check error (${res.status})`);
    } catch (e: any) {
      if (e?.message && !e.message.startsWith('Fact-check error')) throw e;
      throw new Error(`Fact check request failed: ${res.statusText || res.status}`);
    }
  }
  return (await res.json()) as FactCheckResult;
}

export function wireFactCheck(
  ann: Annotation,
  pageTitle: string,
  pageUrl: string,
  onResize?: (height: number) => void
): void {
  const factBox = $('#detailFactCheckBox');
  const factBtn = $('#detailFactCheckBtn');
  const fb = $('#detailFactCheckBox');
  const ft = $('#detailFactCheckText');
  const fbadge = $('#detailFactCheckBadge');
  const fnote = $('#detailFactCheckCommunityNote');
  const ftweet = $('#detailFactCheckTweetBtn') as HTMLAnchorElement | null;
  const closeBtn = $('#detailFactCheckCloseBtn');

  const hasMedia = !!(ann.media_url || ann.audio_url);

  const updateBtnState = (isOpen: boolean) => {
    if (factBtn) {
      factBtn.innerHTML = `<span>&#9889; ${isOpen ? 'Hide Fact Check' : 'Show Fact Check'}</span>`;
      factBtn.setAttribute('data-tooltip', isOpen ? 'Hide Fact Check' : 'Show Fact Check');
    }
    if (onResize) {
      onResize(isOpen ? (hasMedia ? 740 : 660) : (hasMedia ? 600 : 520));
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
    if (data.communityNote && fnote) {
      fnote.textContent = data.communityNote;
      fnote.style.display = 'block';
    }
    if (data.tweetIntentUrl && ftweet) {
      ftweet.href = data.tweetIntentUrl;
      ftweet.style.display = 'inline-block';
    }
  };

  // Default display open with Hide button
  if (factBox) factBox.style.display = 'block';
  updateBtnState(true);

  // Check cache or auto-execute fact check
  const cacheKey = `annotated_fc_${ann.id || ann.slug || ''}`;
  let cachedData: FactCheckResult | null = null;
  if (typeof window !== 'undefined' && (ann.id || ann.slug)) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) cachedData = JSON.parse(stored);
    } catch (_) {}
  }

  if (cachedData) {
    renderData(cachedData);
  } else {
    if (fbadge) {
      fbadge.textContent = 'ANALYZING';
      fbadge.style.color = 'var(--muted)';
    }
    if (ft) ft.textContent = 'Analyzing claim and context with Google Gemini...';
    if (fnote) fnote.style.display = 'none';
    if (ftweet) ftweet.style.display = 'none';

    (async () => {
      try {
        const data = await callFactCheckApi({
          quote: ann.quote || ann.quote_text,
          commentary: ann.comment || ann.commentary,
          sourceUrl: ann.url || pageUrl,
          sourceTitle: ann.title || pageTitle,
          timestamp: ann.media_timestamp,
          mediaUrl: ann.media_url,
        });
        renderData(data);
        if (typeof window !== 'undefined' && (ann.id || ann.slug)) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (_) {}
        }
      } catch (err: unknown) {
        if (ft) {
          ft.textContent = `Fact-check error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    })();
  }

  // Toggle button click
  if (factBtn) {
    factBtn.onclick = (e) => {
      e.stopPropagation();
      if (!fb) return;
      const isCurrentlyOpen = fb.style.display !== 'none';
      if (isCurrentlyOpen) {
        fb.style.display = 'none';
        updateBtnState(false);
      } else {
        fb.style.display = 'block';
        updateBtnState(true);
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
