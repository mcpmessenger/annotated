// ─── Multi-Platform In-Page Highlight Renderer ───────────────────────────────
// Color-coded highlights:
// 🟡 Yellow: Default / Unverified (pending user-initiated fact check)
// 🟢 Green: Verified
// 🔴 Red: False / Misleading

import type { Annotation } from '../types/annotation';
import { escapeHtml } from '../shared/utils';

export const norm = (s?: string | null): string =>
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const highlightMap = new WeakMap<Element, Annotation>();
export const factCheckCache: Record<string, string> = {};

export function getHighlightClass(annotation?: Annotation | null, verdictOverride?: string | null): string {
  if ((annotation as any)?.is_disputed) {
    return 'annotated-highlight annotated-highlight-false';
  }
  const id = annotation?.id || '';
  const slug = annotation?.slug || '';
  const v = (
    verdictOverride ||
    (id && factCheckCache[id]) ||
    (slug && factCheckCache[slug]) ||
    (annotation as any)?.fact_check_verdict ||
    (annotation as any)?.verdict ||
    ''
  ).toUpperCase();

  if (v === 'VERIFIED') {
    return 'annotated-highlight annotated-highlight-verified';
  }
  if (v === 'FALSE' || v === 'MISLEADING') {
    return 'annotated-highlight annotated-highlight-false';
  }
  return 'annotated-highlight annotated-highlight-unverified';
}

export function updateHighlightVerdict(annotationIdOrSlug: string, verdict: string): void {
  if (!annotationIdOrSlug) return;
  factCheckCache[annotationIdOrSlug] = verdict;
  const marks = document.querySelectorAll(
    `[data-annotated-highlight="${annotationIdOrSlug}"], [data-annotated-slug="${annotationIdOrSlug}"]`
  );
  const cls = getHighlightClass(null, verdict);
  marks.forEach((m) => {
    m.className = cls;
  });
}

// Initialize storage listener for reactive highlight updates when fact checks execute
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  try {
    chrome.storage.local.get(null, (allData: Record<string, any>) => {
      if (allData) {
        Object.keys(allData).forEach((k) => {
          if (k.startsWith('fc_')) {
            const id = k.replace('fc_', '');
            factCheckCache[id] = allData[k];
          }
        });
        Object.keys(factCheckCache).forEach((id) => {
          updateHighlightVerdict(id, factCheckCache[id]);
        });
      }
    });

    chrome.storage.onChanged?.addListener((changes, area) => {
      if (area === 'local') {
        Object.keys(changes).forEach((k) => {
          if (k.startsWith('fc_')) {
            const id = k.replace('fc_', '');
            const newVerdict = changes[k].newValue;
            if (newVerdict) {
              updateHighlightVerdict(id, String(newVerdict));
            }
          }
        });
      }
    });
  } catch (_) {}
}

