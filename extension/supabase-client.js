// ─── Supabase Config ─────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://dajadbvlldrmgzztdksn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';

// ─── Lightweight Supabase REST client ─────────────────────────────────────────
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.token = null;
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
    };
  }

  // ─── Upload media to Supabase Storage ────────────────────────────────────────
  async uploadMedia(dataUrl, fileName) {
    if (!this.token) throw new Error('Not authenticated');

    // Convert base64 dataUrl → Blob
    const [header, base64] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });

    // Sanitise filename and build storage path
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${safeName}`;

    const res = await fetch(
      `${this.url}/storage/v1/object/annotation-media/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': mimeType,
          'x-upsert': 'false',
        },
        body: blob,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed (${res.status})`);
    }

    // Return the public CDN URL
    return `${this.url}/storage/v1/object/public/annotation-media/${path}`;
  }

  // ─── Auth: Google OAuth via Supabase (launchWebAuthFlow) ────────────────────
  async signInWithGoogle() {
    // Pre-flight: verify Google provider is enabled
    try {
      const settingsRes = await fetch(`${this.url}/auth/v1/settings`, {
        headers: { apikey: this.key },
      });
      const settings = await settingsRes.json();
      if (!settings?.external?.google) {
        throw new Error('Google provider not enabled in Supabase — go to Authentication → Providers → Google and save your credentials');
      }
    } catch (err) {
      if (err.message.includes('Google provider')) throw err;
    }

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
              reject('Popup failed. Check:\n1. Supabase → Auth → Providers → Google → Enable + Save\n2. Supabase → Auth → URL Config → add https://*.chromiumapp.org/**');
            } else {
              reject(msg);
            }
            return;
          }
          try {
            const url = new URL(responseUrl);
            const params = new URLSearchParams(url.hash ? url.hash.slice(1) : url.search.slice(1));
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

  // ─── Auth: Twitter / X OAuth via Supabase (launchWebAuthFlow) ───────────────
  async signInWithTwitter() {
    return new Promise((resolve, reject) => {
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl =
        `${this.url}/auth/v1/authorize` +
        `?provider=twitter` +
        `&redirect_to=${encodeURIComponent(redirectUrl)}`;

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            const msg = chrome.runtime.lastError?.message || 'Auth cancelled';
            reject(msg);
            return;
          }
          try {
            const url = new URL(responseUrl);
            const params = new URLSearchParams(url.hash ? url.hash.slice(1) : url.search.slice(1));
            const access_token  = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            const expires_in    = parseInt(params.get('expires_in') || '3600', 10);
            const error         = params.get('error_description') || params.get('error');

            if (error) { reject(error); return; }
            if (!access_token) { reject('No token returned from Twitter auth.'); return; }

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
      const issuedAt = session.expires_at || 0;
      if (Date.now() / 1000 < issuedAt) {
        this.token = session.access_token;
        return session;
      }
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
