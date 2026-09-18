
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

// ─── Message Relay + Screenshot ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'openWidget' }).catch(() => {});
  }
});


