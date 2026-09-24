// ─── Annotation Feed Module ──────────────────────────────────────────────────

import { $ } from '../shared/dom';
import { supabase } from '../shared/supabase';
import { escapeHtml, extractTimestamp, formatSeconds, openExternalUrl, pageKey, extractYouTubeVideoId } from '../shared/utils';
import { SITE_URL } from '../shared/config';
import type { Annotation, CurrentUser, PageContext } from '../types/annotation';

export function renderFeed(
  items: Annotation[],
  page: PageContext,
  currentUser: CurrentUser | null,
  onAnnotationDeleted: () => void
): void {
  const currentVId = extractYouTubeVideoId(page.url);

  const filteredItems = Array.isArray(items)
    ? items.filter((a) => {
        if (!a) return false;
        if (currentVId) return String(a.url || '').includes(currentVId);
        return true;
      })
    : [];

  const countEl = $('#annotationCount');
  if (countEl) {
    countEl.textContent = `${filteredItems.length} annotation${filteredItems.length === 1 ? '' : 's'}`;
  }

  const feedEl = $('#feed');
  if (!feedEl) return;

  if (!filteredItems.length) {
    feedEl.innerHTML = '<div class="empty">Your annotations on this page will appear here.</div>';
    return;
  }

  feedEl.innerHTML = filteredItems
    .slice()
    .reverse()
    .map((a) => {
      const username =
        a.username ||
        (a.author_profile?.email
          ? a.author_profile.email.split('@')[0]
          : currentUser?.email
          ? currentUser.email.split('@')[0]
          : 'user');
      const targetSlug = String(a.slug || a.id || '');
      const webUrl = targetSlug
        ? `${SITE_URL}/${encodeURIComponent(username)}/${encodeURIComponent(targetSlug)}`
        : SITE_URL;
      const ts = extractTimestamp(a.url, a.comment || a.commentary);
      const tsStr = ts != null ? formatSeconds(ts) : '';

      return `
      <article class="annotation" data-id="${escapeHtml(a.id || '')}">
        <div class="aheader" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:700; font-size:12px; color:#ffd21a;">${escapeHtml(a.intent || '💡')} ${
        tsStr ? `⏱️ ${tsStr}` : ''
      }</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <a class="web-link" href="${escapeHtml(
              webUrl
            )}" target="_blank" rel="noopener" style="color:#8899a6; text-decoration:none; font-size:12px; font-weight:600;" data-tooltip="Open on Annotated Website">↗ View Web</a>
            ${
              currentUser && (a.user_id === currentUser.id || !a.user_id)
                ? '<button class="feed-delete-btn" style="background:none; border:none; color:#8899a6; cursor:pointer; font-size:12px; padding:0 2px;" data-tooltip="Delete annotation">🗑️</button>'
                : ''
            }
          </div>
        </div>
        <div class="aquote" style="cursor:pointer;" data-tooltip="Click to seek video">"${escapeHtml(
          a.quote || a.quote_text || ''
        )}"</div>
        ${
          a.media_url
            ? `
          <div class="feed-media-wrap">
            ${
              a.media_type === 'video' || a.media_url.includes('.webm') || a.media_url.includes('.mp4')
                ? `<video class="feed-media" src="${escapeHtml(a.media_url)}" controls playsinline></video>`
                : `<img class="feed-media" src="${escapeHtml(a.media_url)}" alt="Annotation media" loading="lazy">`
            }
          </div>`
            : ''
        }
        <div class="acomment">${escapeHtml(a.comment || a.commentary || '')}</div>
        <div class="meta" style="margin-top:6px; display:flex; justify-content:space-between; font-size:11px; color:#8899a6;">
          <span>@${escapeHtml(username)} · ${new Date(a.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
      </article>`;
    })
    .join('');

  // Wire feed events
  feedEl.querySelectorAll('.annotation').forEach((el) => {
    const annId = (el as HTMLElement).dataset.id;
    const ann = filteredItems.find((a) => String(a.id) === String(annId));
    if (!ann) return;

    el.querySelector('.web-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const username =
        ann.username ||
        (ann.author_profile?.email
          ? ann.author_profile.email.split('@')[0]
          : currentUser?.email
          ? currentUser.email.split('@')[0]
          : 'user');
      const targetSlug = String(ann.slug || ann.id || '');
      const webUrl = targetSlug
        ? `${SITE_URL}/${encodeURIComponent(username)}/${encodeURIComponent(targetSlug)}`
        : SITE_URL;
      openExternalUrl(webUrl);
    });

    el.querySelector('.feed-delete-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this annotation?')) return;

      try {
        await supabase.from('annotations').delete().eq('id', ann.id || '').execute();
      } catch (err) {
        console.warn('[Annotated Delete] Error:', err);
      }

      try {
        const key = pageKey(page.url);
        chrome.storage.local.get(key, (data: Record<string, any>) => {
          const stored = ((data[key] as Annotation[]) || []).filter((a: Annotation) => String(a.id) !== String(ann.id));
          chrome.storage.local.set({ [key]: stored }, () => {});
        });
      } catch (_) {}

      try {
        window.parent.postMessage({ type: 'RELOAD_ANNOTATIONS' }, '*');
      } catch (_) {}

      onAnnotationDeleted();
    });

    el.querySelector('.aquote')?.addEventListener('click', () => {
      const ts = extractTimestamp(ann.url, ann.comment || ann.commentary);
      if (ts != null) {
        window.parent.postMessage({ type: 'SEEK_MEDIA', seconds: ts }, '*');
      }
    });
  });
}

export async function loadFeedFromSupabase(
  page: PageContext,
  currentUser: CurrentUser | null,
  onDeleted: () => void
): Promise<void> {
  if (!currentUser) {
    renderFeed([], page, currentUser, onDeleted);
    return;
  }

  let cleanUrl = page.url || location.href;
  const currentVId = extractYouTubeVideoId(cleanUrl);

  try {
    let items: Annotation[] | null = null;
    if (currentVId) {
      items = await supabase.from('annotations').select('*').ilike('url', `%${currentVId}%`).execute();
    } else if (cleanUrl) {
      items = await supabase.from('annotations').select('*').ilike('url', `%${cleanUrl}%`).execute();
    }
    if (Array.isArray(items)) {
      renderFeed(items, page, currentUser, onDeleted);
      return;
    }
  } catch (err) {
    console.warn('[Annotated Widget] loadFeedFromSupabase error:', err);
  }

  // Fallback to local storage
  const key = pageKey(cleanUrl);
  chrome.storage.local.get(key, (data: Record<string, any>) => {
    const localItems: Annotation[] = (data[key] as Annotation[]) || [];
    renderFeed(localItems, page, currentUser, onDeleted);
  });
}
