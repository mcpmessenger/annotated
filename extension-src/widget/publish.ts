// ─── Annotation Publishing Module ─────────────────────────────────────────────

import { $ } from '../shared/dom';
import { supabase } from '../shared/supabase';
import { SUPABASE_CONFIG, SITE_URL } from '../shared/config';
import { pageKey } from '../shared/utils';
import type { Annotation, CurrentUser, PageContext } from '../types/annotation';

export interface PublishPayload {
  comment: string;
  quote: string;
  intent: string | null;
  mediaDataUrl: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  videoClipBlob: Blob | null;
  videoStartTs: number | null;
  videoEndTs: number | null;
  recordedAudioBlob: Blob | null;
  currentMediaTimestamp: number | null;
  page: PageContext;
  currentUser: CurrentUser;
}

export async function publishAnnotation(
  payload: PublishPayload,
  onProgress: (msg: string, pct: number) => void,
  onSuccess: (savedAnnotation: Annotation) => void,
  onError: (err: string) => void
): Promise<void> {
  let media_url: string | null = null;
  let media_type: string | null = null;

  // 1. Upload attached image/media
  if (payload.mediaDataUrl) {
    try {
      onProgress('Uploading media…', 40);
      media_url = await supabase.uploadMedia(payload.mediaDataUrl, payload.mediaFileName || 'media');
      media_type = payload.mediaType;
      onProgress('Media uploaded', 100);
      await new Promise((r) => setTimeout(r, 200));
    } catch (err: unknown) {
      onError(`Media upload failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
  }

  // 2. Upload video clip if present
  if (payload.videoClipBlob) {
    try {
      const fileName = `video_${Date.now()}.webm`;
      const uploadRes = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/annotation-media/${fileName}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${supabase.token || SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'video/webm',
        },
        body: payload.videoClipBlob,
      });
      if (uploadRes.ok) {
        media_url = `${SUPABASE_CONFIG.url}/storage/v1/object/public/annotation-media/${fileName}`;
        media_type = 'video';
      }
    } catch (err) {
      console.error('[VideoUpload] Error:', err);
    }
  }

  // 3. Upload audio clip if present
  let audio_url: string | null = null;
  if (payload.recordedAudioBlob) {
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const uploadRes = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/annotation-media/${fileName}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${supabase.token || SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'audio/webm',
        },
        body: payload.recordedAudioBlob,
      });
      if (uploadRes.ok) {
        audio_url = `${SUPABASE_CONFIG.url}/storage/v1/object/public/annotation-media/${fileName}`;
      }
    } catch (err) {
      console.error('[AudioUpload] Error:', err);
    }
  }

  const safeQuote =
    (payload.quote && payload.quote.trim()) ||
    (payload.videoClipBlob
      ? `🎬 Video Clip (${payload.page.title || 'Video'})`
      : media_url
      ? `Attachment: ${payload.page.title || 'Media'}`
      : payload.page.title || 'Page Annotation');

  const allowedIntents = ['🔥', '🤔', '💡', '💯', '👎'];
  const safeIntent = payload.intent && allowedIntents.includes(payload.intent) ? payload.intent : '💡';
  let safeComment = payload.comment.trim() || (payload.videoClipBlob ? 'Shared a video clip' : 'Annotation');

  // Inject video timestamps into comment if range exists
  if (payload.videoStartTs != null && payload.videoEndTs != null) {
    const fmt = (ts: number) => {
      const m = Math.floor(ts / 60);
      const s = Math.floor(ts % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    safeComment += `\n\n[⏱️ ${fmt(payload.videoStartTs)} - ${fmt(payload.videoEndTs)}]`;
  }

  let publishUrl = payload.page.url || location.href;
  if (payload.currentMediaTimestamp != null) {
    if (publishUrl.includes('youtube.com') && !publishUrl.includes('&t=') && !publishUrl.includes('?t=')) {
      publishUrl += (publishUrl.includes('?') ? '&' : '?') + `t=${payload.currentMediaTimestamp}s`;
    } else if (!publishUrl.includes('#t=') && !publishUrl.includes('youtube.com')) {
      publishUrl += `#t=${payload.currentMediaTimestamp}`;
    }
  }

  const annotation: Annotation = {
    audio_url: audio_url || undefined,
    media_url: media_url || undefined,
    media_type: media_type || (media_url ? payload.mediaType : null),
    quote: safeQuote,
    comment: safeComment,
    intent: safeIntent,
    page_title: payload.page.title || 'Page',
    url: publishUrl,
    hostname: payload.page.hostname || 'youtube.com',
    user_id: payload.currentUser.id,
    created_at: new Date().toISOString(),
  };

  let savedRow: any = null;
  try {
    const res = await supabase.from('annotations').insert(annotation);
    if (res.code || res.error || res.message) {
      onError(`DB Error: ${res.message || res.error || JSON.stringify(res)}`);
      return;
    }
    if (Array.isArray(res) && res[0]) {
      savedRow = res[0];
    } else if (res && res.id) {
      savedRow = res;
    }
  } catch (err: unknown) {
    onError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const realId = savedRow?.id || crypto.randomUUID();
  const realSlug = savedRow?.slug || realId;
  const localAnnotation: Annotation = { ...annotation, id: realId, slug: realSlug };

  // Save to local storage
  const key = pageKey(publishUrl);
  chrome.storage.local.get(key, (data: Record<string, any>) => {
    const items = [...((data[key] as Annotation[]) || []), localAnnotation];
    chrome.storage.local.set({ [key]: items }, () => {
      onSuccess(localAnnotation);
    });
  });

  // Notify content script
  try {
    chrome.runtime.sendMessage({ type: 'saveAnnotation', annotation: localAnnotation }).catch(() => {});
  } catch (_) {}
  try {
    window.parent.postMessage({ type: 'SAVE_ANNOTATION', annotation: localAnnotation }, '*');
  } catch (_) {}
  try {
    setTimeout(() => {
      window.parent.postMessage({ type: 'RELOAD_ANNOTATIONS' }, '*');
    }, 400);
  } catch (_) {}
}
