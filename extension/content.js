(() => {
  const state = { annotations: [] };
  const getKey = () => `page:${location.origin}${location.pathname}`;

  // ─── Load & render existing highlights ───────────────────────────────────────
  const load = () =>
    chrome.storage.local.get(getKey()).then(data => {
      state.annotations = data[getKey()] || [];
      state.annotations.forEach(renderHighlight);
    });

  const renderHighlight = (annotation) => {
    if (!annotation.quote || !document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.nodeValue.indexOf(annotation.quote);
      if (index !== -1 && !node.parentElement?.closest('[data-annotated-highlight]')) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + annotation.quote.length);
        const mark = document.createElement('mark');
        mark.dataset.annotatedHighlight = annotation.id;
        mark.className = 'annotated-highlight';
        mark.title = `${annotation.intent || 'Annotation'} · ${annotation.comment || ''}`;
        try { range.surroundContents(mark); } catch (_) {}
        break;
      }
    }
  };

  // ─── Selection → storage (does NOT auto-open panel; context menu does that) ──
  const recordSelection = () => {
    const selection = window.getSelection();
    const quote = selection?.toString().replace(/\s+/g, ' ').trim();
    if (!quote || quote.length < 2) return;
    const payload = {
      quote,
      url: location.href,
      title: document.title,
      hostname: location.hostname,
      timestamp: Date.now(),
    };
    // Write to storage so panel can grab it when already open
    chrome.storage.local.set({ pendingSelection: payload }, () => {
      // If panel is already open, push the update live
      chrome.runtime.sendMessage({ type: 'selection', ...payload }).catch(() => {});
    });
  };

  document.addEventListener('mouseup', () => setTimeout(recordSelection, 80));
  document.addEventListener('keyup', (e) => { if (e.key === 'Shift') setTimeout(recordSelection, 80); });

  // ─── Message handler ─────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'saveAnnotation') {
      const annotation = { ...message.annotation, id: crypto.randomUUID(), url: location.href };
      state.annotations.push(annotation);
      chrome.storage.local.set({ [getKey()]: state.annotations }).then(() => {
        renderHighlight(annotation);
        sendResponse({ ok: true });
      });
      return true;
    }
    if (message.type === 'getPageInfo') {
      sendResponse({
        title: document.title,
        url: location.href,
        hostname: location.hostname,
        selectedText: window.getSelection()?.toString().replace(/\s+/g, ' ').trim() || '',
      });
    }
  });

  load();
})();
