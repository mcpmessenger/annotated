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
      chrome.runtime.sendMessage(message).catch(() => {});
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
  }
);

// --- Action Button ---
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
