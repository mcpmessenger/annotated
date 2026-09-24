// ─── Notifications Panel Module ──────────────────────────────────────────────

import { $ } from '../shared/dom';
import { supabase } from '../shared/supabase';
import { escapeHtml, openExternalUrl } from '../shared/utils';
import { SITE_URL } from '../shared/config';
import type { CurrentUser, NotificationRow } from '../types/annotation';

let notifPanelOpen = false;

export async function loadNotifications(currentUser: CurrentUser | null): Promise<void> {
  if (!currentUser?.id) return;
  const notifBadge = $('#notifBadge');
  const notifList = $('#notifList');
  if (!notifList) return;

  try {
    const res = await supabase.from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .execute();

    const rows: NotificationRow[] = Array.isArray(res) ? res : [];
    const unread = rows.filter((n) => !n.read).length;

    // Badge
    if (notifBadge) {
      if (unread > 0) {
        notifBadge.textContent = unread > 9 ? '9+' : String(unread);
        notifBadge.style.display = 'inline-flex';
      } else {
        notifBadge.style.display = 'none';
      }
    }

    // Render list
    if (rows.length === 0) {
      notifList.innerHTML =
        '<div style="padding:20px; text-align:center; font-size:12px; color:var(--muted); font-style:italic;">You\'re all caught up!</div>';
    } else {
      notifList.innerHTML = rows
        .map((n) => {
          const dot = !n.read
            ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;flex-shrink:0;margin-top:3px;"></span>'
            : '<span style="display:inline-block;width:7px;height:7px;flex-shrink:0;"></span>';
          const ts = n.created_at ? new Date(n.created_at).toLocaleString() : '';
          const bg = !n.read ? 'background:var(--soft);' : '';
          return `<div style="${bg}display:flex;gap:8px;align-items:flex-start;padding:10px 14px;border-bottom:1px solid var(--line);cursor:pointer;"
                       data-annot="${escapeHtml(n.annotation_id || '')}">
            ${dot}
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;color:var(--ink);line-height:1.4;">${escapeHtml(n.message || '')}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px;">${ts}</div>
            </div>
          </div>`;
        })
        .join('');

      notifList.querySelectorAll('[data-annot]').forEach((el) => {
        el.addEventListener('click', () => {
          const annId = el.getAttribute('data-annot');
          if (annId) openExternalUrl(`${SITE_URL}/annotations/${annId}`);
          closeNotifPanel();
        });
      });
    }
  } catch (e) {
    console.warn('[notif] exception', e);
  }
}

export async function markNotificationsRead(currentUser: CurrentUser | null): Promise<void> {
  if (!currentUser?.id) return;
  try {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('recipient_id', currentUser.id)
      .eq('read', false)
      .execute();

    const badge = $('#notifBadge');
    if (badge) badge.style.display = 'none';

    document.querySelectorAll('#notifList [style*="var(--soft)"]').forEach((el) => {
      (el as HTMLElement).style.background = '';
    });
    document.querySelectorAll('#notifList span[style*="#ef4444"]').forEach((el) => {
      (el as HTMLElement).style.background = 'transparent';
    });
  } catch (_) {}
}

export function openNotifPanel(currentUser: CurrentUser | null): void {
  const panel = $('#notifPanel');
  if (panel) panel.style.display = 'flex';
  notifPanelOpen = true;
  markNotificationsRead(currentUser);
}

export function closeNotifPanel(): void {
  const panel = $('#notifPanel');
  if (panel) panel.style.display = 'none';
  notifPanelOpen = false;
}

export function initNotifications(getCurrentUser: () => CurrentUser | null): void {
  const bell = $('#notifBell');
  bell?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notifPanelOpen) {
      closeNotifPanel();
    } else {
      openNotifPanel(getCurrentUser());
    }
  });

  $('#notifMarkRead')?.addEventListener('click', (e) => {
    e.stopPropagation();
    markNotificationsRead(getCurrentUser());
  });

  document.addEventListener('click', (e) => {
    if (!notifPanelOpen) return;
    const panel = $('#notifPanel');
    if (panel && !panel.contains(e.target as Node) && e.target !== bell && !bell?.contains(e.target as Node)) {
      closeNotifPanel();
    }
  });
}
