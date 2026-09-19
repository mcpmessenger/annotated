
// ─── Unified Extension Message Listener ───────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Open URL in a fresh new tab without disturbing active reading surface
  if (message.type === 'openTab' || message.type === 'OPEN_TAB') {
    if (message.url) {
      console.log('[Annotated Background] Opening external tab:', message.url);
      chrome.tabs.create({ url: message.url, active: true }, (tab) => {
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
            contextTypes: ['OFFSCREEN_DOCUMENT']
          });
          if (contexts && contexts.length > 0) {
            sendResponse({ ok: true });
            return;
          }
        }
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'Playback tab audio to speakers while recording'
        });
        sendResponse({ ok: true });
      } catch (err) {
        if (err.message && err.message.includes('Only a single offscreen document may be created')) {
          sendResponse({ ok: true });
        } else {
          console.warn('[Annotated Background] Offscreen creation error:', err);
          sendResponse({ error: err.message });
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
      if (!tab) { sendResponse({ error: 'No active tab' }); return; }
      chrome.tabs.captureVisibleTab(
        tab.windowId,
        { format: 'png', quality: 90 },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ dataUrl });
          }
        }
      );
    });
    return true;
  }
});



// --- Action Button ---
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
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
          files: ['fix-webm-duration.js', 'content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { type: 'openWidget' }).catch(() => {});
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


