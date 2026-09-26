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
  hostname?: string;
  sourceUrl?: string;
  quoteText?: string;
  commentary: string;
  emoji?: string;
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

// Fetch recent video annotations
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

  return data.map((d: any) => ({
    id: d.id,
    slug: d.slug,
    author: d.user_display_name || d.username || '@annotated',
    hostname: d.source_domain || 'youtube.com',
    sourceUrl: d.source_url,
    quoteText: d.quote_text || d.title,
    commentary: d.commentary || '',
    emoji: d.intent || '💡',
    reactions: d.reactions || { '🔥': 0, '🤔': 0, '💡': 0, '💯': 0, '👎': 0 },
    fact_check: d.fact_check,
    createdAt: d.created_at,
  }));
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
    author: data.user_display_name || data.username || '@annotated',
    hostname: data.source_domain || 'youtube.com',
    sourceUrl: data.source_url,
    quoteText: data.quote_text || data.title,
    commentary: data.commentary || '',
    emoji: data.intent || '💡',
    reactions: data.reactions || { '🔥': 0, '🤔': 0, '💡': 0, '💯': 0, '👎': 0 },
    fact_check: data.fact_check,
    createdAt: data.created_at,
  };
}
