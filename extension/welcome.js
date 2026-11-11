// ─── Welcome Tab Logic ─────────────────────────────────────────────────────────

(function () {
  const authSection = document.getElementById('authSection');
  const signedInSection = document.getElementById('signedInSection');
  const signInBtn = document.getElementById('signInBtn');
  const authError = document.getElementById('authError');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  const signOutBtn = document.getElementById('signOutBtn');

  function getClient() {
    if (typeof supabase !== 'undefined' && supabase) return supabase;
    if (typeof window !== 'undefined' && window.supabase) return window.supabase;
    return null;
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  function parseUserFromSession(session) {
    if (!session) return null;

    // 1. Direct user object on session
    if (session.user) {
      const u = session.user;
      const meta = u.user_metadata || {};
      const twitterHandle = meta.user_name || meta.preferred_username || meta.screen_name;
      const displayName = meta.full_name || meta.name || twitterHandle || u.email?.split('@')[0] || 'User';
      return {
        id: u.id,
        email: u.email || (twitterHandle ? `@${twitterHandle}` : ''),
        name: displayName,
        avatar: meta.avatar_url || meta.picture || null,
      };
    }

    // 2. Decode JWT access token
    if (session.access_token) {
      try {
        const parts = session.access_token.split('.');
        if (parts.length >= 2) {
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4 !== 0) base64 += '=';
          const decoded = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(decoded);
          const meta = payload.user_metadata || {};
          const twitterHandle = meta.user_name || meta.preferred_username || meta.screen_name;
          const displayName = meta.full_name || meta.name || twitterHandle || payload.email?.split('@')[0] || 'User';
          return {
            id: payload.sub,
            email: payload.email || (twitterHandle ? `@${twitterHandle}` : ''),
            name: displayName,
            avatar: meta.avatar_url || meta.picture || null,
          };
        }
      } catch (err) {
        // Fallback to basic client parsing
        try {
          const client = getClient();
          if (client && typeof client.userFromSession === 'function') {
            const u = client.userFromSession(session);
            if (u) return u;
          }
        } catch (_) {}
      }
    }

    return null;
  }

  function renderSignedIn(user) {
    if (!user) return;
    if (authSection) authSection.classList.add('hidden');
    if (signedInSection) signedInSection.classList.remove('hidden');

    if (userName) userName.textContent = user.name || 'User';
    if (userEmail) userEmail.textContent = user.email || '';

    if (userAvatar) {
      if (user.avatar) {
        userAvatar.style.backgroundImage = `url("${user.avatar}")`;
        userAvatar.style.backgroundSize = 'cover';
        userAvatar.textContent = '';
      } else {
        userAvatar.style.backgroundImage = 'none';
        userAvatar.textContent = getInitials(user.name);
      }
    }
  }

  function renderSignedOut() {
    if (signedInSection) signedInSection.classList.add('hidden');
    if (authSection) authSection.classList.remove('hidden');
    if (authError) {
      authError.textContent = '';
      authError.classList.add('hidden');
    }
  }

  async function checkSession() {
    try {
      const client = getClient();
      let session = null;
      if (client && typeof client.restoreSession === 'function') {
        session = await client.restoreSession();
      }
      if (!session && typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get('supabase_session');
        session = stored?.supabase_session;
      }
      const user = parseUserFromSession(session);
      if (user) {
        renderSignedIn(user);
      } else {
        renderSignedOut();
      }
    } catch (err) {
      console.warn('[Welcome] Session check failed:', err);
      renderSignedOut();
    }
  }

  // Google sign in click
  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      signInBtn.disabled = true;
      const originalHtml = signInBtn.innerHTML;
      signInBtn.textContent = 'Signing in…';
      if (authError) {
        authError.textContent = '';
        authError.classList.add('hidden');
      }

      try {
        const client = getClient();
        if (!client || typeof client.signInWithGoogle !== 'function') {
          throw new Error('Supabase client unavailable');
        }
        const session = await client.signInWithGoogle();
        const user = parseUserFromSession(session);
        if (user) {
          renderSignedIn(user);
        } else {
          // Check storage once more
          await checkSession();
        }
      } catch (err) {
        const msg = String(err?.message || err || 'Sign-in failed');
        // If user simply closed the popup, don't show an intrusive error
        if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('closed')) {
          console.log('[Welcome] Sign-in cancelled by user');
        } else {
          if (authError) {
            authError.textContent = msg;
            authError.classList.remove('hidden');
          }
        }
      } finally {
        signInBtn.disabled = false;
        signInBtn.innerHTML = originalHtml;
      }
    });
  }

  // Sign out click
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        const client = getClient();
        if (client && typeof client.signOut === 'function') {
          await client.signOut();
        } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          await chrome.storage.local.remove('supabase_session');
        }
      } catch (err) {
        console.warn('[Welcome] Sign-out error:', err);
      }
      renderSignedOut();
    });
  }

  // Listen for storage changes across tabs/popup
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.supabase_session) {
        const nextSession = changes.supabase_session.newValue;
        const user = parseUserFromSession(nextSession);
        if (user) {
          renderSignedIn(user);
        } else {
          renderSignedOut();
        }
      }
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkSession);
  } else {
    checkSession();
  }
})();
