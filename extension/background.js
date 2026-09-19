
// Tab Audio Stream ID generator for MV3
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
});

// Enable side panel on action click
if (chrome.sidePanel) {
  // Keep sidePanel in manifest for contest compliance, but use floating overlay as default
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
}

// ─── Side Panel ─────────────────────────────────────────────────────────────
// sidePanel removed

// ─── Context Menu ─────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'annotate-selection',
    title: 'Annotate with Annotated',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'annotate-selection' || !tab?.id) return;
  const payload = {
    quote: info.selectionText.replace(/\s+/g, ' ').trim(),
    url: tab.url,
    title: tab.title,
    hostname: (() => { try { return new URL(tab.url).hostname; } catch (_) { return tab.url; } })(),
    timestamp: Date.now(),
  };
  chrome.storage.local.set({ pendingSelection: payload }, () => {
    // sidePanel removed
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Open URL in a fresh new tab without disturbing active reading surface
  if (message.type === 'openTab' || message.type === 'OPEN_TAB') {
    if (message.url) {
      chrome.tabs.create({ url: message.url, active: true });
      sendResponse({ ok: true });
    }
    return true;
  }

  // Relay selection updates to the side panel when it's already open
  if (message.type === 'selection') {
    chrome.runtime.sendMessage(message).catch(() => {});
    
    sendResponse({ ok: true });
    return true;
  }

  // Screenshot: capture visible tab and return base64 dataUrl
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
    return true; // keep channel open for async response
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


