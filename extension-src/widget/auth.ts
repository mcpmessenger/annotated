// ─── Authentication UI & User Profile Module ─────────────────────────────────

import { $ } from '../shared/dom';
import { supabase } from '../shared/supabase';
import { initials, openExternalUrl } from '../shared/utils';
import { SITE_URL } from '../shared/config';
import type { CurrentUser } from '../types/annotation';

export function showAuth(): void {
  $('#authScreen')?.classList.remove('hidden');
  $('#mainApp')?.classList.add('hidden');
}

export function showApp(
  user: CurrentUser,
  onAppShown: (user: CurrentUser) => void
): void {
  $('#authScreen')?.classList.add('hidden');
  $('#mainApp')?.classList.remove('hidden');
  $('#userMenuWrap')?.classList.remove('hidden');

  const profileName = $('#profileName');
  if (profileName) profileName.textContent = user.name;

  const avatarEl = $('#avatarEl');
  if (avatarEl) {
    avatarEl.textContent = initials(user.name);
    avatarEl.removeAttribute('title');
  }

  const dropdownAvatar = $('#dropdownAvatarEl');
  if (dropdownAvatar) dropdownAvatar.textContent = initials(user.name);

  if (user.avatar) {
    if (avatarEl) {
      avatarEl.style.backgroundImage = `url(${user.avatar})`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.textContent = '';
    }
    if (dropdownAvatar) {
      dropdownAvatar.style.backgroundImage = `url(${user.avatar})`;
      dropdownAvatar.style.backgroundSize = 'cover';
      dropdownAvatar.textContent = '';
    }
  }

  onAppShown(user);
}

export async function loadUserProfileStats(currentUser: CurrentUser | null): Promise<void> {
  if (!currentUser) return;
  const name = currentUser.email?.split('@')[0] || 'user';
  const metaEl = $('#profileMeta');
  if (metaEl) metaEl.textContent = `@${name}`;

  try {
    const notesRes = await supabase.from('annotations').select('id').eq('user_id', currentUser.id).execute();
    const count = Array.isArray(notesRes) ? notesRes.length : 0;
    const statNotes = $('#statNotes');
    if (statNotes) statNotes.textContent = String(count);

    const followersRes = await supabase.from('follows').select('follower_id').eq('following_id', currentUser.id).execute();
    const followingRes = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id).execute();
    const fCount = Array.isArray(followersRes) ? followersRes.length : 0;
    const flCount = Array.isArray(followingRes) ? followingRes.length : 0;

    const statFollowers = $('#statFollowers');
    if (statFollowers) statFollowers.textContent = String(fCount);
    const statFollowing = $('#statFollowing');
    if (statFollowing) statFollowing.textContent = String(flCount);
  } catch (_) {}
}

export function initAuthHandlers(
  onUserChanged: (user: CurrentUser | null) => void,
  onResize: (height: number) => void
): void {
  // Twitter / X OAuth
  const signInTwitterBtn = $('#signInTwitterBtn') as HTMLButtonElement | null;
  if (signInTwitterBtn) {
    signInTwitterBtn.addEventListener('click', async () => {
      signInTwitterBtn.disabled = true;
      signInTwitterBtn.textContent = 'Signing in to 𝕏…';
      $('#authError')?.classList.add('hidden');
      try {
        const session = await supabase.signInWithTwitter();
        const user = supabase.userFromSession(session);
        if (user) {
          showApp(user, (u) => onUserChanged(u));
        }
      } catch (err) {
        const authErr = $('#authError');
        if (authErr) {
          authErr.textContent = `Twitter sign-in failed: ${err}`;
          authErr.classList.remove('hidden');
        }
      } finally {
        signInTwitterBtn.disabled = false;
        signInTwitterBtn.innerHTML = `<span style="font-weight: 900; font-size: 15px;">𝕏</span> Sign in with 𝕏`;
      }
    });
  }

  // Google OAuth
  const signInBtn = $('#signInBtn') as HTMLButtonElement | null;
  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      signInBtn.disabled = true;
      signInBtn.textContent = 'Signing in…';
      $('#authError')?.classList.add('hidden');
      try {
        const session = await supabase.signInWithGoogle();
        const user = supabase.userFromSession(session);
        if (user) {
          showApp(user, (u) => onUserChanged(u));
        }
      } catch (err) {
        const authErr = $('#authError');
        if (authErr) {
          authErr.textContent = `Sign-in failed: ${err}`;
          authErr.classList.remove('hidden');
        }
      } finally {
        signInBtn.disabled = false;
        signInBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Sign in with Google`;
      }
    });
  }

  // Sign out
  $('#signOutBtn')?.addEventListener('click', async () => {
    await supabase.signOut();
    onUserChanged(null);
    showAuth();
  });

  // Profile link
  $('#profileBtn')?.addEventListener('click', () => {
    chrome.storage.local.get('supabase_session', (data: Record<string, any>) => {
      const u = supabase.userFromSession(data.supabase_session);
      if (u?.email) {
        const username = u.email.split('@')[0];
        openExternalUrl(`${SITE_URL}/u/${username}`);
      }
    });
  });
}
