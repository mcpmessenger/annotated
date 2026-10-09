// ─── Widget Main Lifecycle & Message Router ───────────────────────────────────

import { $ } from '../shared/dom';
import { supabase } from '../shared/supabase';
import { pageKey, formatSeconds, safeStorageGet } from '../shared/utils';
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
import { initCommentForm, isCommentDictating, baseCommentReply } from './comments';
import { initNotifications, loadNotifications } from './notifications';
import { initUiControls, setTheme } from './ui-controls';

let currentUser: CurrentUser | null = null;
let isViewingDetail = false;
let activeDetailAnnotation: Annotation | null = null;

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
          isViewingDetail = true;
          activeDetailAnnotation = data.annotation;
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
              () => {
                isViewingDetail = false;
                activeDetailAnnotation = null;
                showComposer(resizeWidget);
              },
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
        const prevUrl = page.url;
        page = {
          title: data.title || page.title,
          url: data.url || page.url,
          hostname: data.hostname || page.hostname,
          video_captions: data.video_captions || page.video_captions,
        };
        const pageHost = $('#pageHost');
        if (pageHost) pageHost.textContent = page.hostname.replace(/^www\./, '');

        // If URL changed (e.g. navigated to a different video in YouTube SPA), clear stale draft
        if (prevUrl && data.url && prevUrl !== data.url) {
          setQuote('');
          const commentEl = $('#comment') as HTMLTextAreaElement | null;
          if (commentEl) commentEl.value = '';
          const preview = $('#videoPreviewEl') as HTMLVideoElement | null;
          if (preview) preview.src = '';
          composerState.videoClipBlob = null;
          composerState.videoStartTs = null;
          composerState.videoEndTs = null;
          $('#videoTrimmerBox')?.classList.add('hidden');
        }

        if (!isViewingDetail && (data.quote || data.selectedText)) {
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
        if (isCommentDictating) {
          const cInput = $('#widgetCommentInput') as HTMLTextAreaElement | null;
          if (cInput) {
            const text = data.text !== undefined ? data.text : `${data.finalTranscript || ''} ${data.interimTranscript || ''}`;
            cInput.value = `${baseCommentReply ? baseCommentReply + ' ' : ''}${text}`.trim();
          }
        } else {
          const commentEl = $('#comment') as HTMLTextAreaElement | null;
          if (commentEl) {
            const text = data.text !== undefined ? data.text : `${data.finalTranscript || ''} ${data.interimTranscript || ''}`;
            commentEl.value = text;
            updatePublishButton();
          }
        }
        break;

      case 'DICTATION_ENDED':
        const dBtn = $('#dictateBtn');
        if (dBtn) dBtn.classList.remove('recording');
        const cMicBtn = $('#widgetCommentMicBtn');
        if (cMicBtn) cMicBtn.classList.remove('recording');
        break;

      case 'DICTATION_ERROR':
        const errBtn = $('#dictateBtn');
        if (errBtn) errBtn.classList.remove('recording');
        const errCMic = $('#widgetCommentMicBtn');
        if (errCMic) errCMic.classList.remove('recording');
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
  safeStorageGet('theme').then((data) => {
    const t = data.theme === 'dark' ? 'dark' : 'light';
    setTheme(t);
  }).catch(() => {});
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
        if (topSignIn) topSignIn.style.display = 'inline-flex';
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
        if (!isViewingDetail) {
          resizeWidget(getComposerHeight());
        }
      });
      if (isViewingDetail && activeDetailAnnotation) {
        showAnnotationDetail(
          activeDetailAnnotation,
          currentUser,
          () => {
            isViewingDetail = false;
            activeDetailAnnotation = null;
            showComposer(resizeWidget);
          },
          resizeWidget,
          () => refreshAll()
        );
      }
      return;
    }
  }

  // Guest / Unauthenticated: keep #mainApp visible with emojis & fact check!
  currentUser = null;
  const topSignIn = $('#topSignInBtn');
  if (topSignIn) topSignIn.style.display = 'inline-flex';
  $('#userMenuWrap')?.classList.add('hidden');
  $('#authScreen')?.classList.add('hidden');
  $('#mainApp')?.classList.remove('hidden');
  if (!isViewingDetail) {
    showComposer(resizeWidget);
  } else if (activeDetailAnnotation) {
    showAnnotationDetail(
      activeDetailAnnotation,
      null,
      () => {
        isViewingDetail = false;
        activeDetailAnnotation = null;
        showComposer(resizeWidget);
      },
      resizeWidget,
      () => refreshAll()
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
