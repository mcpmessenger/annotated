// ─── Typed Supabase Client ──────────────────────────────────────────────────
import { SUPABASE_CONFIG } from './config';
import type { CurrentUser } from '../types/annotation';

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export class SupabaseClient {
  public url: string;
  public key: string;
  public token: string | null = null;

  constructor(url: string = SUPABASE_CONFIG.url, key: string = SUPABASE_CONFIG.anonKey) {
    this.url = url;
    this.key = key;
  }

  public headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.key,
      Authorization: `Bearer ${this.token || this.key}`,
      ...extra,
    };
  }

  public async getAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    if (!this.token) {
      await this.restoreSession();
    }
    return this.headers(extra);
  }

  public from(table: string) {
    const base = `${this.url}/rest/v1/${table}`;
    return {
      select: (cols: string = '*') => ({
        eq: (col: string, val: string | number) => ({
          order: (ord: string, opts: { ascending?: boolean } = {}) =>
            fetch(
              `${base}?select=${cols}&${col}=eq.${encodeURIComponent(val)}&order=${ord}${
                opts.ascending === false ? '.desc' : ''
              }`,
              { headers: this.headers({ Prefer: 'return=representation' }) }
            ).then((r) => r.json()),
          execute: () =>
            fetch(`${base}?select=${cols}&${col}=eq.${encodeURIComponent(val)}`, {
              headers: this.headers(),
            }).then((r) => r.json()),
        }),
        ilike: (col: string, pattern: string) => ({
          execute: () =>
            fetch(`${base}?select=${cols}&${col}=ilike.${encodeURIComponent(pattern)}`, {
              headers: this.headers(),
            }).then((r) => r.json()),
        }),
        order: (ord: string, opts: { ascending?: boolean } = {}) => ({
          limit: (n: number) => ({
            execute: () =>
              fetch(`${base}?select=${cols}&order=${ord}${opts.ascending === false ? '.desc' : ''}&limit=${n}`, {
                headers: this.headers(),
              }).then((r) => r.json()),
          }),
        }),
        execute: () =>
          fetch(`${base}?select=${cols}`, { headers: this.headers() }).then((r) => r.json()),
      }),
      insert: (data: unknown) =>
        fetch(base, {
          method: 'POST',
          headers: this.headers({ Prefer: 'return=representation' }),
          body: JSON.stringify(data),
        }).then((r) => r.json()),
      delete: () => ({
        eq: (col: string, val: string | number) => ({
          execute: () =>
            fetch(`${base}?${col}=eq.${encodeURIComponent(val)}`, {
              method: 'DELETE',
              headers: this.headers(),
            }).then((r) => r.json()),
        }),
      }),
      update: (data: unknown) => ({
        eq: (col: string, val: string | number) => ({
          eq: (col2: string, val2: string | number | boolean) => ({
            execute: () =>
              fetch(`${base}?${col}=eq.${encodeURIComponent(val)}&${col2}=eq.${encodeURIComponent(String(val2))}`, {
                method: 'PATCH',
                headers: this.headers({ Prefer: 'return=representation' }),
                body: JSON.stringify(data),
              }).then((r) => r.json()),
          }),
        }),
      }),
    };
  }

  public async uploadMedia(dataUrl: string, fileName: string): Promise<string> {
    if (!this.token) throw new Error('Not authenticated');

    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${safeName}`;

    const res = await fetch(`${this.url}/storage/v1/object/annotation-media/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
      body: blob,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed (${res.status})`);
    }

    return `${this.url}/storage/v1/object/public/annotation-media/${path}`;
  }

  public async signInWithGoogle(): Promise<SupabaseSession> {
    return new Promise((resolve, reject) => {
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl =
        `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;

      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          const msg = chrome.runtime.lastError?.message || 'Auth cancelled';
          reject(msg);
          return;
        }
        try {
          const url = new URL(responseUrl);
          const params = new URLSearchParams(url.hash ? url.hash.slice(1) : url.search.slice(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token') || undefined;
          const expires_in = parseInt(params.get('expires_in') || '3600', 10);
          const error = params.get('error_description') || params.get('error');

          if (error) {
            reject(error);
            return;
          }
          if (!access_token) {
            reject('No token returned.');
            return;
          }

          const session: SupabaseSession = {
            access_token,
            refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + expires_in,
          };
          this.token = access_token;
          await chrome.storage.local.set({ supabase_session: session });
          resolve(session);
        } catch (err: unknown) {
          reject(err instanceof Error ? err.message : String(err));
        }
      });
    });
  }

  public async signInWithTwitter(): Promise<SupabaseSession> {
    // Stubbed for now until Twitter OAuth credentials are configured
    throw new Error('Twitter sign-in is coming soon.');
  }

  public async signOut(): Promise<void> {
    if (this.token) {
      await fetch(`${this.url}/auth/v1/logout`, {
        method: 'POST',
        headers: this.headers(),
      }).catch(() => {});
    }
    this.token = null;
    await chrome.storage.local.remove('supabase_session');
  }

  public async restoreSession(): Promise<SupabaseSession | null> {
    const data = await chrome.storage.local.get('supabase_session');
    const session = data.supabase_session as SupabaseSession | undefined;
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
            headers: { 'Content-Type': 'application/json', apikey: this.key },
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

  public userFromSession(session?: SupabaseSession | null): CurrentUser | null {
    if (!session?.access_token) return null;
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      const meta = payload.user_metadata || {};
      const twitterHandle = meta.user_name || meta.preferred_username || meta.screen_name;
      const displayName = meta.full_name || meta.name || twitterHandle || payload.email?.split('@')[0] || 'You';
      const email = payload.email || (twitterHandle ? `${twitterHandle}@x.com` : undefined);
      return {
        id: payload.sub,
        email,
        name: displayName,
        avatar: meta.avatar_url || meta.picture || undefined,
      };
    } catch (_) {
      return null;
    }
  }
}

export const supabase = new SupabaseClient();
