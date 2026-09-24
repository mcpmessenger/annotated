// ─── YouTube Video Markers & Floating Badge ──────────────────────────────────

import type { Annotation, UserProfile } from '../types/annotation';
import { extractTimestampRange, formatSeconds, escapeHtml } from '../shared/utils';

export function renderYouTubeProgressBarMarkers(
  annotations: Annotation[],
  onSeek: (seconds: number) => void,
  onOpenAnnotation: (ann: Annotation) => void
): void {
  const isYTWatch = location.hostname.includes('youtube.com') && location.pathname.includes('/watch');
  if (!isYTWatch || !annotations || annotations.length === 0) {
    const existingContainer = document.getElementById('annotated-yt-markers-layer');
    if (existingContainer) existingContainer.remove();
    return;
  }

  const mediaEl = document.querySelector('video') as HTMLVideoElement | null;
  const progressBar = (document.querySelector('.ytp-progress-bar') ||
    document.querySelector('.ytp-progress-bar-container')) as HTMLElement | null;

  if (!mediaEl || !progressBar || !mediaEl.duration || isNaN(mediaEl.duration) || mediaEl.duration <= 0) {
    return;
  }

  const currentVId = new URLSearchParams(location.search).get('v');
  const ytAnns = annotations.filter((ann) => {
    if (!ann) return false;
    if (currentVId) return String(ann.url || '').includes(currentVId);
    return true;
  });

  if (ytAnns.length === 0) {
    const existingContainer = document.getElementById('annotated-yt-markers-layer');
    if (existingContainer) existingContainer.remove();
    return;
  }

  let markersLayer = document.getElementById('annotated-yt-markers-layer');
  if (!markersLayer) {
    markersLayer = document.createElement('div');
    markersLayer.id = 'annotated-yt-markers-layer';
    markersLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999;
    `;
    progressBar.appendChild(markersLayer);
  }

  markersLayer.innerHTML = '';
  const totalDuration = mediaEl.duration;

  ytAnns.forEach((ann) => {
    const range = extractTimestampRange(ann.url, ann.comment || ann.commentary);
    if (!range || range.start < 0 || range.start > totalDuration) return;

    const startPct = (range.start / totalDuration) * 100;
    const endPct = (Math.min(range.end, totalDuration) / totalDuration) * 100;
    const widthPct = Math.max(endPct - startPct, 0.6);

    const intent = ann.intent || '💡';
    const commentText = (ann.comment || ann.commentary || ann.quote || ann.quote_text || 'Annotation').trim();

    const marker = document.createElement('div');
    marker.className = 'annotated-yt-progress-marker-wrap';
    marker.style.cssText = `
      position: absolute;
      left: ${startPct}%;
      width: ${widthPct}%;
      min-width: 14px;
      top: -15px;
      bottom: -15px;
      cursor: pointer;
      pointer-events: auto;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const visual = document.createElement('div');
    visual.className = 'annotated-yt-progress-marker';
    visual.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(255, 210, 26, 0.65);
      border: 1px solid #ffd21a;
      border-radius: 3px;
      box-shadow: 0 0 10px rgba(255, 210, 26, 0.8), inset 0 0 4px rgba(255, 210, 26, 0.6);
      transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    `;
    marker.appendChild(visual);

    let markerTooltip: HTMLElement | null = null;

    marker.addEventListener('mouseenter', () => {
      visual.style.transform = 'scaleY(1.8)';
      visual.style.background = 'rgba(255, 255, 255, 0.9)';
      visual.style.boxShadow = '0 0 14px #ffffff, 0 0 8px #ffd21a';

      markerTooltip = document.createElement('div');
      markerTooltip.className = 'annotated-yt-marker-tooltip';
      markerTooltip.style.cssText = `
        position: absolute;
        bottom: 26px;
        left: ${startPct}%;
        transform: translateX(-20%);
        background: #17242c;
        border: 1.5px solid #ffd21a;
        border-radius: 10px;
        padding: 8px 12px;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 8px 24px rgba(0,0,0,0.75);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      const timeRangeStr =
        range.end > range.start + 2
          ? `${formatSeconds(range.start)} - ${formatSeconds(range.end)}`
          : formatSeconds(range.start);

      const cleanComment = commentText.replace(/\[(?:⏱️\s*)?[0-9hms:]+\s*-\s*[0-9hms:]+\]/i, '').trim();

      markerTooltip.innerHTML = `
        <span style="background:#ffd21a; color:#000; padding:2px 7px; border-radius:12px; font-weight:800; font-size:11px;">⏱️ ${timeRangeStr}</span>
        ${intent ? `<span style="color:#ffd21a; font-weight:700;">${intent}</span>` : ''}
        ${
          cleanComment
            ? `<span style="opacity:0.9; max-width:240px; overflow:hidden; text-overflow:ellipsis;">"${escapeHtml(
                cleanComment.slice(0, 50)
              )}${cleanComment.length > 50 ? '…' : ''}"</span>`
            : ''
        }
      `;
      markersLayer?.appendChild(markerTooltip);
    });

    marker.addEventListener('mouseleave', () => {
      visual.style.transform = 'scale(1)';
      visual.style.background = 'rgba(255, 210, 26, 0.65)';
      visual.style.boxShadow = '0 0 10px rgba(255, 210, 26, 0.8), inset 0 0 4px rgba(255, 210, 26, 0.6)';
      if (markerTooltip) {
        markerTooltip.remove();
        markerTooltip = null;
      }
    });

    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onSeek(range.start);
      onOpenAnnotation(ann);
    });

    markersLayer.appendChild(marker);
  });
}

export function renderYouTubeVideoTag(
  annotations: Annotation[],
  profiles: Record<string, UserProfile>,
  onSeek: (seconds: number) => void,
  onOpenAnnotation: (ann: Annotation) => void
): void {
  const isYTWatch = location.hostname.includes('youtube.com') && location.pathname.includes('/watch');
  if (!isYTWatch) {
    const existingBadge = document.getElementById('annotated-yt-floating-badge');
    if (existingBadge) existingBadge.remove();
    return;
  }

  const currentVId = new URLSearchParams(location.search).get('v');
  const ytAnns = annotations.filter((ann) => {
    if (!ann) return false;
    if (currentVId) return String(ann.url || '').includes(currentVId);
    return true;
  });

  if (!ytAnns.length) {
    const existingBadge = document.getElementById('annotated-yt-floating-badge');
    if (existingBadge) existingBadge.remove();
    return;
  }

  const currentFingerprint = ytAnns.map((a) => `${a.id}:${a.comment || ''}`).join(',');
  let badge = document.getElementById('annotated-yt-floating-badge');
  if (badge && badge.getAttribute('data-fingerprint') === currentFingerprint) {
    return; // Already rendered and matches current annotations
  }
  if (badge) badge.remove();

  badge = document.createElement('div');
  badge.id = 'annotated-yt-floating-badge';
  badge.setAttribute('data-fingerprint', currentFingerprint);
  badge.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 2147483640;
    background: #0f172a;
    color: #f8fafc;
    border: 1.5px solid #ffd21a;
    border-radius: 9999px;
    padding: 7px 15px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255, 210, 26, 0.25);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  badge.innerHTML = `
    <span style="font-size: 14px;">💬</span>
    <span style="color: #ffffff; font-weight: 700;">${ytAnns.length} note${ytAnns.length === 1 ? '' : 's'} on this page</span>
    <span style="background: #ffd21a; color: #000; font-size: 10px; font-weight: 900; padding: 1px 6px; border-radius: 10px;">▼</span>
  `;

  // Dropdown list container
  const menu = document.createElement('div');
  menu.className = 'annotated-yt-dropdown-menu';
  menu.style.cssText = `
    position: absolute;
    bottom: calc(100% + 10px);
    left: 0;
    background: #0f172a;
    border: 1.5px solid #ffd21a;
    border-radius: 12px;
    padding: 8px;
    display: none;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 210, 26, 0.2);
    min-width: 280px;
    max-width: 360px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 2147483647;
    cursor: default;
  `;

  ytAnns.forEach((ann) => {
    const item = document.createElement('div');
    const tsRange = extractTimestampRange(ann.url, ann.comment || ann.commentary);
    let tsStr = '';
    let startSec: number | null = null;
    if (tsRange) {
      startSec = tsRange.start;
      tsStr =
        tsRange.end > tsRange.start + 2
          ? `${formatSeconds(tsRange.start)} - ${formatSeconds(tsRange.end)}`
          : formatSeconds(tsRange.start);
    }

    const intent = ann.intent || '💡';
    const commentRaw = (ann.comment || ann.commentary || ann.quote || ann.quote_text || 'Annotation').trim();
    const cleanComment = commentRaw.replace(/\[(?:⏱️\s*)?[0-9hms:]+\s*-\s*[0-9hms:]+\]/i, '').trim();

    const prof = ann.user_id ? profiles[ann.user_id] : undefined;
    const authorName = prof?.full_name || (prof?.email ? `@${prof.email.split('@')[0]}` : ann.user_name || 'Annotator');
    const avatarUrl = prof?.avatar_url;

    const avatarHtml = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`
      : `<div style="width: 18px; height: 18px; border-radius: 50%; background: #ffd21a; color: #000; font-size: 9px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0;">${escapeHtml(
          (authorName || 'A')[0].toUpperCase()
        )}</div>`;

    item.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 10px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      text-align: left;
    `;

    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(255, 210, 26, 0.15)';
      item.style.borderColor = 'rgba(255, 210, 26, 0.4)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'rgba(255, 255, 255, 0.05)';
      item.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    });

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (startSec != null) onSeek(startSec);
      onOpenAnnotation(ann);
      menu.style.display = 'none';
    });

    item.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
          ${avatarHtml}
          <strong style="font-size: 11px; color: #ffd21a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
            authorName
          )}</strong>
        </div>
        ${intent ? `<span style="font-size: 12px; flex-shrink: 0;">${intent}</span>` : ''}
      </div>
      ${
        tsStr
          ? `<div style="display: flex; align-items: center; gap: 4px; margin-top: 1px;">
              <span style="background: #ffd21a; color: #000; padding: 2px 7px; border-radius: 10px; font-weight: 800; font-size: 10px; font-family: monospace;">⏱️ ${tsStr}</span>
             </div>`
          : ''
      }
      <div style="font-size: 11.5px; color: #e2e8f0; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-top: 2px;">
        ${escapeHtml(cleanComment || 'Annotation note')}
      </div>
    `;

    menu.appendChild(item);
  });

  badge.appendChild(menu);

  // Smooth hover open/close
  let hoverTimer: any = null;
  badge.addEventListener('mouseenter', () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    badge.style.transform = 'scale(1.03)';
    menu.style.display = 'flex';
  });

  badge.addEventListener('mouseleave', () => {
    hoverTimer = setTimeout(() => {
      menu.style.display = 'none';
      badge.style.transform = 'scale(1)';
    }, 280);
  });

  // Clicking badge directly opens the first note
  badge.addEventListener('click', (e) => {
    // If click was inside the menu, let item handler deal with it
    if ((e.target as HTMLElement).closest('.annotated-yt-dropdown-menu')) return;
    if (ytAnns[0]) {
      const range = extractTimestampRange(ytAnns[0].url, ytAnns[0].comment || ytAnns[0].commentary);
      if (range) onSeek(range.start);
      onOpenAnnotation(ytAnns[0]);
    }
  });

  document.body.appendChild(badge);
}
