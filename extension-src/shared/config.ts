// ─── Shared Configuration & Constants ───────────────────────────────────────
// Single source of truth for API keys, URLs, and endpoints.
// Eliminates repetitive hardcoded JWTs and endpoints across files.

export const SUPABASE_CONFIG = {
  url: 'https://dajadbvlldrmgzztdksn.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU',
};

export const SITE_URL = 'https://annotated-repo.vercel.app';
export const FACTCHECK_API_URL = `${SITE_URL}/api/ai/factcheck`;
