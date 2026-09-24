// ─── Gemini AI Fact-Checking Module ──────────────────────────────────────────

import { $ } from '../shared/dom';
import { FACTCHECK_API_URL } from '../shared/config';
import { escapeHtml } from '../shared/utils';
import type { Annotation, FactCheckResult } from '../types/annotation';

export function wireFactCheck(ann: Annotation, pageTitle: string, pageUrl: string): void {
  const factBox = $('#detailFactCheckBox');
  if (factBox) factBox.style.display = 'none';

  const factBtn = $('#detailFactCheckBtn');
  if (!factBtn) return;

  factBtn.onclick = async (e) => {
    e.stopPropagation();
    const fb = $('#detailFactCheckBox');
    const ft = $('#detailFactCheckText');
    const fbadge = $('#detailFactCheckBadge');
    const fnote = $('#detailFactCheckCommunityNote');
    const ftweet = $('#detailFactCheckTweetBtn') as HTMLAnchorElement | null;
    if (!fb) return;

    if (fb.style.display === 'block') {
      fb.style.display = 'none';
      return;
    }
    fb.style.display = 'block';
    if (fbadge) {
      fbadge.textContent = 'ANALYZING';
      fbadge.style.color = 'var(--muted)';
    }
    if (ft) ft.textContent = 'Analyzing claim and context with Google Gemini...';
    if (fnote) fnote.style.display = 'none';
    if (ftweet) ftweet.style.display = 'none';

    try {
      const res = await fetch(FACTCHECK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: ann.quote || ann.quote_text,
          commentary: ann.comment || ann.commentary,
          sourceUrl: ann.url || pageUrl,
          sourceTitle: ann.title || pageTitle,
          timestamp: ann.media_timestamp,
          mediaUrl: ann.media_url,
        }),
      });

      const data: FactCheckResult = await res.json();

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
    } catch (err: unknown) {
      if (ft) {
        ft.textContent = `Fact-check error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  };

  const closeBtn = $('#detailFactCheckCloseBtn');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      const fb = $('#detailFactCheckBox');
      if (fb) fb.style.display = 'none';
    };
  }
}
