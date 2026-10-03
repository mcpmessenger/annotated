// ─── In-Page Hover Dropdown & Tooltip for Annotations ────────────────────────

import type { Annotation, UserProfile } from '../types/annotation';
import { escapeHtml } from '../shared/utils';
import { highlightMap, factCheckCache } from './highlighter';
import { openAnnotationInWidget } from './widget-host';

let activeTooltipEl: HTMLElement | null = null;
let activeTargetEl: Element | null = null;
let tooltipHideTimeout: any = null;

export function setupHighlightTooltip(
  getAnnotations: () => Annotation[],
  getProfiles: () => Record<string, UserProfile>
): void {
  // Inject tooltip CSS once
  if (!document.getElementById('annotated-tooltip-style')) {
    const style = document.createElement('style');
    style.id = 'annotated-tooltip-style';
    style.textContent = `
      .annotated-text-hover-tooltip {
        position: absolute;
        z-index: 2147483647;
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 10px 12px;
        width: 270px;
        max-width: 90vw;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f8fafc;
        box-sizing: border-box;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
        pointer-events: auto;
      }
      .annotated-text-hover-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .annotated-tooltip-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 6px 8px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .annotated-tooltip-item:hover {
        background: rgba(255, 210, 26, 0.12);
        border-color: rgba(255, 210, 26, 0.35);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  const hideTooltip = () => {
    if (activeTooltipEl) {
      activeTooltipEl.remove();
      activeTooltipEl = null;
      activeTargetEl = null;
    }
  };

  document.addEventListener('mouseover', (e) => {
    const target = (e.target as Element)?.closest('.annotated-highlight');
    if (!target) return;

    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout);
      tooltipHideTimeout = null;
    }

    if (activeTargetEl === target && activeTooltipEl) {
      return;
    }

    hideTooltip();

    const ann = highlightMap.get(target);
    if (!ann) return;

    const allAnns = getAnnotations();
    const profiles = getProfiles();

    // Find all annotations that match this quote or this page
    const matchingAnns = allAnns.filter(
      (a) => a.id === ann.id || (ann.quote && a.quote && a.quote.trim() === ann.quote.trim())
    );
    const listToRender = matchingAnns.length > 0 ? matchingAnns : [ann];

    const tooltip = document.createElement('div');
    tooltip.className = 'annotated-text-hover-tooltip';

    // Tooltip header / title
    const headerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; margin-bottom:2px;">
        <span style="font-size:11px; font-weight:800; color:#ffd21a; letter-spacing:0.04em; text-transform:uppercase;">
          Annotated Notes (${listToRender.length})
        </span>
        <span style="font-size:10px; color:#94a3b8;">Click note to view</span>
      </div>
    `;

    const itemsHtml = listToRender
      .map((itemAnn) => {
        const prof = itemAnn.user_id ? profiles[itemAnn.user_id] : itemAnn.author_profile;
        const authorName =
          prof?.full_name ||
          (prof?.email ? `@${prof.email.split('@')[0]}` : itemAnn.user_name || 'Annotator');
        const avatarUrl = prof?.avatar_url || itemAnn.avatar_url;
        const avatarHtml = avatarUrl
          ? `<img src="${escapeHtml(
              avatarUrl
            )}" style="width:18px; height:18px; border-radius:50%; object-fit:cover; flex-shrink:0;">`
          : `<div style="width:18px; height:18px; border-radius:50%; background:#ffd21a; color:#000; font-size:9px; font-weight:800; display:grid; place-items:center; flex-shrink:0;">${escapeHtml(
              (authorName || 'A')[0].toUpperCase()
            )}</div>`;

        // Intent badge
        const tag = (itemAnn.intent || 'hot take').toLowerCase();
        const tagColors: Record<string, { bg: string; border: string; color: string; icon: string }> = {
          'hot take': { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', color: '#ef4444', icon: '🔥' },
          'fact check': { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', color: '#22c55e', icon: '✅' },
          steelman: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', color: '#3b82f6', icon: '🛡️' },
          receipts: { bg: 'rgba(249,115,22,0.15)', border: '#f97316', color: '#f97316', icon: '🧾' },
          explainer: { bg: 'rgba(168,85,247,0.15)', border: '#a855f7', color: '#a855f7', icon: '💬' },
        };
        const c = tagColors[tag] || {
          bg: 'rgba(255,210,26,0.15)',
          border: '#ffd21a',
          color: '#ffd21a',
          icon: '💡',
        };

        // Verdict check
        const verdict = (
          (itemAnn.id && factCheckCache[itemAnn.id]) ||
          (itemAnn.slug && factCheckCache[itemAnn.slug]) ||
          ''
        ).toUpperCase();
        let verdictBadge = '';
        if (verdict === 'VERIFIED') {
          verdictBadge = `<span style="font-size:9.5px; font-weight:800; background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#4ade80; padding:1px 5px; border-radius:4px;">✓ Verified</span>`;
        } else if (verdict === 'FALSE' || verdict === 'MISLEADING') {
          verdictBadge = `<span style="font-size:9.5px; font-weight:800; background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#f87171; padding:1px 5px; border-radius:4px;">✕ False</span>`;
        }

        const cleanComment = (itemAnn.comment || itemAnn.commentary || 'View annotation').trim();

        return `
        <div class="annotated-tooltip-item" data-ann-id="${escapeHtml(itemAnn.id || '')}">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
              ${avatarHtml}
              <strong style="font-size:11px; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(
                authorName
              )}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              ${verdictBadge}
              <span style="font-size:9.5px; font-weight:700; background:${c.bg}; border:1px solid ${
          c.border
        }; color:${c.color}; padding:1px 5px; border-radius:99px; white-space:nowrap;">
                ${c.icon} ${escapeHtml(itemAnn.intent || 'note')}
              </span>
            </div>
          </div>
          <div style="font-size:11.5px; color:#cbd5e1; line-height:1.35; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">
            ${escapeHtml(cleanComment)}
          </div>
        </div>`;
      })
      .join('');

    tooltip.innerHTML = `${headerHtml}${itemsHtml}`;

    // Item click router
    tooltip.querySelectorAll('.annotated-tooltip-item').forEach((itemEl) => {
      itemEl.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        const clickedId = (itemEl as HTMLElement).dataset.annId;
        const selectedAnn = listToRender.find((a) => a.id === clickedId) || ann;
        if (selectedAnn.user_id && profiles[selectedAnn.user_id]) {
          selectedAnn.author_profile = profiles[selectedAnn.user_id];
        }
        openAnnotationInWidget(selectedAnn);
        hideTooltip();
      });
    });

    tooltip.addEventListener('mouseenter', () => {
      if (tooltipHideTimeout) {
        clearTimeout(tooltipHideTimeout);
        tooltipHideTimeout = null;
      }
    });

    tooltip.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    document.body.appendChild(tooltip);

    // Position tooltip nicely below or above target
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 270;
    let left = rect.left + window.scrollX;

    // Viewport overflow bounds
    if (left + tooltipWidth > window.innerWidth + window.scrollX - 12) {
      left = window.innerWidth + window.scrollX - tooltipWidth - 12;
    }
    if (left < window.scrollX + 8) {
      left = window.scrollX + 8;
    }

    const placeAbove = rect.bottom + 240 > window.innerHeight && rect.top > 180;
    if (placeAbove) {
      const top = rect.top + window.scrollY - 8;
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      tooltip.style.transform = 'translateY(-100%)';
    } else {
      const top = rect.bottom + window.scrollY + 6;
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }

    requestAnimationFrame(() => {
      tooltip.classList.add('visible');
    });

    activeTooltipEl = tooltip;
    activeTargetEl = target;
  });

  document.addEventListener('mouseout', (e) => {
    const target = (e.target as Element)?.closest('.annotated-highlight');
    if (target && activeTargetEl === target) {
      tooltipHideTimeout = setTimeout(() => {
        hideTooltip();
      }, 250);
    }
  });
}
