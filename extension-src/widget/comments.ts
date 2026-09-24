// ─── Annotation Discussion Comments Module ───────────────────────────────────

import { $ } from '../shared/dom';
import { SUPABASE_CONFIG, SITE_URL } from '../shared/config';
import { supabase } from '../shared/supabase';
import { escapeHtml, initials, openExternalUrl } from '../shared/utils';
import type { Comment, CurrentUser, UserProfile } from '../types/annotation';

export let currentDetailAnnotationId: string | null = null;
export let isCommentDictating = false;
export let baseCommentReply = '';

export async function loadWidgetComments(
  annotationId: string,
  currentUser: CurrentUser | null
): Promise<void> {
  currentDetailAnnotationId = annotationId;
  const listEl = $('#widgetCommentList');
  const countEl = $('#widgetCommentCount');
  if (!listEl) return;

  let activeUser = currentUser;
  if (!activeUser) {
    try {
      const session = await supabase.restoreSession();
      activeUser = supabase.userFromSession(session);
    } catch (_) {}
  }

  if (countEl) countEl.textContent = '…';

  try {
    const res = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/comments?annotation_id=eq.${encodeURIComponent(
        annotationId
      )}&order=created_at.asc`,
      {
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
      }
    );
    const comments: Comment[] = await res.json();
    if (!Array.isArray(comments)) return;

    if (countEl) countEl.textContent = String(comments.length);

    if (comments.length === 0) {
      listEl.innerHTML =
        '<div style="font-size: 11px; color: var(--muted); text-align: center; padding: 12px 0;">No comments yet. Start the conversation!</div>';
      return;
    }

    // Batch query profiles
    const userIds = Array.from(new Set(comments.map((c) => c.user_id).filter(Boolean)));
    const profiles: Record<string, UserProfile> = {};

    if (userIds.length > 0) {
      try {
        const profRes = await fetch(
          `${SUPABASE_CONFIG.url}/rest/v1/profiles?id=in.(${userIds.join(',')})`,
          {
            headers: {
              apikey: SUPABASE_CONFIG.anonKey,
              Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            },
          }
        );
        const profList: UserProfile[] = await profRes.json();
        if (Array.isArray(profList)) {
          profList.forEach((p) => {
            if (p.id) profiles[p.id] = p;
          });
        }
      } catch (_) {}
    }

    // Batch fetch reactions for all comments
    const commentIds = comments.map((c) => c.id).filter(Boolean);
    const reactionsMap: Record<string, { counts: Record<string, number>; userReacted: Set<string> }> = {};
    commentIds.forEach((id) => {
      reactionsMap[id] = { counts: {}, userReacted: new Set() };
    });

    if (commentIds.length > 0) {
      try {
        const reactRes = await fetch(
          `${SUPABASE_CONFIG.url}/rest/v1/comment_reactions?comment_id=in.(${commentIds.join(
            ','
          )})&select=comment_id,emoji,user_id`,
          {
            headers: {
              apikey: SUPABASE_CONFIG.anonKey,
            },
          }
        );
        const reactRows = await reactRes.json();
        if (Array.isArray(reactRows)) {
          reactRows.forEach((r: { comment_id: string; emoji: string; user_id: string }) => {
            if (reactionsMap[r.comment_id]) {
              reactionsMap[r.comment_id].counts[r.emoji] =
                (reactionsMap[r.comment_id].counts[r.emoji] || 0) + 1;
              if (activeUser && r.user_id === activeUser.id) {
                reactionsMap[r.comment_id].userReacted.add(r.emoji);
              }
            }
          });
        }
      } catch (_) {}
    }

    const COMMENT_EMOJIS = ['🔥', '🤔', '💡', '💯', '👎'];

    listEl.innerHTML = comments
      .map((c) => {
        const isMe = activeUser && c.user_id === activeUser.id;
        const prof = profiles[c.user_id];
        const name = isMe
          ? 'You'
          : prof?.full_name || prof?.email?.split('@')[0] || 'User';
        const handle = prof?.email ? `@${prof.email.split('@')[0]}` : '';
        const avatar = isMe ? activeUser?.avatar : prof?.avatar_url;
        const timeAgo = c.created_at ? new Date(c.created_at).toLocaleDateString() : '';
        const profileSlug = prof?.email ? prof.email.split('@')[0] : '';
        const profileUrl = profileSlug ? `${SITE_URL}/u/${profileSlug}` : '';

        const avatarMarkup = avatar
          ? `<div class="avatar avatar-clickable" data-profile="${escapeHtml(
              profileUrl
            )}" style="width: 20px; height: 20px; border-radius: 50%; background-image: url('${escapeHtml(
              avatar
            )}'); background-size: cover; background-position: center; flex-shrink: 0; cursor: pointer;"></div>`
          : `<div class="avatar avatar-clickable" data-profile="${escapeHtml(
              profileUrl
            )}" style="width: 20px; height: 20px; font-size: 9px; flex-shrink: 0; cursor: pointer;">${escapeHtml(
              initials(name)
            )}</div>`;

        const isCommentAuthor = Boolean(activeUser && c.user_id === activeUser.id);
        const commentReactions = reactionsMap[c.id] || { counts: {}, userReacted: new Set() };

        const emojiBarHtml = `
          <div class="comment-reactions-bar" style="display: flex; align-items: center; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
            ${COMMENT_EMOJIS.map((emoji) => {
              const count = commentReactions.counts[emoji] || 0;
              const isReacted = commentReactions.userReacted.has(emoji);
              const activeStyle = isReacted
                ? 'background: var(--yellow); border-color: var(--yellow); color: #000; font-weight: 700;'
                : 'background: none; border: 1px solid var(--line); color: var(--ink); font-weight: normal;';
              return `
                <button type="button" class="comment-react-btn" data-comment-id="${escapeHtml(
                  c.id
                )}" data-emoji="${emoji}" style="display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 12px; font-size: 10px; cursor: pointer; transition: all 0.15s ease; ${activeStyle}">
                  <span>${emoji}</span>
                  <span class="comment-react-count" style="font-size: 9px; opacity: ${
                    count > 0 ? '1' : '0.6'
                  };">${count}</span>
                </button>
              `;
            }).join('')}
          </div>
        `;

        return `
        <div class="widget-comment-card" data-comment-id="${escapeHtml(c.id)}" style="display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; font-size: 11px; position: relative;">
          ${avatarMarkup}
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
              <strong class="avatar-clickable" data-profile="${escapeHtml(
                profileUrl
              )}" style="color: var(--ink); font-size: 11px; cursor: pointer;">${escapeHtml(
          name
        )} <span style="font-weight: normal; color: var(--muted); font-size: 10px;">${escapeHtml(
          handle
        )}</span></strong>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 9px; color: var(--muted);">${escapeHtml(timeAgo)}</span>
                ${
                  isCommentAuthor
                    ? `<button class="comment-delete-btn" data-comment-id="${escapeHtml(
                        c.id
                      )}" style="background: none; border: none; color: var(--muted); cursor: pointer; font-size: 11px; padding: 0 2px; line-height: 1; transition: color 0.15s ease;" title="Delete comment">&#128465;&#65039;</button>`
                    : ''
                }
              </div>
            </div>
            <div style="color: var(--ink); line-height: 1.4; word-break: break-word; white-space: pre-wrap;">${escapeHtml(
              c.text || c.content || ''
            )}</div>
            ${emojiBarHtml}
          </div>
        </div>
      `;
      })
      .join('');

    // Wire profile clicks
    listEl.querySelectorAll('.avatar-clickable').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = el.getAttribute('data-profile');
        if (url) openExternalUrl(url);
      });
    });

    // Wire comment reactions
    listEl.querySelectorAll('.comment-react-btn').forEach((btnEl) => {
      btnEl.addEventListener('click', async (e) => {
        e.preventDefault();
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
          alert('Please sign in to react to comments!');
          return;
        }

        const commentId = btnEl.getAttribute('data-comment-id');
        const emoji = btnEl.getAttribute('data-emoji');
        if (!commentId || !emoji) return;

        const countEl = btnEl.querySelector('.comment-react-count');
        const curCount = parseInt(countEl?.textContent || '0', 10);
        const isCurrentlyActive = (btnEl as HTMLElement).style.background.includes('var(--yellow)');

        // Optimistic UI toggle
        if (isCurrentlyActive) {
          (btnEl as HTMLElement).style.background = 'none';
          (btnEl as HTMLElement).style.borderColor = 'var(--line)';
          (btnEl as HTMLElement).style.color = 'var(--ink)';
          (btnEl as HTMLElement).style.fontWeight = 'normal';
          const nextCount = Math.max(0, curCount - 1);
          if (countEl) {
            countEl.textContent = String(nextCount);
            (countEl as HTMLElement).style.opacity = nextCount > 0 ? '1' : '0.6';
          }

          try {
            const headers = await supabase.getAuthHeaders();
            await fetch(
              `${SUPABASE_CONFIG.url}/rest/v1/comment_reactions?comment_id=eq.${encodeURIComponent(
                commentId
              )}&user_id=eq.${encodeURIComponent(reactUser.id)}&emoji=eq.${encodeURIComponent(emoji)}`,
              {
                method: 'DELETE',
                headers,
              }
            );
          } catch (_) {}
        } else {
          (btnEl as HTMLElement).style.background = 'var(--yellow)';
          (btnEl as HTMLElement).style.borderColor = 'var(--yellow)';
          (btnEl as HTMLElement).style.color = '#000';
          (btnEl as HTMLElement).style.fontWeight = '700';
          const nextCount = curCount + 1;
          if (countEl) {
            countEl.textContent = String(nextCount);
            (countEl as HTMLElement).style.opacity = '1';
          }

          try {
            const headers = await supabase.getAuthHeaders({ Prefer: 'resolution=merge-duplicates' });
            await fetch(`${SUPABASE_CONFIG.url}/rest/v1/comment_reactions`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                comment_id: commentId,
                user_id: reactUser.id,
                emoji,
              }),
            });
          } catch (_) {}
        }
      });
    });

    // Wire comment deletion
    listEl.querySelectorAll('.comment-delete-btn').forEach((btnEl) => {
      btnEl.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const commentId = btnEl.getAttribute('data-comment-id');
        if (!commentId) return;

        if (!confirm('Are you sure you want to delete this comment?')) return;

        (btnEl as HTMLButtonElement).disabled = true;
        try {
          const headers = await supabase.getAuthHeaders();
          const delRes = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/comments?id=eq.${encodeURIComponent(commentId)}`,
            {
              method: 'DELETE',
              headers,
            }
          );
          if (delRes.ok) {
            loadWidgetComments(annotationId, activeUser);
          } else {
            alert('Failed to delete comment.');
            (btnEl as HTMLButtonElement).disabled = false;
          }
        } catch (err) {
          console.warn('[Annotated Delete Comment] Error:', err);
          (btnEl as HTMLButtonElement).disabled = false;
        }
      });
    });
  } catch (err) {
    console.warn('[Annotated] loadWidgetComments error:', err);
  }
}