export function injectHighlightStyles(): void {
  if (document.getElementById('annotated-highlight-style')) return;
  const style = document.createElement('style');
  style.id = 'annotated-highlight-style';
  style.textContent = `
    .annotated-highlight {
      border-radius: 3px !important;
      cursor: pointer !important;
      padding: 1px 3px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
      transition: background-color 0.2s ease, border-color 0.2s ease !important;
      font-weight: 500 !important;
      box-decoration-break: clone !important;
      -webkit-box-decoration-break: clone !important;
      background-image: none !important;
    }

    /* 🟡 Yellow: Default / Unverified */
    mark.annotated-highlight-unverified,
    span.annotated-highlight-unverified,
    .annotated-highlight-unverified,
    mark.annotated-highlight:not(.annotated-highlight-verified):not(.annotated-highlight-false),
    span.annotated-highlight:not(.annotated-highlight-verified):not(.annotated-highlight-false),
    .annotated-highlight:not(.annotated-highlight-verified):not(.annotated-highlight-false) {
      background-color: #fef08a !important;
      background-image: none !important;
      color: #713f12 !important;
      -webkit-text-fill-color: #713f12 !important;
      border-bottom: 2px solid #eab308 !important;
    }
    mark.annotated-highlight-unverified:hover,
    span.annotated-highlight-unverified:hover,
    .annotated-highlight-unverified:hover,
    mark.annotated-highlight:not(.annotated-highlight-verified):not(.annotated-highlight-false):hover,
    span.annotated-highlight:not(.annotated-highlight-verified):not(.annotated-highlight-false):hover,
    .annotated-highlight:not(.annotated-highlight-verified):not(.annotated-highlight-false):hover {
      background-color: #fde047 !important;
      border-bottom-color: #ca8a04 !important;
    }

    /* 🟢 Green: Verified */
    mark.annotated-highlight-verified,
    span.annotated-highlight-verified,
    .annotated-highlight-verified,
    .annotated-highlight.annotated-highlight-verified {
      background-color: #dcfce7 !important;
      background-image: none !important;
      color: #14532d !important;
      -webkit-text-fill-color: #14532d !important;
      border-bottom: 2.5px solid #22c55e !important;
    }
    mark.annotated-highlight-verified:hover,
    span.annotated-highlight-verified:hover,
    .annotated-highlight-verified:hover,
    .annotated-highlight.annotated-highlight-verified:hover {
      background-color: #bbf7d0 !important;
      border-bottom-color: #16a34a !important;
    }

    /* 🔴 Red: False / Misleading */
    mark.annotated-highlight-false,
    span.annotated-highlight-false,
    .annotated-highlight-false,
    .annotated-highlight.annotated-highlight-false {
      background-color: #fee2e2 !important;
      background-image: none !important;
      color: #991b1b !important;
      -webkit-text-fill-color: #991b1b !important;
      border-bottom: 2.5px solid #ef4444 !important;
    }
    mark.annotated-highlight-false:hover,
    span.annotated-highlight-false:hover,
    .annotated-highlight-false:hover,
    .annotated-highlight.annotated-highlight-false:hover {
      background-color: #fecaca !important;
      border-bottom-color: #dc2626 !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

export function clearAllHighlights(): void {
  const marks = document.querySelectorAll('.annotated-highlight, [data-annotated-highlight]');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    }
  });
}

export function extractCandidatePhrases(rawQuote: string): Set<string> {
  const candidates = new Set<string>();
  const clean = rawQuote.trim();
  if (!clean || clean.length < 5) return candidates;

  candidates.add(clean);

  // Split into clauses only if meaningful length (at least 15 chars and at least 3 words to avoid false positives like "1d ago")
  const clauses = clean
    .split(/[,.;:!?\n\r]+/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 15 && c.split(/\s+/).length >= 3);
  clauses.forEach((c) => candidates.add(c));

  // Word windows
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 8) {
    candidates.add(words.slice(0, 8).join(' '));
    candidates.add(words.slice(-8).join(' '));
  }

  return candidates;
}

export function safeHighlightRange(range: Range, annotation: Annotation): HTMLElement | null {
  try {
    const mark = document.createElement('mark');
    mark.className = getHighlightClass(annotation);
    if (annotation.id) mark.setAttribute('data-annotated-highlight', String(annotation.id));
    if (annotation.slug) mark.setAttribute('data-annotated-slug', String(annotation.slug));
    range.surroundContents(mark);
    highlightMap.set(mark, annotation);
    return mark;
  } catch (_) {
    try {
      const mark = document.createElement('mark');
      mark.className = getHighlightClass(annotation);
      if (annotation.id) mark.setAttribute('data-annotated-highlight', String(annotation.id));
      if (annotation.slug) mark.setAttribute('data-annotated-slug', String(annotation.slug));
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
      highlightMap.set(mark, annotation);
      return mark;
    } catch (_) {
      return null;
    }
  }
}

export function triggerScroll(mark: Element, annotation: Annotation): void {
  if (annotation._hasScrolled) return;
  annotation._hasScrolled = true;
  setTimeout(() => {
    try {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {}
  }, 350);
}

export function renderHighlight(annotation: Annotation): void {
  if (!annotation?.quote && !annotation?.quote_text) return;
  const quote = (annotation.quote || annotation.quote_text || '').trim();
  if (quote.length < 3) return;

  // Check if already rendered
  if (annotation.id && document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) {
    return;
  }

  // 1. Twitter / X tweet text check
  if (location.hostname.includes('twitter.com') || location.hostname.includes('x.com')) {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    for (const tweet of Array.from(tweets)) {
      const tweetTextEl = tweet.querySelector('[data-testid="tweetText"]');
      if (tweetTextEl && tweetTextEl.textContent) {
        const tNorm = norm(tweetTextEl.textContent);
        const qNorm = norm(quote);
        if (tNorm.length > 5 && (tNorm.includes(qNorm) || (qNorm.length > 10 && qNorm.includes(tNorm)))) {
          const mark = document.createElement('span');
          mark.className = getHighlightClass(annotation);
          mark.style.whiteSpace = 'pre-wrap';
          if (annotation.id) mark.setAttribute('data-annotated-highlight', String(annotation.id));
          if (annotation.slug) mark.setAttribute('data-annotated-slug', String(annotation.slug));
          mark.textContent = tweetTextEl.textContent;
          tweetTextEl.innerHTML = '';
          tweetTextEl.appendChild(mark);
          highlightMap.set(mark, annotation);
          triggerScroll(mark, annotation);
          return;
        }
      }
    }
  }

  // 3. Universal text search via candidate phrases
  const candidatePhrases = extractCandidatePhrases(quote);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (
      !parent ||
      parent.closest(
        'script, style, noscript, textarea, input, select, iframe, [data-annotated-highlight]'
      )
    ) {
      continue;
    }

    const text = node.nodeValue || '';
    for (const phrase of candidatePhrases) {
      const idx = text.indexOf(phrase);
      if (idx !== -1) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + phrase.length);
        const mark = safeHighlightRange(range, annotation);
        if (mark) {
          triggerScroll(mark, annotation);
          return;
        }
      }
    }
  }
}
