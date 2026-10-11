// ─── Widget UI Controls & Theming ─────────────────────────────────────────────

import { $, $$ } from '../shared/dom';
import { openExternalUrl, safeStorageSet } from '../shared/utils';
import { SITE_URL } from '../shared/config';

export function setTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
  safeStorageSet({ theme });
  const themeBtn = $('#themeBtn');
  if (!themeBtn) return;

  if (theme === 'dark') {
    themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
  } else {
    themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
  }
}

export function initUiControls(): void {
  // Theme toggle
  $('#themeBtn')?.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(cur);
  });

  // Dragging & Close controls
  const dragHandle = $('#dragHandle');
  if (dragHandle) {
    dragHandle.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('#brandLogo') ||
        target.closest('#authBrandLogo') ||
        target.closest('button') ||
        target.closest('.icon-btn') ||
        target.closest('.user-menu-wrap') ||
        target.closest('.avatar')
      ) {
        return;
      }
      window.parent.postMessage(
        {
          type: 'DRAG_START',
          clientX: e.clientX,
          clientY: e.clientY,
        },
        '*'
      );
    });
  }

  $('#closeBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'CLOSE_WIDGET' }, '*');
  });

  // Brand logo links
  const onBrandClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openExternalUrl(SITE_URL);
  };
  $('#brandLogo')?.addEventListener('click', onBrandClick);
  $('#authBrandLogo')?.addEventListener('click', onBrandClick);

  // User menu dropdown (Nordic UI)
  const userMenuWrap = $('#userMenuWrap');
  const avatarEl = $('#avatarEl');
  const userDropdown = $('#userDropdown');
  let userMenuHideTimeout: any = null;

  if (userMenuWrap && userDropdown) {
    userMenuWrap.addEventListener('mouseenter', () => {
      if (userMenuHideTimeout) clearTimeout(userMenuHideTimeout);
      userDropdown.classList.remove('hidden');
    });

    userMenuWrap.addEventListener('mouseleave', () => {
      if (userMenuHideTimeout) clearTimeout(userMenuHideTimeout);
      userMenuHideTimeout = setTimeout(() => {
        userDropdown.classList.add('hidden');
      }, 240);
    });

    avatarEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!userMenuWrap.contains(e.target as Node)) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  // Settings dropdown menu
  const settingsMenuWrap = $('#settingsMenuWrap');
  const settingsBtn = $('#settingsBtn');
  const settingsDropdown = $('#settingsDropdown');
  let settingsHideTimeout: any = null;

  if (settingsMenuWrap && settingsDropdown) {
    settingsMenuWrap.addEventListener('mouseenter', () => {
      if (settingsHideTimeout) clearTimeout(settingsHideTimeout);
      settingsDropdown.classList.remove('hidden');
    });

    settingsMenuWrap.addEventListener('mouseleave', () => {
      if (settingsHideTimeout) clearTimeout(settingsHideTimeout);
      settingsHideTimeout = setTimeout(() => {
        settingsDropdown.classList.add('hidden');
      }, 240);
    });

    settingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!settingsMenuWrap.contains(e.target as Node)) {
        settingsDropdown.classList.add('hidden');
      }
    });
  }

  // Open on Highlight toggle preference management
  const userToggle = $('#userOpenOnHighlightToggle') as HTMLInputElement | null;
  const prefToggle = $('#settingsOpenOnHighlightToggle') as HTMLInputElement | null;
  const userRow = $('#userOpenOnHighlightRow');
  const prefRow = $('#prefOpenOnHighlightRow');

  const updateToggleUI = (enabled: boolean) => {
    if (userToggle) userToggle.checked = enabled;
    if (prefToggle) prefToggle.checked = enabled;
  };

  const setOpenOnHighlightPref = (enabled: boolean) => {
    updateToggleUI(enabled);
    safeStorageSet({ openOnHighlight: enabled });
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      chrome.storage.sync.set({ openOnHighlight: enabled });
    }
  };

  // Initial read
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.get(['openOnHighlight'], (res) => {
      const isEnabled = res?.openOnHighlight !== false;
      updateToggleUI(isEnabled);
    });
  } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['openOnHighlight'], (res) => {
      const isEnabled = res?.openOnHighlight !== false;
      updateToggleUI(isEnabled);
    });
  }

  // Event handlers
  userToggle?.addEventListener('change', (e) => {
    setOpenOnHighlightPref((e.target as HTMLInputElement).checked);
  });
  prefToggle?.addEventListener('change', (e) => {
    setOpenOnHighlightPref((e.target as HTMLInputElement).checked);
  });
  userRow?.addEventListener('click', (e) => {
    if (e.target !== userToggle) {
      const next = !(userToggle ? userToggle.checked : true);
      setOpenOnHighlightPref(next);
    }
  });
  prefRow?.addEventListener('click', (e) => {
    if (e.target !== prefToggle) {
      const next = !(prefToggle ? prefToggle.checked : true);
      setOpenOnHighlightPref(next);
    }
  });

  // ── Email Notifications toggle preference management ───────────────
  const userEmailToggle = $('#userEmailNotifToggle') as HTMLInputElement | null;
  const prefEmailToggle = $('#settingsEmailNotifToggle') as HTMLInputElement | null;
  const userEmailRow = $('#userEmailNotifRow');
  const prefEmailRow = $('#prefEmailNotifRow');

  const updateEmailToggleUI = (enabled: boolean) => {
    if (userEmailToggle) userEmailToggle.checked = enabled;
    if (prefEmailToggle) prefEmailToggle.checked = enabled;
  };

  const setEmailNotifPref = (enabled: boolean) => {
    updateEmailToggleUI(enabled);
    safeStorageSet({ emailNotifications: enabled });
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      chrome.storage.sync.set({ emailNotifications: enabled });
    }
    // Sync with Supabase profiles if token is present
    try {
      const sessionStr = localStorage.getItem('annotated_session') || localStorage.getItem('supabase_session');
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        const uid = sess?.user?.id || sess?.userId;
        if (uid) {
          fetch(`${SITE_URL}/api/notifications/email`, {
            method: 'OPTIONS', // warm up
          }).catch(() => {});
        }
      }
    } catch (_) {}
  };

  // Initial read for email notifications
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.get(['emailNotifications'], (res) => {
      const isEnabled = res?.emailNotifications !== false;
      updateEmailToggleUI(isEnabled);
    });
  } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['emailNotifications'], (res) => {
      const isEnabled = res?.emailNotifications !== false;
      updateEmailToggleUI(isEnabled);
    });
  }

  userEmailToggle?.addEventListener('change', (e) => {
    setEmailNotifPref((e.target as HTMLInputElement).checked);
  });
  prefEmailToggle?.addEventListener('change', (e) => {
    setEmailNotifPref((e.target as HTMLInputElement).checked);
  });
  userEmailRow?.addEventListener('click', (e) => {
    if (e.target !== userEmailToggle) {
      const next = !(userEmailToggle ? userEmailToggle.checked : true);
      setEmailNotifPref(next);
    }
  });
  prefEmailRow?.addEventListener('click', (e) => {
    if (e.target !== prefEmailToggle) {
      const next = !(prefEmailToggle ? prefEmailToggle.checked : true);
      setEmailNotifPref(next);
    }
  });

  // Listen for storage changes from context menu or other tabs
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if ((areaName === 'sync' || areaName === 'local')) {
        if (changes.openOnHighlight) {
          updateToggleUI(changes.openOnHighlight.newValue !== false);
        }
        if (changes.emailNotifications) {
          updateEmailToggleUI(changes.emailNotifications.newValue !== false);
        }
      }
    });
  }
}
