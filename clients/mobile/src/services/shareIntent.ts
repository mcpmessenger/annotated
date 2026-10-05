import { supabase, NoteItem, screenContent } from './supabase';

export interface ParsedVideoSource {
  platform: 'youtube' | 'x' | 'web';
  rawUrl: string;
  videoId?: string;
  author?: string;
  timestampSeconds?: number;
  formattedTime?: string;
  displayTitle: string;
  quoteText?: string;
}

export function parseSharedContent(rawText: string): ParsedVideoSource | null {
  if (!rawText || !rawText.trim()) return null;

  const trimmed = rawText.trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);

  // CASE 1: Pure Highlighted Text (e.g. selected text from X, article, or captions)
  if (!urlMatch) {
    return {
      platform: 'web',
      rawUrl: '',
      quoteText: trimmed,
      displayTitle: trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed,
      formattedTime: '00:00',
    };
  }

  const targetUrl = urlMatch[0];
  const surroundingQuote = trimmed.replace(targetUrl, '').trim();

  try {
    const urlObj = new URL(targetUrl);
    const host = urlObj.hostname.toLowerCase();

    // CASE 2: YouTube Link
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.pathname.includes('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1];
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }

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
        quoteText: surroundingQuote || undefined,
        displayTitle: `YouTube Video (${videoId ? videoId.slice(0, 8) : 'Clip'})`,
      };
    }

    // CASE 3: X / Twitter Link
    if (host.includes('x.com') || host.includes('twitter.com')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      const author = parts[0] ? `@${parts[0]}` : '@x';
      return {
        platform: 'x',
        rawUrl: targetUrl,
        author,
        quoteText: surroundingQuote || undefined,
        displayTitle: `Post by ${author} on X`,
      };
    }

    // CASE 4: Generic Web Link
    return {
      platform: 'web',
      rawUrl: targetUrl,
      quoteText: surroundingQuote || undefined,
      displayTitle: host.replace('www.', ''),
    };
  } catch (err) {
    return {
      platform: 'web',
      rawUrl: '',
      quoteText: trimmed,
      displayTitle: trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed,
    };
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

  // Pre-screen UGC for Amazon UGC policy compliance
  const textToScreen = [params.commentary, params.quoteText].filter(Boolean).join(' ');
  const verdict = await screenContent(textToScreen);
  if (!verdict.allowed) {
    throw new Error(verdict.reason || 'This content violates Community Guidelines and cannot be published.');
  }
  
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
    url: params.url || 'https://x.com',
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
