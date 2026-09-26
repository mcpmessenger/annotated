import { supabase, NoteItem } from './supabase';

export interface ParsedVideoSource {
  platform: 'youtube' | 'x' | 'web';
  rawUrl: string;
  videoId?: string;
  author?: string;
  timestampSeconds?: number;
  formattedTime?: string;
  displayTitle: string;
}

export function parseSharedContent(rawText: string): ParsedVideoSource | null {
  if (!rawText) return null;

  // Extract first URL found in shared text (handles "Check this out: https://...")
  const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
  const targetUrl = urlMatch ? urlMatch[0] : rawText.trim();

  try {
    const urlObj = new URL(targetUrl);
    const host = urlObj.hostname.toLowerCase();

    // 1. YouTube (youtube.com, youtu.be, m.youtube.com)
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.pathname.includes('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1];
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }

      // Check for timestamp (e.g. ?t=45 or ?t=1m15s)
      let timeSec = 0;
      const tParam = urlObj.searchParams.get('t') || '';
      if (tParam) {
        if (tParam.includes('m') || tParam.includes('s')) {
          const m = tParam.match(/(\d+)m/);
          const s = tParam.match(/(\d+)s/);
          timeSec = (m ? parseInt(m[1]) * 60 : 0) + (s ? parseInt(s[1]) : 0);
        } else {
          timeSec = parseInt(tParam) || 0;
        }
      }

      const formatted = timeSec > 0 
        ? `${String(Math.floor(timeSec / 60)).padStart(2, '0')}:${String(timeSec % 60).padStart(2, '0')}`
        : '00:00';

      return {
        platform: 'youtube',
        rawUrl: targetUrl,
        videoId,
        timestampSeconds: timeSec,
        formattedTime: formatted,
        displayTitle: `YouTube Video (${videoId ? videoId.slice(0, 8) : 'Clip'})`,
      };
    }

    // 2. X / Twitter (x.com, twitter.com)
    if (host.includes('x.com') || host.includes('twitter.com')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      const author = parts[0] ? `@${parts[0]}` : '@x';
      return {
        platform: 'x',
        rawUrl: targetUrl,
        author,
        displayTitle: `Post by ${author} on X`,
      };
    }

    // 3. Generic Web
    return {
      platform: 'web',
      rawUrl: targetUrl,
      displayTitle: host.replace('www.', ''),
    };
  } catch (err) {
    return null;
  }
}

// Create and broadcast an annotation to Supabase
export async function createAnnotation(params: {
  url: string;
  sourceDomain: string;
  quoteText?: string;
  commentary: string;
  emoji?: string;
  authorName?: string;
  factCheckClaim?: string;
  factCheckVerdict?: 'VERIFIED' | 'FALSE' | 'CONTEXT_NEEDED';
}): Promise<NoteItem | null> {
  const slug = `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const author = params.authorName || '@mobile_user';
  
  let fcObj = null;
  if (params.factCheckClaim) {
    fcObj = {
      verdict: params.factCheckVerdict || 'VERIFIED',
      headline: params.factCheckVerdict === 'FALSE' ? 'FACT CHECK: FALSE CLAIM' : params.factCheckVerdict === 'CONTEXT_NEEDED' ? 'FACT CHECK: NEEDS CONTEXT' : 'VERIFIED ACCURATE',
      detail: params.factCheckClaim,
      explanation: params.factCheckClaim,
    };
  }

  const row = {
    slug,
    url: params.url,
    hostname: params.sourceDomain,
    quote: params.quoteText || '',
    comment: params.commentary,
    intent: params.emoji || '💡',
    user_display_name: author,
    page_title: params.quoteText || params.sourceDomain,
    fact_check: fcObj,
    reactions: { '🔥': 0, '🤔': 0, '💡': 1, '💯': 0, '👎': 0 },
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('annotations').insert([row]).select().single();

  if (error || !data) {
    console.warn('[ShareIntent] Error saving note to Supabase:', error?.message);
    // Return optimistic local note
    return {
      id: slug,
      slug,
      author,
      hostname: params.sourceDomain,
      sourceUrl: params.url,
      quoteText: params.quoteText,
      commentary: params.commentary,
      emoji: params.emoji || '💡',
      reactions: { '🔥': 0, '🤔': 0, '💡': 1, '💯': 0, '👎': 0 },
      fact_check: fcObj || undefined,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    slug: data.slug,
    author,
    hostname: data.hostname,
    sourceUrl: data.url,
    quoteText: data.quote,
    commentary: data.comment,
    emoji: data.intent,
    reactions: data.reactions,
    fact_check: data.fact_check,
    createdAt: data.created_at,
  };
}
