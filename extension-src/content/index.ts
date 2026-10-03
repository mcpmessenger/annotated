// ─── Content Script Entry Point ───────────────────────────────────────────────
// Fixes critical bug: YouTube SPA navigation listeners placed inside module scope,
// ensuring load() is always reachable when yt-navigate-finish fires.

import type { Annotation, UserProfile } from '../types/annotation';
import { pageKey, extractYouTubeVideoId } from '../shared/utils';
import { SUPABASE_CONFIG } from '../shared/config';
import { injectHighlightStyles, renderHighlight, highlightMap, clearAllHighlights, factCheckCache, updateHighlightVerdict, setOnVerdictChange } from './highlighter';
import { renderYouTubeProgressBarMarkers, renderYouTubeVideoTag, updateYouTubeVerdict } from './youtube';

// Wire reactive verdict updates to YouTube video tag and timeline markers
setOnVerdictChange((id, v) => {
  updateYouTubeVerdict(id, v);
});
import { recordSelection, buildPageInfo } from './selection';
import { createWidget, openAnnotationInWidget, notifyWidgetOfSelection, setupMessageRouter, ensureWidgetContainer, widgetIframe } from './widget-host';
import { setupHighlightTooltip } from './tooltip';

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

          // Twitter / X cross-domain compatibility (x.com vs twitter.com)
          const isTwitterOrX =
            (annUrl.hostname.includes('x.com') || annUrl.hostname.includes('twitter.com')) &&
            (location.hostname.includes('x.com') || location.hostname.includes('twitter.com'));
          const hostMatch = isTwitterOrX || annUrl.hostname === location.hostname;
          const pathMatch = annUrl.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
          return hostMatch && pathMatch;
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

      // Attach author_profile to annotations
      state.annotations.forEach((ann) => {
        if (ann.user_id && state.profiles[ann.user_id]) {
          ann.author_profile = state.profiles[ann.user_id];
        }
      });

      // Fetch cloud-persisted fact check verdicts before initial render
      await loadFactChecksForAnnotations(state.annotations);

      renderAllPending();
      return;
    }
  } catch (err) {
    console.warn('[Annotated Content] Supabase load error:', err);
  }

  // 2. Fallback to local storage
  chrome.storage.local.get(currentKey, async (data: Record<string, any>) => {
    state.annotations = (data[currentKey] as Annotation[]) || [];
    state.annotations.forEach((ann) => {
      if (ann.user_id && state.profiles[ann.user_id]) {
        ann.author_profile = state.profiles[ann.user_id];
      }
    });
    await loadFactChecksForAnnotations(state.annotations);
    renderAllPending();
  });
}

export async function loadFactChecksForAnnotations(items: Annotation[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) return;
  await Promise.allSettled(
    items.map(async (ann) => {
      const id = ann.id;
      const slug = ann.slug;
      if (!id && !slug) return;
      if ((id && factCheckCache[id]) || (slug && factCheckCache[slug])) return;

      const keysToTry = [id, slug].filter(Boolean) as string[];
      for (const k of keysToTry) {
        try {
          const fcUrl = `${SUPABASE_CONFIG.url}/storage/v1/object/public/annotation-media/fc_${k}.json`;
          const res = await fetch(fcUrl);
          if (res.ok) {
            const data = await res.json();
            if (data?.verdict) {
              const v = String(data.verdict).toUpperCase();
              if (id) {
                factCheckCache[id] = v;
                updateHighlightVerdict(id, v);
              }
              if (slug) {
                factCheckCache[slug] = v;
                updateHighlightVerdict(slug, v);
              }
              if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const p: Record<string, string> = {};
                if (id) p[`fc_${id}`] = v;
                if (slug) p[`fc_${slug}`] = v;
                chrome.storage.local.set(p);
              }
              break;
            }
          }
        } catch (_) {}
      }
    })
  );
  renderAllPending();
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
  setupHighlightTooltip(() => state.annotations, () => state.profiles);
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
        if (ann) {
          if (ann.user_id && state.profiles[ann.user_id]) {
            ann.author_profile = state.profiles[ann.user_id];
          }
          openAnnotationInWidget(ann);
        }
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
