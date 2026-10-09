// ─── Background Service Worker ───────────────────────────────────────────────
// Manifest V3 Service Worker managing tabs, context menus, and IPC coordination.

import type { RuntimeMessage } from '../types/messages';

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    // 1. Open URL in a fresh new tab without disturbing active reading surface
    if (message.type === 'openTab' || (message as { type: string }).type === 'OPEN_TAB') {
      const url = (message as { url?: string }).url;
      if (url) {
        console.log('[Annotated Background] Opening external tab:', url);
        chrome.tabs.create({ url, active: true }, (tab) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true, tabId: tab?.id });
          }
        });
      } else {
        sendResponse({ error: 'No URL provided' });
      }
      return true;
    }

    // 1b. Capture visible tab screenshot
    if (message.type === 'CAPTURE_SCREENSHOT') {
      chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true, dataUrl });
        }
      });
      return true;
    }

    // 2. Tab Audio Stream ID generator for MV3
    if (message.type === 'getTabAudioStreamId') {
      const tabId = message.tabId || sender.tab?.id;
      if (!tabId) {
        sendResponse({ error: 'No target tab found' });
        return true;
      }
      if (chrome.tabCapture && chrome.tabCapture.getMediaStreamId) {
        chrome.tabCapture.getMediaStreamId({ targetTabId: tabId, consumerTabId: tabId }, (streamId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ streamId });
          }
        });
      } else {
        sendResponse({ error: 'tabCapture API unavailable' });
      }
      return true;
    }

    // 3. Ensure Offscreen Document
    if (message.type === 'ENSURE_OFFSCREEN') {
      (async () => {
        try {
          if (chrome.runtime.getContexts) {
            const contexts = await chrome.runtime.getContexts({
              contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
            });
            if (contexts && contexts.length > 0) {
              sendResponse({ ok: true });
              return;
            }
          }
          await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
            justification: 'Playback tab audio to speakers while recording',
          });
          sendResponse({ ok: true });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes('Only a single offscreen document may be created')) {
            sendResponse({ ok: true });
          } else {
            console.warn('[Annotated Background] Offscreen creation error:', err);
            sendResponse({ error: errMsg });
          }
        }
      })();
      return true;
    }

    // 4. Relay selection updates
    if (message.type === 'selection') {
      try {
        const p = chrome.runtime.sendMessage(message);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
      sendResponse({ ok: true });
      return true;
    }

    // 5. Screenshot: capture visible tab and return base64 dataUrl
    if (message.type === 'captureScreenshot') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0];
        if (!tab || tab.windowId == null) {
          sendResponse({ error: 'No active tab' });
          return;
        }
        chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png', quality: 90 }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ dataUrl });
          }
        });
      });
      return true;
    }

    // 6. Video capture/stop relay to active tab
    if (message.type === 'captureVideo' || message.type === 'stopVideo') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0];
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
      sendResponse({ ok: true });
      return true;
    }
  }
);

// --- Action Button (Toolbar / Menu Bar Click) ---
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  if (
    tab.url?.startsWith('chrome://') ||
    tab.url?.startsWith('edge://') ||
    tab.url?.startsWith('about:')
  ) {
    if (chrome.sidePanel) chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'openWidget' });
  } catch (_) {
    // If receiving end is missing or disconnected (e.g. extension was refreshed), inject content script dynamically
    try {
      if (chrome.scripting) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['fix-webm-duration.js', 'content.js'],
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css'],
        });
        setTimeout(() => {
          if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'openWidget' }).catch(() => {});
        }, 120);
      }
    } catch (err) {
      console.warn('[Annotated Action] Fallback injection failed:', err);
      if (chrome.sidePanel) {
        chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      }
    }
  }
});

// --- Context Menus (Right-Click) ---
function setupContextMenus(): void {
  if (!chrome.contextMenus) return;
  chrome.storage.sync.get(['openOnHighlight'], (syncRes) => {
    const isChecked = syncRes?.openOnHighlight !== false; // default true
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'annotated_open',
        title: 'Open Annotated',
        contexts: ['page', 'video', 'frame', 'image'],
      });
      chrome.contextMenus.create({
        id: 'annotated_selection',
        title: 'Annotate "%s"',
        contexts: ['selection'],
      });
      chrome.contextMenus.create({
        id: 'annotated_toggle_open_on_highlight',
        title: 'Auto-open on text selection',
        type: 'checkbox',
        checked: isChecked,
        contexts: ['all'],
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

// Setup on worker startup
setupContextMenus();

// Listen for storage changes to sync context menu checkbox state
chrome.storage.onChanged.addListener((changes, areaName) => {
  if ((areaName === 'sync' || areaName === 'local') && changes.openOnHighlight) {
    const nextVal = changes.openOnHighlight.newValue !== false;
    try {
      chrome.contextMenus.update('annotated_toggle_open_on_highlight', {
        checked: nextVal,
      }, () => {
        if (chrome.runtime.lastError) {
          // Ignore if menu item not present yet
        }
      });
    } catch (_) {}
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Handle Toggle Checkbox
  if (info.menuItemId === 'annotated_toggle_open_on_highlight') {
    const nextChecked = Boolean(info.checked);
    chrome.storage.sync.set({ openOnHighlight: nextChecked });
    chrome.storage.local.set({ openOnHighlight: nextChecked });
    return;
  }

  if (!tab?.id) return;
  const selectedText = info.selectionText || undefined;
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'openWidget',
      selectedText,
    });
  } catch (_) {
    try {
      if (chrome.scripting) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['fix-webm-duration.js', 'content.js'],
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css'],
        });
        setTimeout(() => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'openWidget',
              selectedText,
            }).catch(() => {});
          }
        }, 120);
      }
    } catch (err) {
      console.warn('[Annotated ContextMenu] Fallback injection error:', err);
    }
  }
});

