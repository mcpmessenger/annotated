// ─── Supabase Config ─────────────────────────────────────────────────────────
// These are filled in by setup.js during first-run, or you can hardcode them here.
const SUPABASE_URL = 'https://dajadbvlldrmgzztdksn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
const GOOGLE_CLIENT_ID = '343335882944-fir4aehjgkvnj0r6tdg0mmcc2sjt99vf.apps.googleusercontent.com';

// ─── Lightweight Supabase REST client (no external bundle needed) ─────────────
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.token = null; // JWT from Google OAuth → Supabase
  }

  headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.token || this.key}`,
      ...extra,
    };
  }

  async from(table) {
    const base = `${this.url}/rest/v1/${table}`;
    return {
      select: (cols = '*') => ({
        eq: (col, val) => ({
          order: (ord, opts = {}) => fetch(
            `${base}?select=${cols}&${col}=eq.${encodeURIComponent(val)}&order=${ord}${opts.ascending === false ? '.desc' : ''}`,
            { headers: this.headers({ 'Prefer': 'return=representation' }) }
          ).then(r => r.json()),
          execute: () => fetch(
            `${base}?select=${cols}&${col}=eq.${encodeURIComponent(val)}`,
            { headers: this.headers() }
          ).then(r => r.json()),
        }),
        execute: () => fetch(`${base}?select=${cols}`, { headers: this.headers() }).then(r => r.json()),
      }),
      insert: (data) => fetch(base, {
        method: 'POST',
        headers: this.headers({ 'Prefer': 'return=representation' }),
        body: JSON.stringify(data),
      }).then(r => r.json()),
      rpc: (fn, params) => fetch(`${this.url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(params),
      }).then(r => r.json()),
    };
  }

  // ─── Auth: Google OAuth via Supabase ────────────────────────────────────────
  async signInWithGoogle() {
    return new Promise((resolve, reject) => {
      // Use chrome.identity for the Google OAuth token
      chrome.identity.getAuthToken({ interactive: true, scopes: ['openid', 'email', 'profile'] }, async (googleToken) => {
        if (chrome.runtime.lastError || !googleToken) {
          reject(chrome.runtime.lastError?.message || 'Auth cancelled');
          return;
        }
        try {
          // Exchange Google token for Supabase session
          const res = await fetch(`${this.url}/auth/v1/token?grant_type=id_token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': this.key,
            },
            body: JSON.stringify({
              provider: 'google',
              id_token: googleToken,
              client_id: GOOGLE_CLIENT_ID,
            }),
          });
          const data = await res.json();
          if (data.access_token) {
            this.token = data.access_token;
            await chrome.storage.local.set({ supabase_session: data });
            resolve(data);
          } else {
            reject(data.error_description || 'Sign-in failed');
          }
        } catch (err) {
          reject(err.message);
        }
      });
    });
  }

  async signOut() {
    if (this.token) {
      await fetch(`${this.url}/auth/v1/logout`, {
        method: 'POST',
        headers: this.headers(),
      }).catch(() => {});
    }
    this.token = null;
    await chrome.storage.local.remove('supabase_session');
  }

  async restoreSession() {
    const data = await chrome.storage.local.get('supabase_session');
    const session = data.supabase_session;
    if (session?.access_token) {
      // Check if token is still valid (expires_in check)
      const issuedAt = session.expires_at || 0;
      if (Date.now() / 1000 < issuedAt) {
        this.token = session.access_token;
        return session;
      }
      // Token expired — try refresh
      if (session.refresh_token) {
        try {
          const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': this.key },
            body: JSON.stringify({ refresh_token: session.refresh_token }),
          });
          const fresh = await res.json();
          if (fresh.access_token) {
            this.token = fresh.access_token;
            await chrome.storage.local.set({ supabase_session: fresh });
            return fresh;
          }
        } catch (_) {}
      }
      await chrome.storage.local.remove('supabase_session');
    }
    return null;
  }

  userFromSession(session) {
    if (!session?.access_token) return null;
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.user_metadata?.full_name || payload.email?.split('@')[0] || 'You',
        avatar: payload.user_metadata?.avatar_url || null,
      };
    } catch (_) { return null; }
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