export function initCommentForm(
  getCurrentUser: () => CurrentUser | null,
  onResize: (h: number) => void
): void {
  const form = $('#widgetCommentForm');
  const input = $('#widgetCommentInput') as HTMLTextAreaElement | null;
  const statusEl = $('#widgetCommentStatus');
  const submitBtn = $('#widgetCommentSubmitBtn') as HTMLButtonElement | null;
  const micBtn = $('#widgetCommentMicBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let currentUser = getCurrentUser();
      if (!currentUser) {
        try {
          const session = await supabase.restoreSession();
          currentUser = supabase.userFromSession(session);
        } catch (_) {}
      }
      if (!currentUser || !currentDetailAnnotationId || !input) return;

      const content = input.value.trim();
      if (!content) return;

      if (submitBtn) submitBtn.disabled = true;
      if (statusEl) {
        statusEl.textContent = 'Posting…';
        statusEl.style.color = 'var(--muted)';
      }

      try {
        const headers = await supabase.getAuthHeaders({ Prefer: 'return=representation' });
        const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            annotation_id: currentDetailAnnotationId,
            user_id: currentUser.id,
            text: content,
            created_at: new Date().toISOString(),
          }),
        });

        if (res.ok) {
          input.value = '';
          if (statusEl) statusEl.textContent = '';
          loadWidgetComments(currentDetailAnnotationId, currentUser);
        } else {
          const err = await res.json().catch(() => ({}));
          if (statusEl) {
            statusEl.textContent = `Error: ${err.message || 'Failed to post'}`;
            statusEl.style.color = '#ef4444';
          }
        }
      } catch (err: unknown) {
        if (statusEl) {
          statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
          statusEl.style.color = '#ef4444';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Mic dictation for comment form
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (isCommentDictating) {
        isCommentDictating = false;
        micBtn.classList.remove('recording');
        window.parent.postMessage({ type: 'STOP_DICTATION' }, '*');
      } else {
        isCommentDictating = true;
        baseCommentReply = input?.value || '';
        micBtn.classList.add('recording');
        window.parent.postMessage({ type: 'START_DICTATION' }, '*');
      }
    });
  }
}
