(() => {
  const state = { annotations: [], profiles: {} };
  const getKey = () => `page:${location.origin}${location.pathname}`;
  const escapeHtml = (v) => String(v || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  // Buffer the latest selection to survive aggressive SPA clears (like X.com)
  let lastKnownSelection = null;
  let lastKnownRect = null;
  let lastKnownElement = null;

  // ─── Helpers: Timestamp Extraction & Media Sync ──────────────────────────────
  
  const formatSeconds = (sec) => {
    if (sec == null || isNaN(sec)) return '';
    const s = Math.floor(sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  
  const extractTimestampRange = (url, comment) => {
    const urlStr = String(url || '');
    const commentStr = String(comment || '');

    // Range in comment: [01:24 - 01:40] or [⏱️ 01:24 - 01:40]
    const rangeCommentMatch = commentStr.match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\s*-\s*(\d+):(\d+)(?::(\d+))?\]/);
    if (rangeCommentMatch) {
      let s1 = parseInt(rangeCommentMatch[1], 10) * 60 + parseInt(rangeCommentMatch[2], 10);
      if (rangeCommentMatch[3]) s1 = parseInt(rangeCommentMatch[1], 10) * 3600 + parseInt(rangeCommentMatch[2], 10) * 60 + parseInt(rangeCommentMatch[3], 10);

      let s2 = parseInt(rangeCommentMatch[4], 10) * 60 + parseInt(rangeCommentMatch[5], 10);
      if (rangeCommentMatch[6]) s2 = parseInt(rangeCommentMatch[4], 10) * 3600 + parseInt(rangeCommentMatch[5], 10) * 60 + parseInt(rangeCommentMatch[6], 10);

      return { start: s1, end: Math.max(s1 + 5, s2) };
    }

    // Range in URL: t=84s-100s or t=84-100
    const urlRangeMatch = urlStr.match(/[?&#]t=(\d+)(?:s)?-(\d+)(?:s)?/i);
    if (urlRangeMatch) {
      const s1 = parseInt(urlRangeMatch[1], 10);
      const s2 = parseInt(urlRangeMatch[2], 10);
      return { start: s1, end: Math.max(s1 + 5, s2) };
    }

    // Single timestamp fallback with 15s default highlight range
    const startTs = extractTimestamp(url, comment);
    if (startTs != null && startTs >= 0) {
      return { start: startTs, end: startTs + 15 };
    }

    return null;
  };

  const extractTimestamp = (url, comment) => {
    if (!url && !comment) return null;

    // 1. Check URL query/hash parameters for t=...
    const urlStr = String(url || '');
    const tMatch = urlStr.match(/[?&#]t=([0-9hms]+)/i);
    if (tMatch) {
      const val = tMatch[1].toLowerCase();
      if (/[hms]/.test(val)) {
        let h = 0, m = 0, s = 0;
        const hM = val.match(/(\d+)h/);
        const mM = val.match(/(\d+)m/);
        const sM = val.match(/(\d+)s/);
        if (hM) h = parseInt(hM[1], 10);
        if (mM) m = parseInt(mM[1], 10);
        if (sM) s = parseInt(sM[1], 10);
        if (!hM && !mM && !sM && /^\d+s?$/.test(val)) {
          return parseInt(val.replace('s', ''), 10);
        }
        return h * 3600 + m * 60 + s;
      } else if (/^\d+$/.test(val)) {
        return parseInt(val, 10);
      }
    }

    // 2. Comment bracketed timestamp: [⏱️ 01:24], [01:24], or [1:02:24]
    const commentMatch = String(comment || '').match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\]/);
    if (commentMatch) {
      if (commentMatch[3]) {
        return parseInt(commentMatch[1], 10) * 3600 + parseInt(commentMatch[2], 10) * 60 + parseInt(commentMatch[3], 10);
      }
      return parseInt(commentMatch[1], 10) * 60 + parseInt(commentMatch[2], 10);
    }
    return null;
  };

  const seekToTimestamp = (ts) => {
    if (ts == null || isNaN(ts) || ts < 0) return;
    try {
      const ytPlayer = document.querySelector('#movie_player') || document.getElementById('movie_player');
      if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
        ytPlayer.seekTo(ts, true);
        if (typeof ytPlayer.playVideo === 'function') {
          try { ytPlayer.playVideo(); } catch (_) {}
        }
        return;
      }
    } catch (_) {}
    try {
      const mediaEl = document.querySelector('video') || document.querySelector('audio');
      if (mediaEl) {
        mediaEl.currentTime = ts;
        if (typeof mediaEl.play === 'function') {
          try { mediaEl.play(); } catch (_) {}
        }
      }
    } catch (_) {}
  };


  const getMediaTimestamp = (targetEl = null) => {
    try {
      // 1. YouTube video player
      if (location.hostname.includes('youtube.com')) {
        const mediaEl = document.querySelector('video');
        if (mediaEl && !isNaN(mediaEl.currentTime) && mediaEl.currentTime > 0) {
          return Math.floor(mediaEl.currentTime);
        }
      }
      // 2. Element-scoped media (only if user selected text directly inside a video/audio component)
      const el = targetEl || lastKnownElement;
      if (el) {
        const playerContainer = el.closest('div[data-testid="videoPlayer"], div[data-testid="videoComponent"], .html5-video-player, video, audio');
        if (playerContainer) {
          const mediaEl = playerContainer.tagName === 'VIDEO' || playerContainer.tagName === 'AUDIO' ? playerContainer : playerContainer.querySelector('video, audio');
          if (mediaEl && !isNaN(mediaEl.currentTime) && mediaEl.currentTime > 0) {
            return Math.floor(mediaEl.currentTime);
          }
        }
      }
    } catch (_) {}
    return null;
  };

  const getExactSourceUrl = (explicitTimestamp = null, targetEl = null) => {
    try {
      // 1. Twitter/X Tweet permalink
      let element = targetEl || lastKnownElement;
      if (!element) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const anchorNode = selection.anchorNode;
          element = anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
        }
      }

      if (element) {
        const tweetArticle = element.closest('article[data-testid="tweet"]');
        if (tweetArticle) {
          // Twitter always wraps the tweet's own timestamp in an anchor with /status/
          const timeLink = tweetArticle.querySelector('time')?.closest('a[href*="/status/"]');
          if (timeLink) {
            const href = timeLink.getAttribute('href');
            if (href) {
              const cleanHref = href.split('?')[0];
              return cleanHref.startsWith('http') ? cleanHref : `https://x.com${cleanHref}`;
            }
          }
          // Fallback to any /status/ anchor in the tweet article matching a tweet status ID pattern
          const statusLinks = Array.from(tweetArticle.querySelectorAll('a[href*="/status/"]'));
          const mainStatusLink = statusLinks.find(a => /\/[^\/]+\/status\/\d+/.test(a.getAttribute('href') || ''));
          if (mainStatusLink) {
            const href = mainStatusLink.getAttribute('href');
            if (href) {
              const cleanHref = href.split('?')[0];
              return cleanHref.startsWith('http') ? cleanHref : `https://x.com${cleanHref}`;
            }
          }
        }
      }

      // If the current page is already a tweet status permalink, clean query params
      if ((location.hostname.includes('x.com') || location.hostname.includes('twitter.com')) && location.pathname.includes('/status/')) {
        const cleanPath = location.pathname.split('?')[0];
        return `https://x.com${cleanPath}`;
      }

      // 2. YouTube with video ID and timestamp
      if (location.hostname.includes('youtube.com') && location.search.includes('v=')) {
        const vId = new URLSearchParams(location.search).get('v');
        if (vId) {
          const ts = explicitTimestamp != null ? explicitTimestamp : getMediaTimestamp();
          if (ts != null && ts > 0) {
            return `https://www.youtube.com/watch?v=${vId}&t=${ts}s`;
          }
          return `https://www.youtube.com/watch?v=${vId}`;
        }
      }

      // 3. Generic video/audio timestamp
      const ts = explicitTimestamp != null ? explicitTimestamp : getMediaTimestamp();
      if (ts != null && ts > 0) {
        const u = new URL(location.href);
        u.hash = `t=${ts}`;
        return u.href;
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
        color: #000000 !important;
        -webkit-text-fill-color: #000000 !important;
        cursor: pointer !important;
        border-radius: 3px !important;
        padding: 1px 4px !important;
        margin: 0 -1px !important;
        box-shadow: 0 0 0 1px rgba(216, 169, 0, 0.6), 0 2px 8px rgba(255, 210, 26, 0.5) !important;
        display: inline !important;
        -webkit-box-decoration-break: clone !important;
        box-decoration-break: clone !important;
        position: relative !important;
        z-index: 10 !important;
        transition: background-color 0.15s ease, box-shadow 0.15s ease !important;
      }
      .annotated-highlight,
      .annotated-highlight * {
        color: #000000 !important;
        -webkit-text-fill-color: #000000 !important;
      }
      .annotated-highlight:hover {
        background-color: #ffe04d !important;
        box-shadow: 0 0 14px 2px rgba(255, 210, 26, 0.8) !important;
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  // ─── Robust Candidate Phrase Extractor ─────────────────────────────────────
  const extractCandidatePhrases = (rawQuote) => {
    if (!rawQuote) return [];
    const phrases = new Set();
    const raw = rawQuote.trim();
    phrases.add(raw);
    phrases.add(raw.replace(/\s+/g, ' '));

    // Strip feed header metadata (e.g. "Author @handle · 12h ...")
    const cleaned = raw.replace(/^.*?@[A-Za-z0-9_]+\s+[·•]\s+\d+[a-z]\s*(?:\.\s*)?/i, '').replace(/^.*?Replying to @[A-Za-z0-9_]+\s*/i, '').trim();
    if (cleaned && cleaned.length > 5) {
      phrases.add(cleaned);
      phrases.add(cleaned.replace(/\s+/g, ' '));
    }

    const baseTexts = [raw, cleaned].filter(Boolean);
    for (const text of baseTexts) {
      // Split into clauses by sentence / punctuation / newlines
      const clauses = text.split(/[\n\r]+|[.!?]+\s+|[:;]\s+|[•·]\s+|—\s*/);
      for (let clause of clauses) {
        clause = clause.replace(/\s+/g, ' ').trim();
        if (clause.length >= 10) {
          phrases.add(clause);
          if (clause.length > 35) phrases.add(clause.slice(0, 35).trim());
        }
      }

      // Word windows (4-6 words)
      const words = text.replace(/\s+/g, ' ').trim().split(' ');
      if (words.length >= 4) {
        phrases.add(words.slice(0, 6).join(' '));
        if (words.length >= 10) {
          const mid = Math.floor(words.length / 2);
          phrases.add(words.slice(mid, mid + 6).join(' '));
        }
      }
    }

    return Array.from(phrases).filter(p => p && p.length >= 4).sort((a, b) => b.length - a.length);
  };

  // ─── Safe Range Highlighting (Single or Cross-Element) ──────────────────────
  const safeHighlightRange = (range, annotationId) => {
    if (!range) return null;
    const mark = document.createElement('mark');
    mark.className = 'annotated-highlight';
    mark.dataset.annotatedHighlight = annotationId;

    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      try {
        range.surroundContents(mark);
        return mark;
      } catch (_) {}
    }

    try {
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
      return mark;
    } catch (_) {
      try {
        const container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
          mark.textContent = container.textContent;
          container.replaceWith(mark);
          return mark;
        }
      } catch (_) {}
    }
    return null;
  };

  const triggerScroll = (mark, annotation) => {
    if (!mark || annotation._hasScrolled) return;
    annotation._hasScrolled = true;
    setTimeout(() => {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
  };

  const load = () => {
    chrome.storage.local.get(getKey()).then(data => {
      state.annotations = data[getKey()] || [];
      renderAllPendingHighlights();
      
      const localUserIds = [...new Set(state.annotations.map(a => a.user_id).filter(Boolean))];
      const missingUserIds = localUserIds.filter(id => !state.profiles[id]);
      if (missingUserIds.length > 0) {
        fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/profiles?id=in.(${missingUserIds.join(',')})`, {
          headers: { 'apikey': anonKey }
        })
        .then(res => res.json())
        .then(profiles => {
          if (Array.isArray(profiles)) {
            profiles.forEach(p => { state.profiles[p.id] = p; });
          }
        }).catch(() => {});
      }
    });

    let cleanUrl = location.origin + location.pathname;
    if (location.hostname.includes('youtube.com') && location.search.includes('v=')) {
      const vId = new URLSearchParams(location.search).get('v');
      if (vId) cleanUrl = `https://www.youtube.com/watch?v=${vId}`;
    }

    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    let queryUrl = `https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?url=ilike.${encodeURIComponent('%' + cleanUrl + '%')}`;

    // If on Twitter/X status page, query by status ID
    const tweetStatusMatch = location.pathname.match(/\/status\/(\d+)/);
    if ((location.hostname.includes('x.com') || location.hostname.includes('twitter.com')) && tweetStatusMatch) {
      const statusId = tweetStatusMatch[1];
      queryUrl = `https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?url=ilike.${encodeURIComponent('%/status/' + statusId + '%')}`;
    }

    fetch(queryUrl, {
      headers: { 'apikey': anonKey }, cache: 'no-store'
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        console.log('[Annotated] Fetched ' + data.length + ' annotations for page:', queryUrl);
        // Resolve author profiles in batch
        const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))];
        const missingUserIds = userIds.filter(id => !state.profiles[id]);
        if (missingUserIds.length > 0) {
          fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/profiles?id=in.(${missingUserIds.join(',')})`, {
            headers: { 'apikey': anonKey }, cache: 'no-store'
          })
          .then(res => res.json())
          .then(profiles => {
            if (Array.isArray(profiles)) {
              profiles.forEach(p => { state.profiles[p.id] = p; });
            }
          })
          .catch(() => {});
        }

        // Overwrite in-memory annotations with fresh server data to prune deleted ones
        const remoteIds = new Set(data.map(a => String(a.id)));
        
        // Remove stale marks from DOM for any annotations no longer on server
        state.annotations.forEach(a => {
          if (!remoteIds.has(String(a.id))) {
            document.querySelectorAll(`[data-annotated-highlight="${a.id}"]`).forEach(el => {
              const parent = el.parentNode;
              if (parent) {
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
              }
            });
          }
        });

        // Set state to fresh remote annotations and sync local cache
        state.annotations = data;
        chrome.storage.local.set({ [getKey()]: data });
        renderAllPendingHighlights();
      }
    })
    .catch((err) => console.warn('[Annotated] fetch error:', err));
  };

  const renderHighlight = (annotation) => {
    const quote = annotation.quote || annotation.quote_text;
    if (!quote || !document.body) return false;
    if (document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) return true;

    const candidatePhrases = extractCandidatePhrases(quote);
    let hasHighlightedAny = false;

    // 1.5 Dedicated YouTube Title Targeting
    if (location.hostname.includes('youtube.com') && location.pathname.includes('/watch')) {
      const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string, #title h1');
      if (titleEl && titleEl.textContent) {
        const titleText = norm(titleEl.textContent);
        const q = norm(quote);
        // If the quote is the page title, or a significant chunk of the video title, highlight the full title
        if ((q.includes(titleText) && titleText.length > 5) || (titleText.includes(q) && q.length > 15)) {
          if (!titleEl.querySelector('[data-annotated-highlight]') && !highlightMap.has(titleEl)) {
            titleEl.style.backgroundColor = '#ffd21a';
            titleEl.style.color = '#000';
            titleEl.style.borderRadius = '4px';
            titleEl.style.padding = '2px 4px';
            titleEl.dataset.annotatedHighlight = annotation.id;
            highlightMap.set(titleEl, String(annotation.id));
            triggerScroll(titleEl, annotation);
            return true;
          } else if (highlightMap.has(titleEl)) {
            return true; // Already highlighted by another annotation
          }
        }
      }
    }

    // 1. Dedicated X/Twitter Targeting
    if (location.hostname.includes('x.com') || location.hostname.includes('twitter.com')) {
      const isStatusPage = location.pathname.includes('/status/');
      const tweetArticles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of tweetArticles) {
        if (article.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) return true;

        const textContainer = article.querySelector('[data-testid="tweetText"]');
        if (!textContainer) continue;
        
        const tweetText = textContainer.textContent || '';
        const normalizedTweet = tweetText.replace(/[^a-zA-Z0-9]/g, '');
        const normalizedQuote = quote.replace(/[^a-zA-Z0-9]/g, '');

        // If the user selected the entire tweet (or 95% of it), highlight the whole container block nicely
        
        let shouldHighlightContainer = false;
        if (normalizedTweet.length > 10 && normalizedQuote.includes(normalizedTweet)) {
          shouldHighlightContainer = true;
        } else if (normalizedQuote.length > 10 && normalizedTweet.includes(normalizedQuote)) {
          if (normalizedQuote.length / normalizedTweet.length > 0.7) {
            shouldHighlightContainer = true;
          } else {
            // Quote is a small part of the tweet. Add it to candidates to ensure it gets highlighted properly.
            // Find the actual text in tweetText that matches to add as a phrase
            const walker = document.createTreeWalker(textContainer, NodeFilter.SHOW_TEXT);
            let n;
            while ((n = walker.nextNode())) {
              candidatePhrases.add(n.nodeValue.trim());
            }
          }
        }
        
        if (shouldHighlightContainer) {
           textContainer.style.backgroundColor = 'rgba(255, 210, 26, 0.15)';
           textContainer.style.borderRadius = '8px';
           textContainer.style.padding = '8px';
           textContainer.style.outline = '2px solid rgba(255, 210, 26, 0.4)';
           textContainer.dataset.annotatedHighlight = annotation.id;
           triggerScroll(textContainer, annotation);
           return true;
        }

        // Match candidate phrases within tweetText
        for (const phrase of candidatePhrases) {
          if (!phrase || phrase.length < 3) continue;
          
          const walker = document.createTreeWalker(textContainer, NodeFilter.SHOW_TEXT);
          let n;
          let matchedInWalker = false;
          while ((n = walker.nextNode())) {
            const idx = n.nodeValue.indexOf(phrase);
            if (idx !== -1 && !n.parentElement?.closest('[data-annotated-highlight]')) {
              const p = n.parentElement;
              // React-safe highlighting: just style the parent inline wrapper, do not split text nodes!
              p.style.backgroundColor = '#ffd21a'; p.style.color = '#000';
              p.style.borderRadius = '2px';
              p.dataset.annotatedHighlight = annotation.id;
              highlightMap.set(p, String(annotation.id));
              triggerScroll(p, annotation);
              hasHighlightedAny = true;
              matchedInWalker = true;
            }
          }

          // If phrase crosses inline children (mentions/hashtags)
          if (!matchedInWalker) {
            const matchingChild = Array.from(textContainer.childNodes).find(c => {
              const ct = (c.textContent || '').trim();
              return ct.length > 2 && (phrase.includes(ct) || ct.includes(phrase));
            });
            if (matchingChild && !matchingChild.closest?.('[data-annotated-highlight]')) {
              const r = document.createRange();
              r.selectNodeContents(matchingChild);
              const mark = safeHighlightRange(r, annotation.id);
              if (mark) {
                triggerScroll(mark, annotation);
                hasHighlightedAny = true;
              }
            }
          }
        }

        // Guaranteed fallback on status page: if this is the target tweet
        if (isStatusPage && !hasHighlightedAny && !document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) {
          const mainStatusLink = article.querySelector('time')?.closest('a[href*="/status/"]');
          const currentPath = location.pathname;
          if (mainStatusLink?.getAttribute('href')?.includes(currentPath.split('?')[0]) || article === tweetArticles[0]) {
            const firstTextNode = Array.from(textContainer.childNodes).find(c => c.nodeType === Node.TEXT_NODE && c.nodeValue.trim().length > 0) || textContainer.firstChild;
            if (firstTextNode && !textContainer.querySelector('[data-annotated-highlight]')) {
              const r = document.createRange();
              r.selectNodeContents(firstTextNode);
              const mark = safeHighlightRange(r, annotation.id);
              if (mark) {
                triggerScroll(mark, annotation);
                hasHighlightedAny = true;
              }
            }
          }
        }
        
        if (hasHighlightedAny) return true;
      }
    }

    if (hasHighlightedAny) return true;

    // 2. Universal text walker for general webpages
    for (const phrase of candidatePhrases) {
      if (!phrase || phrase.length < 3) continue;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue;
        const index = text.indexOf(phrase);
        if (index !== -1 && !node.parentElement?.closest('[data-annotated-highlight]')) {
          const r = document.createRange();
          r.setStart(node, index);
          r.setEnd(node, index + phrase.length);
          const mark = safeHighlightRange(r, annotation.id);
          if (mark) {
            triggerScroll(mark, annotation);
            hasHighlightedAny = true;
          }
        }
      }
    }

    return hasHighlightedAny;
  };

  
      function renderYouTubeProgressBarMarkers() {
    const isYTWatch = location.hostname.includes('youtube.com') && location.pathname.includes('/watch');
    if (!isYTWatch || !state.annotations || state.annotations.length === 0) {
      const existingContainer = document.getElementById('annotated-yt-markers-layer');
      if (existingContainer) existingContainer.remove();
      return;
    }

    const mediaEl = document.querySelector('video');
    const progressBar = document.querySelector('.ytp-progress-bar') || document.querySelector('.ytp-progress-bar-container');

    if (!mediaEl || !progressBar || !mediaEl.duration || isNaN(mediaEl.duration) || mediaEl.duration <= 0) {
      return;
    }

    const currentVId = new URLSearchParams(location.search).get('v');
    const ytAnns = state.annotations.filter(ann => {
      if (!ann) return false;
      if (currentVId) return String(ann.url || '').includes(currentVId);
      return true;
    });

    if (ytAnns.length === 0) {
      const existingContainer = document.getElementById('annotated-yt-markers-layer');
      if (existingContainer) existingContainer.remove();
      return;
    }

    let markersLayer = document.getElementById('annotated-yt-markers-layer');
    if (!markersLayer) {
      markersLayer = document.createElement('div');
      markersLayer.id = 'annotated-yt-markers-layer';
      markersLayer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999;
      `;
      progressBar.appendChild(markersLayer);
    }

    markersLayer.innerHTML = '';
    const totalDuration = mediaEl.duration;

    ytAnns.forEach((ann) => {
      const range = extractTimestampRange(ann.url, ann.comment || ann.commentary);
      if (!range || range.start < 0 || range.start > totalDuration) return;

      const startPct = (range.start / totalDuration) * 100;
      const endPct = (Math.min(range.end, totalDuration) / totalDuration) * 100;
      const widthPct = Math.max(endPct - startPct, 0.6);

      const intent = ann.intent || '💡';
      const commentText = (ann.comment || ann.commentary || ann.quote || ann.quote_text || 'Annotation').trim();

      const marker = document.createElement('div');
      marker.className = 'annotated-yt-progress-marker-wrap';
      marker.style.cssText = `
        position: absolute;
        left: ${startPct}%;
        width: ${widthPct}%;
        min-width: 14px;
        top: -15px;
        bottom: -15px;
        cursor: pointer;
        pointer-events: auto;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const visual = document.createElement('div');
      visual.className = 'annotated-yt-progress-marker';
      visual.style.cssText = `
        width: 100%;
        height: 6px;
        background: rgba(255, 210, 26, 0.65);
        border: 1px solid #ffd21a;
        border-radius: 3px;
        box-shadow: 0 0 10px rgba(255, 210, 26, 0.8), inset 0 0 4px rgba(255, 210, 26, 0.6);
        transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      `;
      marker.appendChild(visual);

      let markerTooltip = null;

      marker.addEventListener('mouseenter', () => {
        visual.style.transform = 'scaleY(1.8)';
        visual.style.background = 'rgba(255, 255, 255, 0.9)';
        visual.style.boxShadow = '0 0 14px #ffffff, 0 0 8px #ffd21a';

        markerTooltip = document.createElement('div');
        markerTooltip.className = 'annotated-yt-marker-tooltip';
        markerTooltip.style.cssText = `
          position: absolute;
          bottom: 26px;
          left: ${startPct}%;
          transform: translateX(-20%);
          background: #17242c;
          border: 1.5px solid #ffd21a;
          border-radius: 10px;
          padding: 8px 12px;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 8px 24px rgba(0,0,0,0.75);
          z-index: 1001;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        const timeRangeStr = range.end > range.start + 2
          ? `${formatSeconds(range.start)} - ${formatSeconds(range.end)}`
          : formatSeconds(range.start);

        const cleanComment = commentText.replace(/\[(?:⏱️\s*)?[0-9hms:]+\s*-\s*[0-9hms:]+\]/i, '').trim();
        markerTooltip.innerHTML = `
          <span style="background:#ffd21a; color:#000; padding:2px 7px; border-radius:12px; font-weight:800; font-size:11px;">⏱️ ${timeRangeStr}</span>
          ${intent ? `<span style="color:#ffd21a; font-weight:700;">${intent}</span>` : ''}
          ${cleanComment ? `<span style="opacity:0.9; max-width:240px; overflow:hidden; text-overflow:ellipsis;">"${escapeHtml(cleanComment.slice(0, 50))}${cleanComment.length > 50 ? '…' : ''}"</span>` : ''}
        `;
        markersLayer.appendChild(markerTooltip);
      });

      marker.addEventListener('mouseleave', () => {
        visual.style.transform = 'scale(1)';
        visual.style.background = 'rgba(255, 210, 26, 0.65)';
        visual.style.boxShadow = '0 0 10px rgba(255, 210, 26, 0.8), inset 0 0 4px rgba(255, 210, 26, 0.6)';
        if (markerTooltip) {
          markerTooltip.remove();
          markerTooltip = null;
        }
      });

      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        seekToTimestamp(range.start);
        openAnnotationInWidget(ann, marker.getBoundingClientRect());
      });

      markersLayer.appendChild(marker);
    });
  }

    function renderYouTubeVideoTag() {
    const isYTWatch = location.hostname.includes('youtube.com') && location.pathname.includes('/watch');

    // Remove static tag near title if present
    const existingStatic = document.getElementById('annotated-yt-tag');
    if (existingStatic) existingStatic.remove();

    if (!isYTWatch || !state.annotations || state.annotations.length === 0) {
      const existingBadge = document.getElementById('annotated-yt-floating-badge');
      if (existingBadge) existingBadge.remove();
      return;
    }

    const currentVId = new URLSearchParams(location.search).get('v');
    const ytAnns = state.annotations.filter(ann => {
      if (!ann) return false;
      if (currentVId) return String(ann.url || '').includes(currentVId);
      return true;
    });

    if (ytAnns.length === 0) {
      const existingBadge = document.getElementById('annotated-yt-floating-badge');
      if (existingBadge) existingBadge.remove();
      return;
    }

        const count = ytAnns.length;
    const currentIds = ytAnns.map(a => a.id).join(',');

    let badge = document.getElementById('annotated-yt-floating-badge');
    if (badge && badge.getAttribute('data-ann-ids') === currentIds) {
      return; // no need to re-render
    }
    if (badge) badge.remove();

    badge = document.createElement('div');
    badge.id = 'annotated-yt-floating-badge';
    badge.setAttribute('data-ann-ids', currentIds);
    badge.style.cssText = `
      position: fixed;
      bottom: 70px;
      left: 20px;
      z-index: 2147483646;
      background: #17242c;
      border: 1.5px solid #ffd21a;
      border-radius: 30px;
      padding: 8px 16px;
      color: #ffd21a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 210, 26, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    badge.innerHTML = `<span>✏️ Annotated Video</span><span style="background:#ffd21a; color:#000; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:900;">${count}</span>`;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const topAnn = ytAnns[0];
      const tsRange = extractTimestampRange(topAnn.url, topAnn.comment || topAnn.commentary);
      const ts = tsRange ? tsRange.start : extractTimestamp(topAnn.url, topAnn.comment || topAnn.commentary);
      if (ts != null) seekToTimestamp(ts);
      openAnnotationInWidget(topAnn, badge.getBoundingClientRect());
    });

    if (true) {
      const menu = document.createElement('div');
      menu.style.cssText = `
        position: absolute;
        bottom: calc(100% + 10px);
        left: 0;
        background: #17242c;
        border: 1.5px solid #ffd21a;
        border-radius: 12px;
        padding: 8px;
        display: none;
        flex-direction: column;
        gap: 6px;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.65);
        min-width: 250px;
        max-width: 350px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 2147483647;
        cursor: default;
      `;

      ytAnns.forEach(ann => {
        const item = document.createElement('div');
        const tsRange = extractTimestampRange(ann.url, ann.comment || ann.commentary);
        let tsStr = '';
        let startSec = null;
        if (tsRange) {
          startSec = tsRange.start;
          tsStr = tsRange.end > tsRange.start + 2
            ? `${formatSeconds(tsRange.start)} - ${formatSeconds(tsRange.end)}`
            : formatSeconds(tsRange.start);
        } else {
          startSec = extractTimestamp(ann.url, ann.comment || ann.commentary);
          if (startSec != null) tsStr = formatSeconds(startSec);
        }

        const intent = ann.intent || '💡';
        const commentRaw = (ann.comment || ann.commentary || ann.quote || ann.quote_text || 'Annotation').trim();
        const cleanComment = commentRaw.replace(/\[(?:⏱️\s*)?[0-9hms:]+\s*-\s*[0-9hms:]+\]/i, '').trim();

        item.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.15s ease;
          text-align: left;
        `;
        item.addEventListener('mouseenter', () => item.style.background = 'rgba(255, 255, 255, 0.1)');
        item.addEventListener('mouseleave', () => item.style.background = 'rgba(255, 255, 255, 0.05)');

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (startSec != null) seekToTimestamp(startSec);
          openAnnotationInWidget(ann, badge.getBoundingClientRect());
          menu.style.display = 'none';
        });

        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px;">
            ${tsStr ? `<span style="background:#ffd21a; color:#000; padding:2px 6px; border-radius:10px; font-weight:800; font-size:10px;">⏱️ ${tsStr}</span>` : ''}
            <span style="color:#ffd21a; font-size:12px;">${intent}</span>
          </div>
          ${cleanComment ? `<div style="font-size:12px; color:#fff; opacity:0.9; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">"${escapeHtml(cleanComment)}"</div>` : ''}
        `;
        menu.appendChild(item);
      });

      badge.appendChild(menu);

      let hoverTimeout;
      badge.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        badge.style.transform = 'scale(1.06) translateY(-2px)';
        menu.style.display = 'flex';
      });
      badge.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
          badge.style.transform = 'scale(1) translateY(0)';
          menu.style.display = 'none';
        }, 300);
      });
    } else {
      badge.addEventListener('mouseenter', () => { badge.style.transform = 'scale(1.06) translateY(-2px)'; });
      badge.addEventListener('mouseleave', () => { badge.style.transform = 'scale(1) translateY(0)'; });
    }
    
    document.body.appendChild(badge);
  }


  const renderAllPendingHighlights = () => {
    renderYouTubeVideoTag();
    renderYouTubeProgressBarMarkers();
    if (!state.annotations || state.annotations.length === 0) return;
    state.annotations.forEach(ann => {
      renderHighlight(ann);
    });
  };

  // Re-run highlighting as dynamic SPA elements (X.com, YouTube) mount in DOM
  let domMutationDebounce = null;
  const domObserver = new MutationObserver(() => {
    clearTimeout(domMutationDebounce);
    domMutationDebounce = setTimeout(renderAllPendingHighlights, 150);
  });
  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) domObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Periodic retries for initial hydration on heavy SPAs
  [300, 700, 1400, 2500, 4500].forEach(delay => {
    setTimeout(renderAllPendingHighlights, delay);
  });

  // ─── Interactive Floating In-Page Preview Bubble ─────────────────────────────
  let hoverBubble = null;
  let hideBubbleTimeout = null;
  const highlightMap = new WeakMap();
  let currentHoveredAnnotationId = null;

  function ensureBubble() {
    if (!widgetContainer || !document.body.contains(widgetContainer)) {
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'annotated-layer-' + crypto.randomUUID().split('-')[0];
      widgetContainer.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none;';
      shadowRoot = widgetContainer.attachShadow({ mode: 'open' });
      const shadowStyle = document.createElement('style');
      shadowStyle.id = 'annotated-shadow-style';
      shadowStyle.textContent = '*:focus { outline: none !important; } iframe { outline: none !important; }';
      shadowRoot.appendChild(shadowStyle);
      document.body.appendChild(widgetContainer);
    }

    if (!hoverBubble) {
      hoverBubble = document.createElement('div');
      hoverBubble.style.cssText = `
        position: fixed;
        display: none;
        pointer-events: auto;
        z-index: 2147483647;
        background: #1c282f;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        padding: 8px 12px;
        border-radius: 9px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.12);
        max-width: 290px;
        cursor: default;
        transition: opacity 0.15s ease, transform 0.15s ease;
        transform: translateY(4px);
        opacity: 0;
      `;
      hoverBubble.addEventListener('mouseenter', () => {
        if (hideBubbleTimeout) {
          clearTimeout(hideBubbleTimeout);
          hideBubbleTimeout = null;
        }
      });
      hoverBubble.addEventListener('mouseleave', () => {
        scheduleHideBubble();
      });
      hoverBubble.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentHoveredAnnotationId) {
          const ann = state.annotations.find(a => String(a.id) === String(currentHoveredAnnotationId));
          if (ann) {
            const mark = document.querySelector(`[data-annotated-highlight="${ann.id}"]`);
            openAnnotationInWidget(ann, mark?.getBoundingClientRect());
          }
        }
      });
      shadowRoot.appendChild(hoverBubble);
    }
  }

  function scheduleHideBubble() {
    if (hideBubbleTimeout) clearTimeout(hideBubbleTimeout);
    hideBubbleTimeout = setTimeout(() => {
      if (hoverBubble) {
        hoverBubble.style.opacity = '0';
        hoverBubble.style.transform = 'translateY(4px)';
        setTimeout(() => {
          if (hoverBubble && hoverBubble.style.opacity === '0') {
            hoverBubble.style.display = 'none';
          }
        }, 150);
      }
      currentHoveredAnnotationId = null;
    }, 240); // 240ms debounce to allow user to move mouse into bubble
  }

  function showBubble(mark, annotations) {
    if (!Array.isArray(annotations)) annotations = [annotations];
    if (annotations.length === 0) return;

    if (hideBubbleTimeout) {
      clearTimeout(hideBubbleTimeout);
      hideBubbleTimeout = null;
    }
    ensureBubble();
    currentHoveredAnnotationId = annotations[0].id;

    const isSingle = annotations.length === 1;

    const rowsHtml = annotations.map((annotation, idx) => {
      const profile = state.profiles[annotation.user_id] || {};
      const authorName = profile.full_name || (profile.email ? `@${profile.email.split('@')[0]}` : (annotation.user_name || 'Annotator'));
      const comment = annotation.comment || annotation.commentary || 'Annotation note';
      const avatarUrl = profile.avatar_url;
      const initial = (authorName || 'A')[0].toUpperCase();
      const intent = annotation.intent || '';

      const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`
        : `<div style="width: 18px; height: 18px; border-radius: 50%; background: #ffd21a; color: #000; font-size: 9px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0;">${initial}</div>`;

      const divider = idx > 0 ? `<div style="height: 1px; background: rgba(255,255,255,0.08); margin: 6px 0;"></div>` : '';

      return `
        ${divider}
        <div class="ann-row" data-ann-id="${annotation.id}" style="cursor: pointer; border-radius: 6px; padding: 4px 2px; transition: background 0.1s;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
              ${avatarHtml}
              <strong style="font-size: 11px; color: #ffd21a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(authorName)}</strong>
            </div>
            ${intent ? `<span style="font-size: 12px; flex-shrink: 0;">${intent}</span>` : ''}
          </div>
          <div style="font-size: 12px; color: #edf3f5; word-break: break-word; max-height: 54px; overflow: hidden; text-overflow: ellipsis; line-height: 1.35;">${escapeHtml(comment)}</div>
        </div>
      `;
    }).join('');

    const countLabel = isSingle
      ? `<span>Click to view details</span><span style="color: #ffd21a; font-weight: bold;">↗</span>`
      : `<span>${annotations.length} annotations — click any to view</span><span style="color: #ffd21a; font-weight: bold;">↗</span>`;

    hoverBubble.innerHTML = `
      <div style="max-height: 260px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #445 transparent;">
        ${rowsHtml}
      </div>
      <div style="font-size: 10px; color: #9aaab2; margin-top: 5px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px;">
        ${countLabel}
      </div>
    `;

    // Attach per-row click handlers
    hoverBubble.querySelectorAll('.ann-row').forEach(row => {
      row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.06)'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const annId = row.dataset.annId;
        const ann = state.annotations.find(a => String(a.id) === String(annId));
        if (ann) {
          hoverBubble.style.display = 'none';
          const m = document.querySelector(`[data-annotated-highlight="${ann.id}"]`);
          openAnnotationInWidget(ann, m?.getBoundingClientRect());
        }
      });
    });

    const rect = mark.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;

    if (left + 300 > window.innerWidth) left = window.innerWidth - 305;
    if (left < 10) left = 10;
    if (top + 120 > window.innerHeight) {
      top = Math.max(10, rect.top - 120);
    }

    hoverBubble.style.left = `${left}px`;
    hoverBubble.style.top = `${top}px`;
    hoverBubble.style.display = 'block';

    requestAnimationFrame(() => {
      if (hoverBubble) {
        hoverBubble.style.opacity = '1';
        hoverBubble.style.transform = 'translateY(0)';
      }
    });
  }

  function openAnnotationInWidget(annotation, rect) {
    if (!rect) {
      const mark = document.querySelector(`[data-annotated-highlight="${annotation.id}"]`);
      rect = mark ? mark.getBoundingClientRect() : { right: window.innerWidth - 380, top: 20 };
    }

    // Check for media timestamp & auto-seek video/audio player
    const ts = extractTimestamp(annotation.url, annotation.comment || annotation.commentary);
    if (ts != null) {
      const mediaEl = document.querySelector('video, audio');
      if (mediaEl) {
        try {
          mediaEl.currentTime = ts;
          mediaEl.play?.().catch(() => {});
        } catch (_) {}
      }
    }

    createWidget(rect.right, rect.top);

    const profile = state.profiles[annotation.user_id] || null;
    const sendView = () => {
      if (widgetIframe && widgetIframe.contentWindow) {
        widgetIframe.contentWindow.postMessage({
          type: 'VIEW_ANNOTATION',
          annotation: {
            ...annotation,
            extractedTimestamp: ts,
            author_profile: profile
          }
        }, '*');
      }
    };
    sendView();
    setTimeout(sendView, 120);
  }

  // ─── Clickable & Hover Highlight Handlers ─────────────────────────────────────
  document.addEventListener('mouseover', (e) => {
    let mark = e.target.closest('.annotated-highlight');
    let target = e.target;
    while (target && target !== document.body && !mark) {
      if (highlightMap.has(target)) mark = target;
      else target = target.parentElement;
    }
    
    if (mark) {
      const annotationId = mark.dataset.annotatedHighlight || highlightMap.get(mark);
      const hoveredAnnotation = state.annotations.find(a => String(a.id) === String(annotationId));
      if (hoveredAnnotation) {
        // Collect ALL annotations whose quote overlaps with the hovered passage/mark
        const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const getQuote = (a) => norm(a ? (a.quote || a.quote_text) : '');
        const hoveredQuote = getQuote(hoveredAnnotation);
        const markText = norm(mark.textContent);

        const allForQuote = state.annotations.filter(a => {
          if (String(a.id) === String(hoveredAnnotation.id)) return true;
          const q = getQuote(a);
          if (!q) return false;
          // Check substring overlap in either direction
          if (hoveredQuote && (hoveredQuote.includes(q) || q.includes(hoveredQuote))) return true;
          if (markText && (markText.includes(q) || q.includes(markText))) return true;
          return false;
        });

        showBubble(mark, allForQuote.length > 0 ? allForQuote : [hoveredAnnotation]);
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    let mark = e.target.closest('.annotated-highlight');
    let target = e.target;
    while (target && target !== document.body && !mark) {
      if (highlightMap.has(target)) mark = target;
      else target = target.parentElement;
    }
    
    if (mark) {
      scheduleHideBubble();
    }
  });

  document.addEventListener('click', (e) => {
    const mark = e.target.closest('.annotated-highlight');
    if (!mark) return;

    e.preventDefault();
    e.stopPropagation();

    const annotationId = mark.dataset.annotatedHighlight || highlightMap.get(mark);
    const annotation = state.annotations.find(a => String(a.id) === String(annotationId));
    if (annotation) {
      if (hoverBubble) hoverBubble.style.display = 'none';
      openAnnotationInWidget(annotation, mark.getBoundingClientRect());
    }
  }, { capture: true });

  setInterval(() => {
    renderYouTubeVideoTag();
    renderYouTubeProgressBarMarkers();
    if (state.annotations && state.annotations.length > 0) {
      state.annotations.forEach(ann => renderHighlight(ann));
    }
  }, 1000);

  let widgetIframe = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  let widgetContainer = null;
  let shadowRoot = null;

  function createWidget(x, y) {
    if (!document.body) return;
    if (!widgetContainer || !document.body.contains(widgetContainer)) {
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'annotated-layer-' + crypto.randomUUID().split('-')[0];
      widgetContainer.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0; overflow: visible; pointer-events: none; border: none; outline: none; margin: 0; padding: 0; background: transparent;';
      shadowRoot = widgetContainer.attachShadow({ mode: 'open' });
      document.body.appendChild(widgetContainer);
    }

    if (!widgetIframe) {
      widgetIframe = document.createElement('iframe');
      widgetIframe.src = chrome.runtime.getURL('widget.html');
      widgetIframe.allow = 'microphone; display-capture';
      widgetIframe.style.cssText = `
        position: fixed;
        width: 360px;
        height: 390px;
        max-height: 90vh;
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        background: transparent;
        display: block;
        color-scheme: light dark;
        pointer-events: auto !important;
        transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
          stopDictation();
        } else if (e.data?.type === 'RESIZE_WIDGET') {
          if (widgetIframe && e.data.height) {
            widgetIframe.style.height = `${e.data.height}px`;
          }
        } else if (e.data?.type === 'SEEK_MEDIA') {
          const mediaEl = document.querySelector('video, audio');
          if (mediaEl && typeof e.data.seconds === 'number') {
            try {
              mediaEl.currentTime = e.data.seconds;
              mediaEl.play?.().catch(() => {});
            } catch (_) {}
          }
        } else if (e.data?.type === 'START_DICTATION') {
          console.log('[Content Host] Window message received: START_DICTATION');
          startDictation();
        } else if (e.data?.type === 'STOP_DICTATION') {
          console.log('[Content Host] Window message received: STOP_DICTATION');
          stopDictation();
        } else if (e.data?.type === 'CAPTURE_VIDEO') {
          capture240pVideoClip(e.data.duration || 90, e.data.streamId, (res) => {
            try {
              if (widgetIframe && widgetIframe.contentWindow) {
                widgetIframe.contentWindow.postMessage({ type: 'VIDEO_CAPTURED', ...res }, '*');
              }
            } catch (_) {}
          });
        } else if (e.data?.type === 'STOP_VIDEO') {
          stopRecordingNow();
        } else if (e.data?.type === 'GET_PAGE_INFO') {
          const mediaTs = getMediaTimestamp();
          const info = {
            type: 'PAGE_INFO_RESPONSE',
            title: document.title,
            url: getExactSourceUrl(mediaTs, lastKnownElement),
            hostname: location.hostname,
            selectedText: window.getSelection()?.toString().replace(/\s+/g, ' ').trim() || lastKnownSelection || '',
            media_timestamp: mediaTs,
          };
          try {
            if (widgetIframe && widgetIframe.contentWindow) {
              widgetIframe.contentWindow.postMessage(info, '*');
            }
          } catch (_) {}
        } else if (e.data?.type === 'SAVE_ANNOTATION' && e.data.annotation) {
          state.annotations.push(e.data.annotation);
          renderAllPendingHighlights();
        } else if (e.data?.type === 'RELOAD_ANNOTATIONS') {
          load();
        } else if ((e.data?.type === 'OPEN_TAB' || e.data?.type === 'OPEN_URL') && e.data.url) {
          console.log('[Annotated Content] Received tab open request for:', e.data.url);
          try {
            chrome.runtime.sendMessage({ type: 'openTab', url: e.data.url });
          } catch (_) {}
          try {
            window.open(e.data.url, '_blank', 'noopener,noreferrer');
          } catch (_) {}
        }
      });
    } else if (!shadowRoot.contains(widgetIframe)) {
      shadowRoot.appendChild(widgetIframe);
    }

    widgetIframe.style.display = 'block';
    widgetIframe.style.pointerEvents = 'auto';
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
    let posX = (typeof x === 'number' && !isNaN(x)) ? x : (window.innerWidth - 380);
    let posY = (typeof y === 'number' && !isNaN(y)) ? y : 20;
    let left = posX + 20;
    let top = posY - 30;
    if (left + 340 > window.innerWidth) left = window.innerWidth - 360;
    if (top + 370 > window.innerHeight) top = window.innerHeight - 390;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    widgetIframe.style.left = left + 'px';
    widgetIframe.style.top = top + 'px';
  }

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const quote = selection?.toString().replace(/\s+/g, ' ').trim();
    if (quote && quote.length >= 2 && selection.rangeCount > 0) {
      lastKnownSelection = quote;
      try {
        const range = selection.getRangeAt(0);
        lastKnownRect = range.getBoundingClientRect();
        const node = range.commonAncestorContainer;
        lastKnownElement = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      } catch (_) {}
    }
  });

  document.addEventListener('mousedown', (e) => {
    // If they click outside the widget, clear the fallback so it doesn't pop up again
    if (!widgetContainer || !widgetContainer.contains(e.target)) {
      lastKnownSelection = null;
      lastKnownRect = null;
      lastKnownElement = null;
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
    
    // Always open widget immediately
    try {
      createWidget(rect.right, rect.top);
    } catch (err) {
      console.warn('[Annotated] createWidget error:', err);
    }

    const mediaTs = getMediaTimestamp();
    const payload = {
      quote,
      url: getExactSourceUrl(mediaTs, lastKnownElement),
      title: document.title,
      hostname: location.hostname,
      timestamp: Date.now(),
      media_timestamp: mediaTs,
    };

    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ pendingSelection: payload }, () => {
          chrome.runtime.sendMessage({ type: 'selection', ...payload }).catch(() => {});
        });
      }
    } catch (_) {}
  };

  document.addEventListener('mouseup', () => setTimeout(recordSelection, 10));
  document.addEventListener('keyup', (e) => { if (e.key === 'Shift') setTimeout(recordSelection, 10); });

  // ─── Message handler ─────────────────────────────────────────────────────────
  
  // ─── Multimodal 240p Video Clipper (Max 90s) & Audio Fusion ───────────────
  let activeVideoRecorder = null;
  let activeRecordStream = null;
  let activeAudioStream = null;
  let activeSpeakerBridge = null;
  let activeVideoEl = null;
  let activeAnimFrameId = null;
  let isRecordingVideo = false;
  let pendingSendResponse = null;

  async function startOffscreenSpeakerBridge(audioStream) {
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' }, resolve);
      });

      const pc = new RTCPeerConnection();
      activeSpeakerBridge = pc;

      audioStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, audioStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (pc.iceGatheringState !== 'complete') {
        await new Promise((resolve) => {
          const check = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', check);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', check);
          setTimeout(resolve, 60);
        });
      }

      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_START_AUDIO_BRIDGE',
        sdp: pc.localDescription.sdp
      }, async (res) => {
        if (res && res.sdp && pc.signalingState !== 'closed') {
          try {
            await pc.setRemoteDescription({ type: 'answer', sdp: res.sdp });
          } catch (_) {}
        }
      });
    } catch (err) {
      console.warn('[Annotated] Live speaker bridge warning:', err);
    }
  }

  function stopOffscreenSpeakerBridge() {
    if (activeSpeakerBridge) {
      try { activeSpeakerBridge.close(); } catch (_) {}
      activeSpeakerBridge = null;
    }
    try {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_AUDIO_BRIDGE' }).catch(() => {});
    } catch (_) {}
  }

  function stopRecordingNow() {
    if (!isRecordingVideo && !activeVideoRecorder) return;
    isRecordingVideo = false;
    if (activeAnimFrameId) {
      if (activeVideoEl && 'cancelVideoFrameCallback' in activeVideoEl) {
        try { activeVideoEl.cancelVideoFrameCallback(activeAnimFrameId); } catch (_) {}
      }
      cancelAnimationFrame(activeAnimFrameId);
      activeAnimFrameId = null;
    }
    stopOffscreenSpeakerBridge();
    if (activeVideoRecorder && activeVideoRecorder.state === 'recording') {
      try {
        activeVideoRecorder.stop();
      } catch (err) {
        console.warn('[Annotated] Error calling recorder.stop():', err);
      }
    }
  }

  async function capture240pVideoClip(durationSeconds = 15, streamId, sendResponse) {
    if (isRecordingVideo) {
      stopRecordingNow();
    }

    const video = document.querySelector('video');
    if (!video) {
      sendResponse({ error: 'No video element found on this page.' });
      return;
    }

    try {
      pendingSendResponse = sendResponse;
      isRecordingVideo = true;
      activeVideoEl = video;

      const canvas = document.createElement('canvas');
      canvas.width = 426;  // 240p width
      canvas.height = 240; // 240p height
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(24); // 24 FPS
      activeRecordStream = stream;

      // ─── Audio Acquisition (Multi-tier: Tab Capture -> video element -> Silent WebAudio) ───
      let audioTrackAdded = false;

      // 1. Tab Capture audio via streamId
      let targetStreamId = streamId;
      if (!targetStreamId) {
        try {
          const bgRes = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'getTabAudioStreamId' }, resolve);
          });
          if (bgRes && bgRes.streamId) {
            targetStreamId = bgRes.streamId;
          }
        } catch (_) {}
      }

      if (targetStreamId) {
        try {
          const tabAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: targetStreamId
              },
              optional: [
                { echoCancellation: false },
                { autoGainControl: false },
                { noiseSuppression: false }
              ]
            }
          });
          if (tabAudioStream && tabAudioStream.getAudioTracks().length > 0) {
            activeAudioStream = tabAudioStream;
            const tabTrack = tabAudioStream.getAudioTracks()[0];
            if (tabTrack) {
              stream.addTrack(tabTrack);
              audioTrackAdded = true;
              startOffscreenSpeakerBridge(tabAudioStream);
            }
          }
        } catch (err) {
          console.warn('[Annotated] Tab audio getUserMedia error:', err);
        }
      }

      // 2. Video element captureStream fallback (works on non-CORS videos)
      if (!audioTrackAdded) {
        try {
          const vidStream = (video.captureStream && video.captureStream()) || (video.mozCaptureStream && video.mozCaptureStream());
          if (vidStream && vidStream.getAudioTracks().length > 0) {
            stream.addTrack(vidStream.getAudioTracks()[0]);
            audioTrackAdded = true;
          }
        } catch (_) {}
      }

      // 3. Silent Web Audio fallback (Ensures container ALWAYS has Opus track so player speaker icon is never disabled)
      if (!audioTrackAdded) {
        try {
          const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const dest = audioCtx.createMediaStreamDestination();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.value = 0; // Silent
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          const silentTrack = dest.stream.getAudioTracks()[0];
          if (silentTrack) {
            stream.addTrack(silentTrack);
            audioTrackAdded = true;
          }
        } catch (e) {
          console.warn('[Annotated] Silent audio creation fallback failed:', e);
        }
      }

      // Codecs negotiation
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 800000
      });
      activeVideoRecorder = recorder;
      const chunks = [];
      const recordStartTime = Date.now();
      const mediaStartTs = activeVideoEl ? activeVideoEl.currentTime : 0;
      const maxDurationMs = Math.min(durationSeconds, 90) * 1000;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        isRecordingVideo = false;
        if (activeAnimFrameId) {
          if (activeVideoEl && 'cancelVideoFrameCallback' in activeVideoEl) {
            try { activeVideoEl.cancelVideoFrameCallback(activeAnimFrameId); } catch (_) {}
          }
          cancelAnimationFrame(activeAnimFrameId);
          activeAnimFrameId = null;
        }
        stopOffscreenSpeakerBridge();
        try {
          stream.getTracks().forEach(t => t.stop());
        } catch (_) {}
        if (activeAudioStream) {
          try {
            activeAudioStream.getTracks().forEach(t => t.stop());
          } catch (_) {}
          activeAudioStream = null;
        }

        const rawBlob = new Blob(chunks, { type: 'video/webm' });
        const actualDurationMs = Math.max(Date.now() - recordStartTime, 500);
        const mediaEndTs = activeVideoEl ? activeVideoEl.currentTime : 0;

        const finalize = (finalBlob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (pendingSendResponse) {
              pendingSendResponse({
                dataUrl: reader.result,
                duration: Math.round(actualDurationMs / 1000),
                startTs: Math.floor(mediaStartTs),
                endTs: Math.floor(mediaEndTs)
              });
              pendingSendResponse = null;
            }
          };
          reader.readAsDataURL(finalBlob);
        };

        const fixFn = typeof ysFixWebmDuration === 'function' ? ysFixWebmDuration : (window.ysFixWebmDuration || null);
        if (fixFn) {
          fixFn(rawBlob, actualDurationMs, (fixedBlob) => {
            finalize(fixedBlob);
          });
        } else {
          finalize(rawBlob);
        }
      };

      // Draw initial frame before starting recorder
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (_) {}

      // Continuous recording without 100ms micro-chunking prevents audio stutter
      recorder.start(1000);

      const renderFrame = () => {
        if (!isRecordingVideo || !activeVideoRecorder || activeVideoRecorder.state !== 'recording') {
          return;
        }
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (_) {}

        if (Date.now() - recordStartTime >= maxDurationMs) {
          stopRecordingNow();
        } else {
          if ('requestVideoFrameCallback' in video) {
            activeAnimFrameId = video.requestVideoFrameCallback(renderFrame);
          } else {
            activeAnimFrameId = requestAnimationFrame(renderFrame);
          }
        }
      };

      if ('requestVideoFrameCallback' in video) {
        activeAnimFrameId = video.requestVideoFrameCallback(renderFrame);
      } else {
        activeAnimFrameId = requestAnimationFrame(renderFrame);
      }
    } catch (err) {
      isRecordingVideo = false;
      if (pendingSendResponse) {
        pendingSendResponse({ error: err.message || 'Failed to capture video clip.' });
        pendingSendResponse = null;
      }
    }
  }

  // ─── Speech-to-Text (STT) Engine ───────────────────────────────────────────
  let activeSpeechRecognition = null;
  let isDictating = false;
  let isStarting = false;
  let restartTimeoutId = null;
  let sessionAccumulatedFinal = '';
  let currentRunFinal = '';
  let consecutiveErrors = 0;

  function sendDictationEvent(payload) {
    console.log('[Content STT Dispatch]', payload);
    if (widgetIframe && widgetIframe.contentWindow) {
      try {
        widgetIframe.contentWindow.postMessage(payload, '*');
      } catch (_) {}
    } else {
      try {
        chrome.runtime.sendMessage(payload).catch(() => {});
      } catch (_) {}
    }
  }

  async function startDictation() {
    console.log('[Content STT] startDictation() initiated');
    if (isDictating || isStarting) {
      console.log('[Content STT] Already active or starting, ignoring duplicate start request.');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.error('[Content STT] webkitSpeechRecognition unavailable');
      sendDictationEvent({
        type: 'DICTATION_ERROR',
        error: 'Speech recognition is not supported on this browser/page.'
      });
      return;
    }

    isStarting = true;
    cleanupSTT(false);
    sessionAccumulatedFinal = '';
    currentRunFinal = '';
    consecutiveErrors = 0;
    isDictating = true;

    // Check permission state first to avoid redundant getUserMedia requests
    let hasPermission = false;
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' });
        console.log('[Content STT] navigator.permissions microphone state:', perm.state);
        if (perm.state === 'granted') {
          hasPermission = true;
        } else if (perm.state === 'denied') {
          isDictating = false;
          isStarting = false;
          sendDictationEvent({
            type: 'DICTATION_ERROR',
            error: 'Microphone is blocked for this site. Click the lock icon in the URL bar to allow.'
          });
          return;
        }
      } catch (_) {}
    }

    if (!hasPermission && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      sendDictationEvent({ type: 'DICTATION_STATUS', status: 'Requesting mic permission…' });
      try {
        console.log('[Content STT] Requesting getUserMedia to prompt for microphone permission...');
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
        await new Promise(r => setTimeout(r, 120));
      } catch (err) {
        console.warn('[Content STT] getUserMedia error:', err);
        isDictating = false;
        isStarting = false;
        sendDictationEvent({
          type: 'DICTATION_ERROR',
          error: 'Microphone permission denied. Allow mic access to dictate.'
        });
        return;
      }
    }

    sendDictationEvent({ type: 'DICTATION_STATUS', status: '🎙️ Mic active… listening' });

    function initRecognition() {
      if (!isDictating) return;

      try {
        console.log('[Content STT] Initializing SpeechRecognition session');
        const recognition = new SpeechRec();
        activeSpeechRecognition = recognition;
        let recognitionFailed = false;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';

        recognition.onstart = () => {
          console.log('[Content STT] Event: onstart');
          isStarting = false;
          consecutiveErrors = 0;
          sendDictationEvent({ type: 'DICTATION_STARTED' });
        };

        recognition.onaudiostart = () => {
          console.log('[Content STT] Event: onaudiostart');
          sendDictationEvent({ type: 'DICTATION_STATUS', status: '🎙️ Mic active… listening' });
        };

        recognition.onresult = (event) => {
          consecutiveErrors = 0;
          let runFinal = '';
          let interimTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              runFinal += item[0].transcript + ' ';
            } else {
              interimTranscript += item[0].transcript;
            }
          }
          currentRunFinal = runFinal;
          const fullText = (sessionAccumulatedFinal + currentRunFinal + interimTranscript).trimStart();
          console.log('[Content STT] Transcribed total:', fullText);
          sendDictationEvent({
            type: 'DICTATION_RESULT',
            text: fullText,
            finalTranscript: sessionAccumulatedFinal + currentRunFinal,
            interimTranscript: interimTranscript
          });
        };

        recognition.onerror = (event) => {
          console.warn('[Content STT] Event: onerror! Code:', event.error, event);
          if (event.error === 'aborted') {
            return;
          }
          if (event.error === 'no-speech') {
            // Normal silence pause, do not kill the dictation session
            return;
          }

          recognitionFailed = true;
          consecutiveErrors++;

          if (event.error === 'not-allowed') {
            isDictating = false;
            sendDictationEvent({
              type: 'DICTATION_ERROR',
              error: 'Microphone permission blocked. Please allow mic access.'
            });
          } else if (event.error === 'audio-capture') {
            if (consecutiveErrors > 2) {
              isDictating = false;
              sendDictationEvent({
                type: 'DICTATION_ERROR',
                error: 'Microphone not available or busy in another app.'
              });
            }
          } else if (event.error === 'network') {
            if (consecutiveErrors > 2) {
              isDictating = false;
              sendDictationEvent({
                type: 'DICTATION_ERROR',
                error: 'Speech recognition network error. Please check your connection.'
              });
            }
          } else {
            if (consecutiveErrors > 2) {
              isDictating = false;
              sendDictationEvent({
                type: 'DICTATION_ERROR',
                error: `Dictation error: ${event.error}`
              });
            }
          }
        };

        recognition.onend = () => {
          console.log('[Content STT] Event: onend. isDictating:', isDictating, 'recognitionFailed:', recognitionFailed);
          sessionAccumulatedFinal += currentRunFinal;
          currentRunFinal = '';

          if (isDictating && consecutiveErrors <= 2) {
            console.log('[Content STT] Still dictating; re-engaging session...');
            restartTimeoutId = setTimeout(() => {
              if (isDictating) {
                initRecognition();
              }
            }, 250);
            return;
          }

          cleanupSTT(consecutiveErrors <= 2);
        };

        console.log('[Content STT] Calling recognition.start()...');
        recognition.start();
      } catch (err) {
        console.error('[Content STT] Failed to initialize recognition:', err);
        consecutiveErrors++;
        if (isDictating && consecutiveErrors <= 2) {
          restartTimeoutId = setTimeout(() => {
            if (isDictating) initRecognition();
          }, 350);
        } else {
          cleanupSTT(false);
          sendDictationEvent({
            type: 'DICTATION_ERROR',
            error: err.message || 'Failed to start dictation.'
          });
        }
      }
    }

    initRecognition();
  }

  function cleanupSTT(notifyEnded = true) {
    console.log('[Content STT] cleanupSTT called. notifyEnded:', notifyEnded);
    isDictating = false;
    isStarting = false;
    if (restartTimeoutId) {
      clearTimeout(restartTimeoutId);
      restartTimeoutId = null;
    }
    if (activeSpeechRecognition) {
      const rec = activeSpeechRecognition;
      activeSpeechRecognition = null;
      try { rec.abort(); } catch (_) {}
    }
    if (notifyEnded) {
      sendDictationEvent({ type: 'DICTATION_ENDED' });
    }
  }

  function stopDictation() {
    console.log('[Content STT] stopDictation() called by user');
    isDictating = false;
    isStarting = false;
    cleanupSTT(true);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_DICTATION') {
      console.log('[Content Host] chrome.runtime message received: START_DICTATION');
      startDictation();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'STOP_DICTATION') {
      console.log('[Content Host] chrome.runtime message received: STOP_DICTATION');
      stopDictation();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'stopVideo') {
      stopRecordingNow();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'captureVideo') {
      capture240pVideoClip(message.duration || 90, message.streamId, sendResponse);
      return true;
    }
    if (message.type === 'TOGGLE_WIDGET') {
      if (widgetIframe && widgetIframe.style.display !== 'none') {
        widgetIframe.style.display = 'none';
      } else {
        createWidget(window.innerWidth - 380, 20);
      }
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'openWidget') {
      createWidget(window.innerWidth - 380, 20);
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'saveAnnotation') {
      const annotation = { ...message.annotation, id: message.annotation.id || crypto.randomUUID(), url: message.annotation.url || location.href };
      state.annotations.push(annotation);
      chrome.storage.local.set({ [getKey()]: state.annotations }).then(() => {
        renderHighlight(annotation);
        sendResponse({ ok: true });
      });
      return true;
    }
    if (message.type === 'getPageInfo') {
      const mediaTs = getMediaTimestamp();
      sendResponse({
        title: document.title,
        url: getExactSourceUrl(mediaTs, lastKnownElement),
        hostname: location.hostname,
        selectedText: window.getSelection()?.toString().replace(/\s+/g, ' ').trim() || lastKnownSelection || '',
        media_timestamp: mediaTs,
      });
    }
  });

  load();
})();





  // Listen to YouTube SPA navigation events
  window.addEventListener('yt-navigate-finish', () => { setTimeout(load, 300); });
  window.addEventListener('yt-page-data-updated', () => { setTimeout(load, 300); });
  window.addEventListener('spfdone', () => { setTimeout(load, 300); });
