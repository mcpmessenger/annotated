// ─── Widget Main Lifecycle & Message Router ───────────────────────────────────

import { $ } from '../shared/dom';
import { supabase } from '../shared/supabase';
import { pageKey, formatSeconds } from '../shared/utils';
import type { CurrentUser, PageContext, Annotation } from '../types/annotation';
import { showAuth, showApp, initAuthHandlers, loadUserProfileStats } from './auth';
import {
  initComposer,
  setQuote,
  setMedia,
  showComposer,
  composerState,
  updatePublishButton,
} from './composer';
import { renderFeed, loadFeedFromSupabase } from './feed';
import { showAnnotationDetail } from './detail';
import { initCommentForm } from './comments';
import { initNotifications, loadNotifications } from './notifications';
import { initUiControls, setTheme } from './ui-controls';

let currentUser: CurrentUser | null = null;
let page: PageContext = {
  title: 'Current page',
  url: '',
  hostname: 'Current page',
};

export function resizeWidget(height: number): void {
  try {
    if (window.parent) {
      window.parent.postMessage({ type: 'RESIZE_WIDGET', height }, '*');
    }
  } catch (_) {}
}

export function refreshAll(): void {
  loadFeedFromSupabase(page, currentUser, () => refreshAll());
  loadUserProfileStats(currentUser);
  loadNotifications(currentUser);
}

// ─── PostMessage Router (Parent Frame Messages) ──────────────────────────────

function setupParentMessageListener(): void {
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'VIEW_ANNOTATION':
        if (data.annotation) {
          (async () => {
            if (!currentUser) {
              const session = await supabase.restoreSession();
              if (session) {
                currentUser = supabase.userFromSession(session);
              }
            }
            showAnnotationDetail(
              data.annotation,
              currentUser,
              () => showComposer(resizeWidget),
              resizeWidget,
              () => refreshAll()
            );
          })();
        }
        break;

      case 'SCREENSHOT_CAPTURED':
        if (data.dataUrl) {
          setMedia(data.dataUrl, 'image', `screenshot_${Date.now()}.png`, resizeWidget);
          const statusEl = $('#status');
          if (statusEl) {
            statusEl.textContent = '📸 Screenshot attached';
            setTimeout(() => {
              if (statusEl.textContent === '📸 Screenshot attached') statusEl.textContent = '';
            }, 3000);
          }
        }
        break;

      case 'PAGE_INFO_RESPONSE':
        page = {
          title: data.title || page.title,
          url: data.url || page.url,
          hostname: data.hostname || page.hostname,
        };
        const pageHost = $('#pageHost');
        if (pageHost) pageHost.textContent = page.hostname.replace(/^www\./, '');
        if (data.quote || data.selectedText) {
          setQuote(data.quote || data.selectedText);
        }
        if (data.media_timestamp != null) {
          composerState.currentMediaTimestamp = data.media_timestamp;
          const badge = $('#composerTimestampBadge');
          const txt = $('#composerTimestampText');
          if (badge && txt) {
            txt.textContent = formatSeconds(data.media_timestamp);
            badge.classList.remove('hidden');
          }
        }
        refreshAll();
        break;

      case 'VIDEO_CAPTURED':
        const clipBtn = $('#clipVideoBtn');
        if (clipBtn) {
          clipBtn.classList.remove('recording');
          clipBtn.innerText = '🎥';
        }
        if (data.dataUrl) {
          fetch(data.dataUrl)
            .then((r) => r.blob())
            .then((blob) => {
              composerState.videoClipBlob = blob;
              if (data.startTs !== undefined) {
                composerState.videoStartTs = data.startTs;
                composerState.videoEndTs = data.endTs;
              }
              const preview = $('#videoPreviewEl') as HTMLVideoElement | null;
              if (preview) {
                preview.src = URL.createObjectURL(blob);
              }
              $('#videoTrimmerBox')?.classList.remove('hidden');
              resizeWidget(630);
              updatePublishButton();
            });
        }
        break;

      case 'DICTATION_RESULT':
        const commentEl = $('#comment') as HTMLTextAreaElement | null;
        if (commentEl) {
          const text = data.text !== undefined ? data.text : `${data.finalTranscript || ''} ${data.interimTranscript || ''}`;
          commentEl.value = text;
          updatePublishButton();
        }
        break;

      case 'DICTATION_ENDED':
        const dBtn = $('#dictateBtn');
        if (dBtn) dBtn.classList.remove('recording');
        break;

      case 'DICTATION_ERROR':
        const errBtn = $('#dictateBtn');
        if (errBtn) errBtn.classList.remove('recording');
        const st = $('#status');
        if (st) {
          st.textContent = data.error || 'Dictation failed';
          setTimeout(() => {
            if (st.textContent === data.error) st.textContent = '';
          }, 4000);
        }
        break;
    }
  });
}

// ─── Boot Sequence ────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  // 1. Initialize UI theme & control buttons
  chrome.storage.local.get('theme', (data: Record<string, any>) => {
    const t = data.theme === 'dark' ? 'dark' : 'light';
    setTheme(t);
  });
  initUiControls();
  setupParentMessageListener();

  // 2. Initialize composer & comment handlers
  initComposer(
    () => currentUser,
    () => page,
    resizeWidget,
    () => refreshAll()
  );

  initCommentForm(
    () => currentUser,
    resizeWidget
  );

  initNotifications(() => currentUser);

  // 3. Initialize auth & session
  initAuthHandlers(
    (u) => {
      currentUser = u;
      if (u) {
        showApp(u, () => {
          refreshAll();
          resizeWidget(390);
        });
      } else {
        showAuth();
      }
    },
    resizeWidget
  );

  // Request page info from host script
  try {
    window.parent.postMessage({ type: 'GET_PAGE_INFO' }, '*');
  } catch (_) {}

  // Restore existing session
  const session = await supabase.restoreSession();
  if (session) {
    const user = supabase.userFromSession(session);
    if (user) {
      currentUser = user;
      showApp(user, () => {
        refreshAll();
        resizeWidget(390);
      });
      return;
    }
  }

  showAuth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
