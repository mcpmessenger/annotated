"use strict";
(() => {
  // extension-src/background/index.ts
  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (message.type === "openTab" || message.type === "OPEN_TAB") {
        const url = message.url;
        if (url) {
          console.log("[Annotated Background] Opening external tab:", url);
          chrome.tabs.create({ url, active: true }, (tab) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ ok: true, tabId: tab?.id });
            }
          });
        } else {
          sendResponse({ error: "No URL provided" });
        }
        return true;
      }
      if (message.type === "CAPTURE_SCREENSHOT") {
        chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true, dataUrl });
          }
        });
        return true;
      }
      if (message.type === "getTabAudioStreamId") {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) {
          sendResponse({ error: "No target tab found" });
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
          sendResponse({ error: "tabCapture API unavailable" });
        }
        return true;
      }
      if (message.type === "ENSURE_OFFSCREEN") {
        (async () => {
          try {
            if (chrome.runtime.getContexts) {
              const contexts = await chrome.runtime.getContexts({
                contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
              });
              if (contexts && contexts.length > 0) {
                sendResponse({ ok: true });
                return;
              }
            }
            await chrome.offscreen.createDocument({
              url: "offscreen.html",
              reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
              justification: "Playback tab audio to speakers while recording"
            });
            sendResponse({ ok: true });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (errMsg.includes("Only a single offscreen document may be created")) {
              sendResponse({ ok: true });
            } else {
              console.warn("[Annotated Background] Offscreen creation error:", err);
              sendResponse({ error: errMsg });
            }
          }
        })();
        return true;
      }
      if (message.type === "selection") {
        try {
          const p = chrome.runtime.sendMessage(message);
          if (p && typeof p.catch === "function") p.catch(() => {
          });
        } catch (_) {
        }
        sendResponse({ ok: true });
        return true;
      }
      if (message.type === "captureScreenshot") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs?.[0];
          if (!tab || tab.windowId == null) {
            sendResponse({ error: "No active tab" });
            return;
          }
          chrome.tabs.captureVisibleTab(tab.windowId, { format: "png", quality: 90 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ dataUrl });
            }
          });
        });
        return true;
      }
      if (message.type === "captureVideo" || message.type === "stopVideo") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs?.[0];
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, message).catch(() => {
            });
          }
        });
        sendResponse({ ok: true });
        return true;
      }
    }
  );
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab?.id) return;
    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
      if (chrome.sidePanel) chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
      });
      return;
    }
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "openWidget" });
    } catch (_) {
      try {
        if (chrome.scripting) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["fix-webm-duration.js", "content.js"]
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["content.css"]
          });
          setTimeout(() => {
            if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "openWidget" }).catch(() => {
            });
          }, 120);
        }
      } catch (err) {
        console.warn("[Annotated Action] Fallback injection failed:", err);
        if (chrome.sidePanel) {
          chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
          });
        }
      }
    }
  });
  function setupContextMenus() {
    if (!chrome.contextMenus) return;
    chrome.storage.sync.get(["openOnHighlight"], (syncRes) => {
      const isChecked = syncRes?.openOnHighlight !== false;
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: "annotated_open",
          title: "Open Annotated",
          contexts: ["page", "video", "frame", "image"]
        });
        chrome.contextMenus.create({
          id: "annotated_selection",
          title: 'Annotate "%s"',
          contexts: ["selection"]
        });
        chrome.contextMenus.create({
          id: "annotated_toggle_open_on_highlight",
          title: "Auto-open on text selection",
          type: "checkbox",
          checked: isChecked,
          contexts: ["all"]
        });
      });
    });
  }
  chrome.runtime.onInstalled.addListener(() => {
    setupContextMenus();
  });
  setupContextMenus();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if ((areaName === "sync" || areaName === "local") && changes.openOnHighlight) {
      const nextVal = changes.openOnHighlight.newValue !== false;
      try {
        chrome.contextMenus.update("annotated_toggle_open_on_highlight", {
          checked: nextVal
        }, () => {
          if (chrome.runtime.lastError) {
          }
        });
      } catch (_) {
      }
    }
  });
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "annotated_toggle_open_on_highlight") {
      const nextChecked = Boolean(info.checked);
      chrome.storage.sync.set({ openOnHighlight: nextChecked });
      chrome.storage.local.set({ openOnHighlight: nextChecked });
      return;
    }
    if (!tab?.id) return;
    const selectedText = info.selectionText || void 0;
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "openWidget",
        selectedText
      });
    } catch (_) {
      try {
        if (chrome.scripting) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["fix-webm-duration.js", "content.js"]
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["content.css"]
          });
          setTimeout(() => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: "openWidget",
                selectedText
              }).catch(() => {
              });
            }
          }, 120);
        }
      } catch (err) {
        console.warn("[Annotated ContextMenu] Fallback injection error:", err);
      }
    }
  });
})();
