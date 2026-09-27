import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dajadbvlldrmgzztdksn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface NoteItem {
  id: string;
  slug?: string;
  author: string;
  avatarUrl?: string;
  hostname: string;
  sourceUrl?: string;
  pageTitle?: string;
  quoteText?: string;
  commentary: string;
  emoji?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  reactions?: Record<string, number>;
  fact_check?: {
    status?: string;
    verdict?: string;
    headline?: string;
    detail?: string;
    explanation?: string;
  };
  createdAt?: string;
}

// Helper to extract video ID and thumbnail
function getThumbnail(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    }
    if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([^&]+)/);
      if (match && match[1]) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
      const shortsMatch = url.match(/\/shorts\/([^?&]+)/);
      if (shortsMatch && shortsMatch[1]) return `https://img.youtube.com/vi/${shortsMatch[1]}/mqdefault.jpg`;
    }
  } catch (_) {}
  return undefined;
}

// Fetch recent video annotations with proper column mapping and profiles
export async function fetchAnnotationsFeed(): Promise<NoteItem[]> {
  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    console.warn('[Annotated Mobile] Error fetching feed:', error?.message);
    return [];
  }

  // Fetch author profiles
  const userIds = Array.from(new Set(data.map((a: any) => a.user_id).filter(Boolean)));
  const profilesMap: Record<string, any> = {};
  if (userIds.length > 0) {
    try {
      const { data: pData } = await supabase.from('profiles').select('*').in('id', userIds);
      if (pData) {
        pData.forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }
    } catch (_) {}
  }

  return data.map((d: any) => {
    const prof = profilesMap[d.user_id] || {};
    const author = prof.full_name || (prof.email ? `@${prof.email.split('@')[0]}` : d.user_display_name || '@annotated');
    const quote = d.quote || d.page_title || '';
    const comment = d.comment || '';
    const hostname = d.hostname || (d.url ? (d.url.includes('youtube.com') || d.url.includes('youtu.be') ? 'youtube.com' : d.url.includes('x.com') ? 'x.com' : 'web') : 'web');

    return {
      id: d.id,
      slug: d.slug,
      author,
      avatarUrl: prof.avatar_url,
      hostname,
      sourceUrl: d.url,
      pageTitle: d.page_title,
      quoteText: quote,
      commentary: comment,
      emoji: d.intent || '💡',
      mediaUrl: d.media_url,
      thumbnailUrl: getThumbnail(d.url),
      reactions: d.reactions || { '🔥': 0, '🤔': 0, '💡': 0, '💯': 0, '👎': 0 },
      fact_check: d.fact_check,
      createdAt: d.created_at,
    };
  });
}

// Fetch single annotation by slug or id (for QR mobile pass)
export async function fetchAnnotationBySlug(slugOrId: string): Promise<NoteItem | null> {
  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    author: data.user_display_name || '@annotated',
    hostname: data.hostname || 'source',
    sourceUrl: data.url,
    pageTitle: data.page_title,
    quoteText: data.quote || data.page_title,
    commentary: data.comment || '',
    emoji: data.intent || '💡',
    mediaUrl: data.media_url,
    thumbnailUrl: getThumbnail(data.url),
    reactions: data.reactions || { '🔥': 0, '🤔': 0, '💡': 0, '💯': 0, '👎': 0 },
    fact_check: data.fact_check,
    createdAt: data.created_at,
  };
}
