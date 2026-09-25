import { $ } from '../shared/dom';
import { SITE_URL, SUPABASE_CONFIG } from '../shared/config';
import { supabase } from '../shared/supabase';
import { escapeHtml, formatSeconds, extractTimestamp, openExternalUrl, initials, pageKey } from '../shared/utils';
import { wireFactCheck } from './factcheck';
import { loadWidgetComments } from './comments';
import type { Annotation, CurrentUser, UserProfile } from '../types/annotation';

export async function showAnnotationDetail(
  ann: Annotation,
  currentUser: CurrentUser | null,
  onBackToComposer: () => void,
  onResize: (height: number) => void,
  onDeleted?: () => void
): Promise<void> {
  if (!ann) return;

  let activeUser = currentUser;
  if (!activeUser) {
    try {
      const session = await supabase.restoreSession();
      activeUser = supabase.userFromSession(session);
    } catch (_) {}
  }

  $('#composerSection')?.classList.add('hidden');
  const detailCard = $('#annotationDetailCard');
  if (!detailCard) return;

  detailCard.classList.remove('hidden');

  // Back button
  const detailBack = $('#detailBackBtn');
  if (detailBack) {
    detailBack.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onBackToComposer();
    };
  }

  // Delete button (visible only if activeUser is the author or if local note without user_id)
  const isAuthor = Boolean(activeUser && (ann.user_id === activeUser.id || !ann.user_id));
  const deleteBtn = $('#detailDeleteBtn') as HTMLButtonElement | null;
  if (deleteBtn) {
    if (isAuthor) {
      deleteBtn.classList.remove('hidden');
      deleteBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this annotation?')) return;

        deleteBtn.disabled = true;
        try {
          if (ann.id) {
            await supabase.from('annotations').delete().eq('id', ann.id).execute();
          }
        } catch (err) {
          console.warn('[Annotated Delete] Error:', err);
        }

        try {
          const key = pageKey(ann.url || location.href);
          chrome.storage.local.get(key, (data: Record<string, any>) => {
            const stored = ((data[key] as Annotation[]) || []).filter(
              (a: Annotation) => String(a.id) !== String(ann.id)
            );
            chrome.storage.local.set({ [key]: stored }, () => {});
          });
        } catch (_) {}

        try {
          window.parent.postMessage({ type: 'RELOAD_ANNOTATIONS' }, '*');
        } catch (_) {}

        if (onDeleted) {
          onDeleted();
        }
        onBackToComposer();
      };
    } else {
      deleteBtn.classList.add('hidden');
      deleteBtn.onclick = null;
    }
  }

  // Quote
  const qEl = $('#detailQuote');
  if (qEl) qEl.textContent = ann.quote || ann.quote_text || 'Annotation';

  // Intent
  const intentEl = $('#detailIntentBadge');
  if (intentEl) intentEl.textContent = ann.intent || '💡';

  // Target Web URL
  const slug = ann.slug || ann.id;
  const targetUser =
    ann.username ||
    (ann.author_profile?.email
      ? ann.author_profile.email.split('@')[0]
      : currentUser?.email
      ? currentUser.email.split('@')[0]
      : 'user');
  const detailUrl = slug ? `${SITE_URL}/${encodeURIComponent(targetUser)}/${encodeURIComponent(slug)}` : SITE_URL;

  const openWebBtn = $('#detailOpenWebBtn') as HTMLAnchorElement | null;
  if (openWebBtn) {
    openWebBtn.href = detailUrl;
    openWebBtn.onclick = (e) => {
      e.stopPropagation();
      openExternalUrl(detailUrl);
    };
  }

  // Timestamp
  const isVideoPage = ann.url && (ann.url.includes('youtube.com') || ann.url.includes('vimeo.com'));
  const hasVideoAttachment = !!(
    ann.media_url &&
    (ann.media_type === 'video' || ann.media_url.includes('.webm') || ann.media_url.includes('.mp4'))
  );
  const explicitCommentTs = ann.comment ? String(ann.comment).match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\]/) : null;
  const showTs = isVideoPage || hasVideoAttachment || !!explicitCommentTs;
  const ts = showTs
    ? ann.extractedTimestamp != null
      ? ann.extractedTimestamp
      : extractTimestamp(ann.url, ann.comment || ann.commentary)
    : null;

  const tsBadge = $('#detailTimestampBadge');
  const tsText = $('#detailTimestampText');
  if (tsBadge && tsText && ts != null && ts > 0) {
    tsText.textContent = formatSeconds(ts);
    tsBadge.classList.remove('hidden');
    tsBadge.onclick = (e) => {
      e.stopPropagation();
      window.parent.postMessage({ type: 'SEEK_MEDIA', seconds: ts }, '*');
    };
  } else if (tsBadge) {
    tsBadge.classList.add('hidden');
  }

  // Comment text
  const commentEl = $('#detailComment');
  if (commentEl) commentEl.textContent = ann.comment || ann.commentary || '(No comment)';

  // Author details
  const authorEl = $('#detailAuthorName');
  const avatarEl = $('#detailAvatar');
  const dateEl = $('#detailDate');
  if (dateEl) {
    dateEl.textContent = '· ' + (ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recent');
  }

  const applyProfile = (name: string, handle?: string, avatarUrl?: string | null) => {
    if (authorEl) {
      authorEl.innerHTML = `${escapeHtml(name)}${
        handle ? ` <span class="muted" style="font-weight: normal; font-size: 10px;">${escapeHtml(handle)}</span>` : ''
      }`;
    }
    if (avatarEl) {
      if (avatarUrl) {
        avatarEl.style.backgroundImage = `url(${avatarUrl})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.textContent = initials(name);
      }
    }
  };

  if (currentUser && (ann.user_id === currentUser.id || !ann.user_id)) {
    const name = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'You');
    const handle = currentUser.email ? `@${currentUser.email.split('@')[0]}` : '';
    applyProfile(name, handle, currentUser.avatar);
  } else if (ann.author_profile) {
    const prof = ann.author_profile;
    const name = prof.full_name || (prof.email ? prof.email.split('@')[0] : 'Annotator');
    const handle = prof.email ? `@${prof.email.split('@')[0]}` : '';
    applyProfile(name, handle, prof.avatar_url);
  } else {
    applyProfile(ann.user_name || 'Community Member');
  }

  // Media box
  const mediaBox = $('#detailMediaBox');
  if (mediaBox) {
    mediaBox.innerHTML = '';
    if (ann.media_url && (ann.media_type === 'video' || ann.media_url.includes('.webm') || ann.media_url.includes('.mp4'))) {
      mediaBox.innerHTML = `<video src="${escapeHtml(ann.media_url)}" controls playsinline style="width:100%; max-height:160px; display:block;"></video>`;
      mediaBox.classList.remove('hidden');
    } else if (ann.media_url) {
      mediaBox.innerHTML = `<img src="${escapeHtml(ann.media_url)}" style="width:100%; max-height:160px; object-fit:contain; display:block;">`;
      mediaBox.classList.remove('hidden');
    } else if (ann.audio_url) {
      mediaBox.innerHTML = `<audio src="${escapeHtml(ann.audio_url)}" controls style="width:100%; display:block;"></audio>`;
      mediaBox.classList.remove('hidden');
    } else {
      mediaBox.classList.add('hidden');
    }
  }

  // Copy annotation link button (keeps users on Annotated)
  const copyLinkBtn = $('#detailCopyLinkBtn');
  if (copyLinkBtn) {
    copyLinkBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(detailUrl);
        copyLinkBtn.setAttribute('data-tooltip', 'Copied to clipboard!');
        setTimeout(() => {
          copyLinkBtn.setAttribute('data-tooltip', 'Copy annotation link');
        }, 2200);
      } catch (_) {}
    };
  }

  // Wire reactions
  wireDetailReactions(ann.id || ann.slug || '', activeUser);

  // Wire Fact Check (defaults to open with hide toggle)
  wireFactCheck(ann, ann.title || 'Page', ann.url || location.href, onResize);

  // Wire Comments
  if (ann.id || ann.slug) loadWidgetComments(ann.id || ann.slug || '', activeUser);

  const hasMedia = !!(ann.media_url || ann.audio_url);
  onResize(hasMedia ? 630 : 550);
}

export async function wireDetailReactions(annotationId: string, currentUser: CurrentUser | null): Promise<void> {
  if (!annotationId) return;

  let activeUser = currentUser;
  if (!activeUser) {
    try {
      const session = await supabase.restoreSession();
      activeUser = supabase.userFromSession(session);
    } catch (_) {}
  }

  const loadReactions = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/annotation_reactions?annotation_id=eq.${encodeURIComponent(
          annotationId
        )}&select=emoji,user_id`,
        { headers: { apikey: SUPABASE_CONFIG.anonKey } }
      );
      const rows: { emoji: string; user_id: string }[] = await res.json();
      if (!Array.isArray(rows)) return;

      const counts: Record<string, number> = {};
      const myReacts = new Set<string>();
      rows.forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        if (activeUser && r.user_id === activeUser.id) myReacts.add(r.emoji);
      });

      document.querySelectorAll('.detail-react-btn').forEach((btnEl) => {
        const btn = btnEl as HTMLElement;
        const emoji = btn.dataset.react;
        if (!emoji) return;
        const countEl = btn.querySelector('.react-count');
        if (countEl) countEl.textContent = String(counts[emoji] || 0);

        if (myReacts.has(emoji)) {
          btn.classList.add('react-active');
          btn.style.background = 'var(--yellow)';
          btn.style.borderColor = 'var(--yellow)';
          btn.style.color = '#000';
          btn.style.fontWeight = '700';
        } else {
          btn.classList.remove('react-active');
          btn.style.background = 'none';
          btn.style.borderColor = 'var(--line)';
          btn.style.color = 'var(--ink)';
          btn.style.fontWeight = 'normal';
        }
      });
    } catch (_) {}
  };

  // Wire click handlers immediately
  document.querySelectorAll('.detail-react-btn').forEach((btnEl) => {
    const btn = btnEl as HTMLElement;
    btn.onclick = async (e) => {
      e.stopPropagation();

      let reactUser = activeUser;
      if (!reactUser) {
        try {
          const session = await supabase.restoreSession();
          reactUser = supabase.userFromSession(session);
          if (reactUser) activeUser = reactUser;
        } catch (_) {}
      }

      if (!reactUser) {
        alert('Please sign in to react!');
        return;
      }

      const emoji = btn.dataset.react;
      if (!emoji) return;

      const countEl = btn.querySelector('.react-count');
      const curCount = parseInt(countEl?.textContent || '0', 10);
      const isActive = btn.classList.contains('react-active');

      // Optimistic UI toggle
      if (isActive) {
        btn.classList.remove('react-active');
        btn.style.background = 'none';
        btn.style.borderColor = 'var(--line)';
        btn.style.color = 'var(--ink)';
        btn.style.fontWeight = 'normal';
        const next = Math.max(0, curCount - 1);
        if (countEl) countEl.textContent = String(next);
      } else {
        btn.classList.add('react-active');
        btn.style.background = 'var(--yellow)';
        btn.style.borderColor = 'var(--yellow)';
        btn.style.color = '#000';
        btn.style.fontWeight = '700';
        const next = curCount + 1;
        if (countEl) countEl.textContent = String(next);
      }

      try {
        const headers = await supabase.getAuthHeaders();
        if (isActive) {
          await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/annotation_reactions?annotation_id=eq.${encodeURIComponent(
              annotationId
            )}&user_id=eq.${encodeURIComponent(reactUser.id)}&emoji=eq.${encodeURIComponent(emoji)}`,
            {
              method: 'DELETE',
              headers,
            }
          );
        } else {
          await fetch(`${SUPABASE_CONFIG.url}/rest/v1/annotation_reactions`, {
            method: 'POST',
            headers: {
              ...headers,
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({ annotation_id: annotationId, user_id: reactUser.id, emoji }),
          });
        }
      } catch (err) {
        console.warn('[Annotated Reaction Error]', err);
      }

      loadReactions();
    };
  });

  // Load server reaction counts
  loadReactions();
}
