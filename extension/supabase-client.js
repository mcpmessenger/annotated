// ─── Supabase Config ─────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://dajadbvlldrmgzztdksn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';

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

  // ─── Auth: Google OAuth via Supabase (launchWebAuthFlow) ────────────────────
  async signInWithGoogle() {
    // ── Step 1: verify Supabase Google provider is configured ─────────────────
    try {
      const settingsRes = await fetch(`${this.url}/auth/v1/settings`, {
        headers: { apikey: this.key },
      });
      const settings = await settingsRes.json();
      const googleEnabled = settings?.external?.google;
      if (!googleEnabled) {
        throw new Error('Google provider not enabled in Supabase — go to Authentication → Providers → Google and save your credentials');
      }
    } catch (err) {
      if (err.message.includes('Google provider')) throw err;
      // network error — proceed anyway
    }

    // ── Step 2: build auth URL and launch popup ───────────────────────────────
    return new Promise((resolve, reject) => {
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl =
        `${this.url}/auth/v1/authorize` +
        `?provider=google` +
        `&redirect_to=${encodeURIComponent(redirectUrl)}`;

      console.log('[Annotated] Auth URL:', authUrl);
      console.log('[Annotated] Redirect URL:', redirectUrl);

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            const msg = chrome.runtime.lastError?.message || 'Auth cancelled';
            if (msg.includes('not be loaded') || msg.includes('closed')) {
              reject(
                'Popup failed. Check:\n' +
                '1. Supabase → Auth → Providers → Google → Enable + Save\n' +
                '2. Supabase → Auth → URL Config → add https://*.chromiumapp.org/**'
              );
            } else {
              reject(msg);
            }
            return;
          }
          try {
            const url = new URL(responseUrl);
            const params = new URLSearchParams(
              url.hash ? url.hash.slice(1) : url.search.slice(1)
            );
            const access_token  = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            const expires_in    = parseInt(params.get('expires_in') || '3600', 10);
            const error         = params.get('error_description') || params.get('error');

            if (error) { reject(error); return; }
            if (!access_token) {
              reject('No token returned. Ensure:\n1. Supabase Google provider saved\n2. https://*.chromiumapp.org/** in Supabase redirect URLs');
              return;
            }

            const session = {
              access_token,
              refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + expires_in,
            };
            this.token = access_token;
            await chrome.storage.local.set({ supabase_session: session });
            resolve(session);
          } catch (err) {
            reject(err.message);
          }
        }
      );
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
