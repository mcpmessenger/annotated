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
  getComposerHeight,
  updateVideoState,
  handleVideoCaptured,
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
          video_captions: data.video_captions || page.video_captions,
        };
        const pageHost = $('#pageHost');
        if (pageHost) pageHost.textContent = page.hostname.replace(/^www\./, '');
        if (data.quote || data.selectedText) {
          const q = (data.quote || data.selectedText || '').trim();
          if (q) {
            setQuote(q);
            showComposer(resizeWidget);
          }
        }
        composerState.currentMediaTimestamp = data.media_timestamp != null ? data.media_timestamp : null;
        if (data.media_duration != null) {
          updateVideoState(data.media_timestamp || 0, data.media_duration, false);
        }
        refreshAll();
        break;

      case 'VIDEO_STATE_RESPONSE':
        updateVideoState(data.currentTime, data.duration, data.paused);
        break;

      case 'VIDEO_CAPTURED':
        handleVideoCaptured(data, resizeWidget);
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
    () => refreshAll(),
    () => showAuth('Sign in with Google to publish your note.')
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
          resizeWidget(getComposerHeight());
        });
      } else {
        const topSignIn = $('#topSignInBtn');
        if (topSignIn) topSignIn.style.display = 'inline-block';
        $('#userMenuWrap')?.classList.add('hidden');
        showComposer(resizeWidget);
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
        resizeWidget(getComposerHeight());
      });
      return;
    }
  }

  // Guest / Unauthenticated: keep #mainApp visible with emojis & fact check!
  currentUser = null;
  const topSignIn = $('#topSignInBtn');
  if (topSignIn) topSignIn.style.display = 'inline-block';
  $('#userMenuWrap')?.classList.add('hidden');
  $('#authScreen')?.classList.add('hidden');
  $('#mainApp')?.classList.remove('hidden');
  showComposer(resizeWidget);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
