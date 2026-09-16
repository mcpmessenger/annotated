// ─── Side Panel ─────────────────────────────────────────────────────────────
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

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
  // Write pendingSelection then open the panel (user gesture guarantees this works)
  chrome.storage.local.set({ pendingSelection: payload }, () => {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  });
});

// ─── Message Relay ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Relay selection updates to the side panel when it's already open
  if (message.type === 'selection') {
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ ok: true });
  }
  return true;
});
