(() => {
  const state = { annotations: [] };
  const getKey = () => `page:${location.origin}${location.pathname}`;

  // ─── Load & render existing highlights ───────────────────────────────────────
    const getExactSourceUrl = () => {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchorNode = selection.anchorNode;
        const element = anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
        const tweetArticle = element?.closest('article[data-testid="tweet"]');
        if (tweetArticle) {
          const statusLink = tweetArticle.querySelector('a[href*="/status/"]');
          if (statusLink) {
            const href = statusLink.getAttribute('href');
            if (href) return href.startsWith('http') ? href : `https://x.com${href}`;
          }
        }
      }
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href) return canonical.href;
    } catch (_) {}
    return location.href;
  };

  
  // Inject custom highlight styles into document
  if (!document.getElementById('annotated-highlight-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'annotated-highlight-style';
    styleEl.textContent = `
      .annotated-highlight {
        background-color: #ffd21a !important;
        color: #000 !important;
        cursor: pointer !important;
        border-radius: 3px;
        padding: 0 2px;
        transition: all 0.2s ease;
      }
      .annotated-highlight:hover {
        background-color: #f0c400 !important;
        box-shadow: 0 0 10px rgba(255, 210, 26, 0.8);
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  const load = () => {
    chrome.storage.local.get(getKey()).then(data => {
      state.annotations = data[getKey()] || [];
      state.annotations.forEach(renderHighlight);
    });

    const cleanUrl = location.origin + location.pathname;
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?url=ilike.${encodeURIComponent('%' + cleanUrl + '%')}`, {
      headers: { 'apikey': anonKey }
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        data.forEach(ann => {
          if (!state.annotations.find(a => a.id === ann.id)) {
            state.annotations.push(ann);
            renderHighlight(ann);
          }
        });
      }
    })
    .catch(() => {});
  };

  const renderHighlight = (annotation) => {
    const quote = annotation.quote || annotation.quote_text;
    if (!quote || !document.body) return false;
    if (document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) return true;

    const targetText = quote.trim();
    const searchPhrases = [targetText];
    if (targetText.length > 25) {
      searchPhrases.push(targetText.slice(0, 25));
    }

    for (const phrase of searchPhrases) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const index = node.nodeValue.indexOf(phrase);
        if (index !== -1 && !node.parentElement?.closest('[data-annotated-highlight]')) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + phrase.length);
          const mark = document.createElement('mark');
          mark.dataset.annotatedHighlight = annotation.id;
          mark.className = 'annotated-highlight';
          mark.title = `${annotation.intent || 'Annotation'} - ${annotation.commentary || annotation.comment || ''}`;
          try { 
            range.surroundContents(mark); 
            return true; 
          } catch (_) {}
        }
      }
    }
    return false;
  };

  setInterval(() => {
    state.annotations.forEach(ann => renderHighlight(ann));
  }, 1000);

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
        height: 370px;
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
          // clientX from the iframe is already relative to the iframe's top-left corner
          dragOffset.x = e.data.clientX;
          dragOffset.y = e.data.clientY;
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
    }, { capture: true });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        widgetIframe.style.pointerEvents = 'auto';
      }
    }, { capture: true });

  function positionWidget(x, y) {
    let left = x + 20;
    let top = y - 30;
    if (left + 340 > window.innerWidth) left = window.innerWidth - 360;
    if (top + 370 > window.innerHeight) top = window.innerHeight - 390;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    widgetIframe.style.left = left + 'px';
    widgetIframe.style.top = top + 'px';
  }

  // Buffer the latest selection to survive aggressive SPA clears (like X.com)
  let lastKnownSelection = null;
  let lastKnownRect = null;
  
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const quote = selection?.toString().replace(/\s+/g, ' ').trim();
    if (quote && quote.length >= 2 && selection.rangeCount > 0) {
      lastKnownSelection = quote;
      lastKnownRect = selection.getRangeAt(0).getBoundingClientRect();
    } else {
      // Clear if they actually deselected (not just X.com being aggressive on mouseup)
      // We rely on mousedown to clear it to be safe
    }
  });

  document.addEventListener('mousedown', (e) => {
    // If they click outside the widget, clear the fallback so it doesn't pop up again
    if (!widgetContainer || !widgetContainer.contains(e.target)) {
      lastKnownSelection = null;
      lastKnownRect = null;
    }
  }, { capture: true });

  const recordSelection = () => {
    const selection = window.getSelection();
    let quote = selection?.toString().replace(/\s+/g, ' ').trim();
    let rect = null;

    if (quote && quote.length >= 2 && selection.rangeCount > 0) {
      rect = selection.getRangeAt(0).getBoundingClientRect();
    } else if (lastKnownSelection) {
      // Fallback for X.com which might clear selection on mouseup
      quote = lastKnownSelection;
      rect = lastKnownRect;
    }

    if (!quote || quote.length < 2 || !rect) return;
    
    const payload = {
      quote,
      url: getExactSourceUrl(),
      title: document.title,
      hostname: location.hostname,
      timestamp: Date.now(),
    };
    chrome.storage.local.set({ pendingSelection: payload }, () => {
      chrome.runtime.sendMessage({ type: 'selection', ...payload }).catch(() => {});
    });
    
    createWidget(rect.right, rect.top);
  };

  document.addEventListener('mouseup', () => setTimeout(recordSelection, 10));
  document.addEventListener('keyup', (e) => { if (e.key === 'Shift') setTimeout(recordSelection, 10); });

  // ─── Message handler ─────────────────────────────────────────────────────────
  
  // 🎬 Multimodal 240p Video Clipper (Max 90s)
  function capture240pVideoClip(durationSeconds = 15, sendResponse) {
    const video = document.querySelector('video');
    if (!video) {
      sendResponse({ error: 'No video element found on this page.' });
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 426;  // 240p width
      canvas.height = 240; // 240p height
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(24); // 24 FPS
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      const chunks = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ dataUrl: reader.result, duration: Math.min(durationSeconds, 90) });
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      const startTime = Date.now();

      const drawFrame = () => {
        if (recorder.state === 'recording') {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if ((Date.now() - startTime) / 1000 >= Math.min(durationSeconds, 90)) {
            recorder.stop();
          } else {
            requestAnimationFrame(drawFrame);
          }
        }
      };
      drawFrame();
    } catch (err) {
      sendResponse({ error: err.message || 'Failed to capture video clip.' });
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'captureVideo') {
      capture240pVideoClip(message.duration || 15, sendResponse);
      return true;
    }
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
        url: getExactSourceUrl(),
        hostname: location.hostname,
        selectedText: window.getSelection()?.toString().replace(/\s+/g, ' ').trim() || '',
      });
    }
  });

  load();
})();



