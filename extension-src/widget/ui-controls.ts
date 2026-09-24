// ─── Widget UI Controls & Theming ─────────────────────────────────────────────

import { $, $$ } from '../shared/dom';
import { openExternalUrl } from '../shared/utils';
import { SITE_URL } from '../shared/config';

export function setTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
  chrome.storage.local.set({ theme });
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
}
