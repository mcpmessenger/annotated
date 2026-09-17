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

  let widgetIframe = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  let widgetContainer = null;
  let shadowRoot = null;

  function createWidget(x, y) {
    if (!widgetContainer || !document.body.contains(widgetContainer)) {
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'annotated-layer-' + crypto.randomUUID().split('-')[0];
      widgetContainer.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0;';
      shadowRoot = widgetContainer.attachShadow({ mode: 'closed' });
      document.body.appendChild(widgetContainer);
    }

    if (!widgetIframe) {
      widgetIframe = document.createElement('iframe');
      widgetIframe.src = chrome.runtime.getURL('widget.html');
      widgetIframe.allow = 'microphone';
      widgetIframe.style.cssText = `
        position: fixed;
        width: 340px;
        height: 600px;
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        background: transparent;
        display: block;
        color-scheme: light dark;
      `;
      shadowRoot.appendChild(widgetIframe);

      window.addEventListener('message', (e) => {
        if (e.data?.type === 'DRAG_START') {
          isDragging = true;
          const rect = widgetIframe.getBoundingClientRect();
          dragOffset.x = e.data.clientX - rect.left;
          dragOffset.y = e.data.clientY - rect.top;
          widgetIframe.style.pointerEvents = 'none';
        } else if (e.data?.type === 'CLOSE_WIDGET') {
          widgetIframe.style.display = 'none';
        }
      });
    } else if (!shadowRoot.contains(widgetIframe)) {
      shadowRoot.appendChild(widgetIframe);
    }

    widgetIframe.style.display = 'block';
    positionWidget(x, y);
  }

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      widgetIframe.style.left = (e.clientX - dragOffset.x) + 'px';
      widgetIframe.style.top = (e.clientY - dragOffset.y) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        widgetIframe.style.pointerEvents = 'auto';
      }
    });

  function positionWidget(x, y) {
    let left = x + 20;
    let top = y - 30;
    if (left + 340 > window.innerWidth) left = window.innerWidth - 360;
    if (top + 600 > window.innerHeight) top = window.innerHeight - 620;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    widgetIframe.style.left = left + 'px';
    widgetIframe.style.top = top + 'px';
  }

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
    chrome.storage.local.set({ pendingSelection: payload }, () => {
      chrome.runtime.sendMessage({ type: 'selection', ...payload }).catch(() => {});
    });
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      createWidget(rect.right, rect.top);
    }
  };

  document.addEventListener('mouseup', () => setTimeout(recordSelection, 80));
  document.addEventListener('keyup', (e) => { if (e.key === 'Shift') setTimeout(recordSelection, 80); });

  // ─── Message handler ─────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'openWidget') {
      createWidget(window.innerWidth - 380, 20);
      sendResponse({ ok: true });
      return true;
    }
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



