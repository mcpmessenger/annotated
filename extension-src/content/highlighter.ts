// ─── Multi-Platform In-Page Highlight Renderer ───────────────────────────────
// Fixes critical bugs:
// 1. norm() defined at module scope (was inaccessible inside mouseover handler)
// 2. candidatePhrases uses a Set rather than an Array with invalid .add() call

import type { Annotation } from '../types/annotation';
import { escapeHtml } from '../shared/utils';

export const norm = (s?: string | null): string =>
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const highlightMap = new WeakMap<Element, Annotation>();

export function injectHighlightStyles(): void {
  if (document.getElementById('annotated-highlight-style')) return;
  const style = document.createElement('style');
  style.id = 'annotated-highlight-style';
  style.textContent = `
    .annotated-highlight {
      background-color: #ffd21a !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      border-radius: 2px !important;
      cursor: pointer !important;
      padding: 1px 2px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.12) !important;
      transition: background-color 0.15s ease !important;
    }
    .annotated-highlight:hover {
      background-color: #f59e0b !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

export function extractCandidatePhrases(rawQuote: string): Set<string> {
  const candidates = new Set<string>();
  const clean = rawQuote.trim();
  if (!clean) return candidates;

  candidates.add(clean);

  // Split into clauses
  const clauses = clean.split(/[,.;:!?\n\r]+/).map((c) => c.trim()).filter((c) => c.length > 5);
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
    mark.className = 'annotated-highlight';
    mark.setAttribute('data-annotated-highlight', String(annotation.id || ''));
    range.surroundContents(mark);
    highlightMap.set(mark, annotation);
    return mark;
  } catch (_) {
    try {
      const mark = document.createElement('mark');
      mark.className = 'annotated-highlight';
      mark.setAttribute('data-annotated-highlight', String(annotation.id || ''));
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
        if (norm(tweetTextEl.textContent).includes(norm(quote))) {
          const mark = document.createElement('span');
          mark.className = 'annotated-highlight';
          mark.setAttribute('data-annotated-highlight', String(annotation.id || ''));
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
