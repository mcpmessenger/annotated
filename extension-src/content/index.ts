// ─── Content Script Entry Point ───────────────────────────────────────────────
// Fixes critical bug: YouTube SPA navigation listeners placed inside module scope,
// ensuring load() is always reachable when yt-navigate-finish fires.

import type { Annotation, UserProfile } from '../types/annotation';
import { pageKey, extractYouTubeVideoId } from '../shared/utils';
import { SUPABASE_CONFIG } from '../shared/config';
import { injectHighlightStyles, renderHighlight, highlightMap, clearAllHighlights } from './highlighter';
import { renderYouTubeProgressBarMarkers, renderYouTubeVideoTag } from './youtube';
import { recordSelection, buildPageInfo } from './selection';
import { createWidget, openAnnotationInWidget, notifyWidgetOfSelection, setupMessageRouter, ensureWidgetContainer, widgetIframe } from './widget-host';

const state: {
  annotations: Annotation[];
  profiles: Record<string, UserProfile>;
} = {
  annotations: [],
  profiles: {},
};

let domMutationDebounce: any = null;

export async function loadAnnotations(): Promise<void> {
  clearAllHighlights();
  const currentKey = pageKey();
  const vId = extractYouTubeVideoId(location.href);

  // 1. Fetch from Supabase
  try {
    let url = `${SUPABASE_CONFIG.url}/rest/v1/annotations?select=*`;
    if (vId) {
      url += `&url=ilike.*${encodeURIComponent(vId)}*`;
    } else if (location.hostname.includes('youtube.com')) {
      // On YouTube homepage or non-video pages, do not fetch video annotations
      url += `&url=eq.${encodeURIComponent(location.origin + '/')}`;
    } else {
      url += `&url=ilike.*${encodeURIComponent(location.origin + location.pathname)}*`;
    }

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_CONFIG.anonKey,
        Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
      },
    });
    const items = await res.json();
    if (Array.isArray(items)) {
      // Filter out sub-path and cross-video bleeding
      state.annotations = items.filter((ann: Annotation) => {
        if (!ann?.url) return false;
        try {
          const annUrl = new URL(ann.url);
          if (location.hostname.includes('youtube.com')) {
            if (vId) {
              return String(ann.url).includes(vId);
            }
            // On YouTube homepage or browse pages, never show /watch video annotations
            return annUrl.pathname === '/' && location.pathname === '/';
          }

          // On all other websites: host and path must strictly match
          return annUrl.hostname === location.hostname && annUrl.pathname === location.pathname;
        } catch (_) {
          return false;
        }
      });

      // Batch query profiles
      const userIds = Array.from(new Set(items.map((a: Annotation) => a.user_id).filter(Boolean)));
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
          const profList = await profRes.json();
          if (Array.isArray(profList)) {
            profList.forEach((p: UserProfile) => {
              if (p.id) state.profiles[p.id] = p;
            });
          }
        } catch (_) {}
      }

      renderAllPending();
      return;
    }
  } catch (err) {
    console.warn('[Annotated Content] Supabase load error:', err);
  }

  // 2. Fallback to local storage
  chrome.storage.local.get(currentKey, (data: Record<string, any>) => {
    state.annotations = (data[currentKey] as Annotation[]) || [];
    renderAllPending();
  });
}

export function renderAllPending(): void {
  state.annotations.forEach((ann) => renderHighlight(ann));

  renderYouTubeProgressBarMarkers(
    state.annotations,
    (ts) => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v) v.currentTime = ts;
    },
    (ann) => openAnnotationInWidget(ann)
  );

  renderYouTubeVideoTag(
    state.annotations,
    state.profiles,
    (ts) => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v) v.currentTime = ts;
    },
    (ann) => openAnnotationInWidget(ann)
  );
}

// ─── Setup Event Listeners & Observers ────────────────────────────────────────

function init(): void {
  injectHighlightStyles();
  setupMessageRouter(() => loadAnnotations());

  // Text selection tracking
  const handleSelection = () => {
    setTimeout(() => {
      recordSelection((payload) => {
        // If selection exists, ensure widget is created and receives the highlighted quote
        if (payload.quote) {
          notifyWidgetOfSelection(payload);
        }
      });
    }, 25);
  };

  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    handleSelection();
  });

  document.addEventListener('keyup', (e) => {
    if (e.shiftKey || e.key.startsWith('Arrow')) {
      handleSelection();
    }
  });

  // When an annotation highlight is clicked, open the note in the top-right sidebar widget
  document.addEventListener(
    'click',
    (e) => {
      const target = (e.target as Element)?.closest('.annotated-highlight');
      if (target) {
        const ann = highlightMap.get(target);
        if (ann) openAnnotationInWidget(ann);
      }
    },
    true
  );

  // MutationObserver for dynamic SPAs
  const observer = new MutationObserver(() => {
    if (domMutationDebounce) clearTimeout(domMutationDebounce);
    domMutationDebounce = setTimeout(() => {
      renderAllPending();
    }, 150);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Periodic retry intervals on load
  [300, 700, 1500, 3000].forEach((ms) => {
    setTimeout(renderAllPending, ms);
  });

  // Continuously refresh YouTube progress bar markers and badge to survive YouTube DOM redraws
  setInterval(() => {
    if (location.hostname.includes('youtube.com')) {
      renderYouTubeProgressBarMarkers(
        state.annotations,
        (ts) => {
          const v = document.querySelector('video') as HTMLVideoElement | null;
          if (v) v.currentTime = ts;
        },
        (ann) => openAnnotationInWidget(ann)
      );
      renderYouTubeVideoTag(
        state.annotations,
        state.profiles,
        (ts) => {
          const v = document.querySelector('video') as HTMLVideoElement | null;
          if (v) v.currentTime = ts;
        },
        (ann) => openAnnotationInWidget(ann)
      );
    }
  }, 1000);

  // Chrome runtime listener
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_WIDGET') {
      if (!widgetIframe || widgetIframe.style.display === 'none') {
        createWidget();
      } else {
        widgetIframe.style.display = 'none';
      }
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === 'openWidget') {
      const info = buildPageInfo();
      notifyWidgetOfSelection(info);
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === 'getPageInfo') {
      sendResponse(buildPageInfo());
      return true;
    }

    if (message.type === 'saveAnnotation' && message.annotation) {
      state.annotations.push(message.annotation);
      renderAllPending();
      sendResponse({ ok: true });
      return true;
    }
  });

  // YouTube SPA navigation events
  const onYouTubeNavigation = () => {
    setTimeout(() => {
      loadAnnotations();
      const info = buildPageInfo();
      notifyWidgetOfSelection(info);
    }, 400);
  };

  window.addEventListener('yt-navigate-finish', onYouTubeNavigation);
  window.addEventListener('yt-page-data-updated', onYouTubeNavigation);
  window.addEventListener('spfdone', onYouTubeNavigation);
  window.addEventListener('popstate', onYouTubeNavigation);

  // Initial load
  loadAnnotations();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
