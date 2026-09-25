"use strict";
(() => {
  // extension-src/shared/utils.ts
  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };
      return map[c] || c;
    });
  }
  function formatSeconds(sec) {
    if (sec == null || isNaN(sec)) return "";
    const s = Math.floor(sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor(s % 3600 / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  function extractTimestamp(url, comment) {
    if (!url && !comment) return null;
    const urlStr = String(url || "");
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
          return parseInt(val.replace("s", ""), 10);
        }
        return h * 3600 + m * 60 + s;
      } else if (/^\d+$/.test(val)) {
        return parseInt(val, 10);
      }
    }
    const commentMatch = String(comment || "").match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\]/);
    if (commentMatch) {
      if (commentMatch[3]) {
        return parseInt(commentMatch[1], 10) * 3600 + parseInt(commentMatch[2], 10) * 60 + parseInt(commentMatch[3], 10);
      }
      return parseInt(commentMatch[1], 10) * 60 + parseInt(commentMatch[2], 10);
    }
    return null;
  }
  function extractTimestampRange(url, comment) {
    const urlStr = String(url || "");
    const commentStr = String(comment || "");
    const rangeCommentMatch = commentStr.match(
      /\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\s*-\s*(\d+):(\d+)(?::(\d+))?\]/
    );
    if (rangeCommentMatch) {
      let s1 = parseInt(rangeCommentMatch[1], 10) * 60 + parseInt(rangeCommentMatch[2], 10);
      if (rangeCommentMatch[3]) {
        s1 = parseInt(rangeCommentMatch[1], 10) * 3600 + parseInt(rangeCommentMatch[2], 10) * 60 + parseInt(rangeCommentMatch[3], 10);
      }
      let s2 = parseInt(rangeCommentMatch[4], 10) * 60 + parseInt(rangeCommentMatch[5], 10);
      if (rangeCommentMatch[6]) {
        s2 = parseInt(rangeCommentMatch[4], 10) * 3600 + parseInt(rangeCommentMatch[5], 10) * 60 + parseInt(rangeCommentMatch[6], 10);
      }
      return { start: s1, end: Math.max(s1 + 5, s2) };
    }
    const urlRangeMatch = urlStr.match(/[?&#]t=(\d+)(?:s)?-(\d+)(?:s)?/i);
    if (urlRangeMatch) {
      const s1 = parseInt(urlRangeMatch[1], 10);
      const s2 = parseInt(urlRangeMatch[2], 10);
      return { start: s1, end: Math.max(s1 + 5, s2) };
    }
    const startTs = extractTimestamp(url, comment);
    if (startTs != null && startTs >= 0) {
      return { start: startTs, end: startTs + 15 };
    }
    return null;
  }
  function extractYouTubeVideoId(url) {
    if (!url) return null;
    try {
      if (url.includes("youtube.com") && url.includes("v=")) {
        return new URL(url).searchParams.get("v");
      }
      if (url.includes("youtu.be/")) {
        const parts = new URL(url).pathname.split("/");
        return parts[1] || null;
      }
    } catch (_) {
    }
    return null;
  }
  function pageKey(url) {
    try {
      const u = new URL(url || (typeof location !== "undefined" ? location.href : "https://annotated.com"));
      return `page:${u.origin}${u.pathname}`;
    } catch (_) {
      return "page:https://annotated.com/";
    }
  }

  // extension-src/shared/config.ts
  var SUPABASE_CONFIG = {
    url: "https://dajadbvlldrmgzztdksn.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU"
  };
  var SITE_URL = "https://annotated-repo.vercel.app";
  var FACTCHECK_API_URL = `${SITE_URL}/api/ai/factcheck`;

  // extension-src/content/highlighter.ts
  var norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  var highlightMap = /* @__PURE__ */ new WeakMap();
  var hoverBubble = null;
  var hideBubbleTimeout = null;
  var currentHoveredAnnotationId = null;
  function injectHighlightStyles() {
    if (document.getElementById("annotated-highlight-style")) return;
    const style = document.createElement("style");
    style.id = "annotated-highlight-style";
    style.textContent = `
    .annotated-highlight {
      background-color: #ffd21a !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      border-radius: 2px !important;
      cursor: pointer !important;
      padding: 1px 2px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.12) !important;
      transition: background-color 0.15s ease !important;
    }
    .annotated-highlight:hover {
      background-color: #f59e0b !important;
    }
  `;
    (document.head || document.documentElement).appendChild(style);
  }
  function extractCandidatePhrases(rawQuote) {
    const candidates = /* @__PURE__ */ new Set();
    const clean = rawQuote.trim();
    if (!clean) return candidates;
    candidates.add(clean);
    const clauses = clean.split(/[,.;:!?\n\r]+/).map((c) => c.trim()).filter((c) => c.length > 5);
    clauses.forEach((c) => candidates.add(c));
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length > 8) {
      candidates.add(words.slice(0, 8).join(" "));
      candidates.add(words.slice(-8).join(" "));
    }
    return candidates;
  }
  function safeHighlightRange(range, annotation) {
    try {
      const mark = document.createElement("mark");
      mark.className = "annotated-highlight";
      mark.setAttribute("data-annotated-highlight", String(annotation.id || ""));
      range.surroundContents(mark);
      highlightMap.set(mark, annotation);
      return mark;
    } catch (_) {
      try {
        const mark = document.createElement("mark");
        mark.className = "annotated-highlight";
        mark.setAttribute("data-annotated-highlight", String(annotation.id || ""));
        const contents = range.extractContents();
        mark.appendChild(contents);
        range.insertNode(mark);
        highlightMap.set(mark, annotation);
        return mark;
      } catch (_2) {
        return null;
      }
    }
  }
  function triggerScroll(mark, annotation) {
    if (annotation._hasScrolled) return;
    annotation._hasScrolled = true;
    setTimeout(() => {
      try {
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {
      }
    }, 350);
  }
  function renderHighlight(annotation) {
    if (!annotation?.quote && !annotation?.quote_text) return;
    const quote = (annotation.quote || annotation.quote_text || "").trim();
    if (quote.length < 3) return;
    if (annotation.id && document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) {
      return;
    }
    if (location.hostname.includes("twitter.com") || location.hostname.includes("x.com")) {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      for (const tweet of Array.from(tweets)) {
        const tweetTextEl = tweet.querySelector('[data-testid="tweetText"]');
        if (tweetTextEl && tweetTextEl.textContent) {
          if (norm(tweetTextEl.textContent).includes(norm(quote))) {
            const mark = document.createElement("span");
            mark.className = "annotated-highlight";
            mark.setAttribute("data-annotated-highlight", String(annotation.id || ""));
            mark.textContent = tweetTextEl.textContent;
            tweetTextEl.innerHTML = "";
            tweetTextEl.appendChild(mark);
            highlightMap.set(mark, annotation);
            triggerScroll(mark, annotation);
            return;
          }
        }
      }
    }
    const candidatePhrases = extractCandidatePhrases(quote);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest(
        "script, style, noscript, textarea, input, select, iframe, [data-annotated-highlight]"
      )) {
        continue;
      }
      const text = node.nodeValue || "";
      for (const phrase of candidatePhrases) {
        const idx = text.indexOf(phrase);
        if (idx !== -1) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + phrase.length);
          const mark = safeHighlightRange(range, annotation);
          if (mark) {
            triggerScroll(mark, annotation);
            return;
          }
        }
      }
    }
  }
  function ensureHoverBubble(shadowRoot2) {
    if (hoverBubble && shadowRoot2.contains(hoverBubble)) return hoverBubble;
    hoverBubble = document.createElement("div");
    hoverBubble.id = "annotated-hover-bubble";
    hoverBubble.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: #1e293b;
    color: #f8fafc;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    max-width: 260px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    display: none;
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
    shadowRoot2.appendChild(hoverBubble);
    return hoverBubble;
  }
  function showHoverBubble(mark, annotation, profile, shadowRoot2, onOpenWidget) {
    if (hideBubbleTimeout) {
      clearTimeout(hideBubbleTimeout);
      hideBubbleTimeout = null;
    }
    currentHoveredAnnotationId = annotation.id || null;
    const bubble = ensureHoverBubble(shadowRoot2);
    const rect = mark.getBoundingClientRect();
    const authorName = profile?.full_name || profile?.email?.split("@")[0] || annotation.user_name || "Annotator";
    bubble.innerHTML = `
    <div style="font-weight: 700; color: #ffd21a; margin-bottom: 4px; display: flex; justify-content: space-between;">
      <span>${escapeHtml(annotation.intent || "\u{1F4A1}")} @${escapeHtml(authorName)}</span>
    </div>
    <div style="color: #cbd5e1; font-size: 11px; line-height: 1.4; margin-bottom: 6px;">
      ${escapeHtml((annotation.comment || annotation.commentary || "").slice(0, 100))}
    </div>
    <div style="font-size: 10px; color: #94a3b8; text-align: right; cursor: pointer;" id="bubbleOpenDetail">
      View note \u2197
    </div>
  `;
    bubble.style.top = `${Math.max(10, rect.top - 60)}px`;
    bubble.style.left = `${Math.min(window.innerWidth - 270, Math.max(10, rect.left))}px`;
    bubble.style.display = "block";
    const openBtn = bubble.querySelector("#bubbleOpenDetail");
    if (openBtn) {
      openBtn.addEventListener("click", () => {
        bubble.style.display = "none";
        onOpenWidget(annotation);
      });
    }
  }
  function hideHoverBubble() {
    hideBubbleTimeout = setTimeout(() => {
      if (hoverBubble) hoverBubble.style.display = "none";
      currentHoveredAnnotationId = null;
    }, 220);
  }

  // extension-src/content/youtube.ts
  function renderYouTubeProgressBarMarkers(annotations, onSeek, onOpenAnnotation) {
    const isYTWatch = location.hostname.includes("youtube.com") && location.pathname.includes("/watch");
    if (!isYTWatch || !annotations || annotations.length === 0) {
      const existingContainer = document.getElementById("annotated-yt-markers-layer");
      if (existingContainer) existingContainer.remove();
      return;
    }
    const mediaEl = document.querySelector("video");
    const progressBar = document.querySelector(".ytp-progress-bar") || document.querySelector(".ytp-progress-bar-container");
    if (!mediaEl || !progressBar || !mediaEl.duration || isNaN(mediaEl.duration) || mediaEl.duration <= 0) {
      return;
    }
    const currentVId = new URLSearchParams(location.search).get("v");
    const ytAnns = annotations.filter((ann) => {
      if (!ann) return false;
      if (currentVId) return String(ann.url || "").includes(currentVId);
      return true;
    });
    if (ytAnns.length === 0) {
      const existingContainer = document.getElementById("annotated-yt-markers-layer");
      if (existingContainer) existingContainer.remove();
      return;
    }
    let markersLayer = document.getElementById("annotated-yt-markers-layer");
    if (!markersLayer) {
      markersLayer = document.createElement("div");
      markersLayer.id = "annotated-yt-markers-layer";
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
    markersLayer.innerHTML = "";
    const totalDuration = mediaEl.duration;
    ytAnns.forEach((ann) => {
      const range = extractTimestampRange(ann.url, ann.comment || ann.commentary);
      if (!range || range.start < 0 || range.start > totalDuration) return;
      const startPct = range.start / totalDuration * 100;
      const endPct = Math.min(range.end, totalDuration) / totalDuration * 100;
      const widthPct = Math.max(endPct - startPct, 0.6);
      const intent = ann.intent || "\u{1F4A1}";
      const commentText = (ann.comment || ann.commentary || ann.quote || ann.quote_text || "Annotation").trim();
      const marker = document.createElement("div");
      marker.className = "annotated-yt-progress-marker-wrap";
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
      const visual = document.createElement("div");
      visual.className = "annotated-yt-progress-marker";
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
      marker.addEventListener("mouseenter", () => {
        visual.style.transform = "scaleY(1.8)";
        visual.style.background = "rgba(255, 255, 255, 0.9)";
        visual.style.boxShadow = "0 0 14px #ffffff, 0 0 8px #ffd21a";
        markerTooltip = document.createElement("div");
        markerTooltip.className = "annotated-yt-marker-tooltip";
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
        const timeRangeStr = range.end > range.start + 2 ? `${formatSeconds(range.start)} - ${formatSeconds(range.end)}` : formatSeconds(range.start);
        const cleanComment = commentText.replace(/\[(?:⏱️\s*)?[0-9hms:]+\s*-\s*[0-9hms:]+\]/i, "").trim();
        markerTooltip.innerHTML = `
        <span style="background:#ffd21a; color:#000; padding:2px 7px; border-radius:12px; font-weight:800; font-size:11px;">\u23F1\uFE0F ${timeRangeStr}</span>
        ${intent ? `<span style="color:#ffd21a; font-weight:700;">${intent}</span>` : ""}
        ${cleanComment ? `<span style="opacity:0.9; max-width:240px; overflow:hidden; text-overflow:ellipsis;">"${escapeHtml(
          cleanComment.slice(0, 50)
        )}${cleanComment.length > 50 ? "\u2026" : ""}"</span>` : ""}
      `;
        markersLayer?.appendChild(markerTooltip);
      });
      marker.addEventListener("mouseleave", () => {
        visual.style.transform = "scale(1)";
        visual.style.background = "rgba(255, 210, 26, 0.65)";
        visual.style.boxShadow = "0 0 10px rgba(255, 210, 26, 0.8), inset 0 0 4px rgba(255, 210, 26, 0.6)";
        if (markerTooltip) {
          markerTooltip.remove();
          markerTooltip = null;
        }
      });
      marker.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        onSeek(range.start);
        onOpenAnnotation(ann);
      });
      markersLayer.appendChild(marker);
    });
  }
  function renderYouTubeVideoTag(annotations, profiles, onSeek, onOpenAnnotation) {
    const isYTWatch = location.hostname.includes("youtube.com") && location.pathname.includes("/watch");
    if (!isYTWatch) {
      const existingBadge = document.getElementById("annotated-yt-floating-badge");
      if (existingBadge) existingBadge.remove();
      return;
    }
    const currentVId = new URLSearchParams(location.search).get("v");
    const ytAnns = annotations.filter((ann) => {
      if (!ann) return false;
      if (currentVId) return String(ann.url || "").includes(currentVId);
      return true;
    });
    if (!ytAnns.length) {
      const existingBadge = document.getElementById("annotated-yt-floating-badge");
      if (existingBadge) existingBadge.remove();
      return;
    }
    const currentFingerprint = ytAnns.map((a) => `${a.id}:${a.comment || ""}`).join(",");
    let badge = document.getElementById("annotated-yt-floating-badge");
    if (badge && badge.getAttribute("data-fingerprint") === currentFingerprint) {
      return;
    }
    if (badge) badge.remove();
    badge = document.createElement("div");
    badge.id = "annotated-yt-floating-badge";
    badge.setAttribute("data-fingerprint", currentFingerprint);
    badge.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 2147483640;
    background: #0f172a;
    color: #f8fafc;
    border: 1.5px solid #ffd21a;
    border-radius: 9999px;
    padding: 7px 15px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255, 210, 26, 0.25);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
    badge.innerHTML = `
    <span style="font-size: 14px;">\u{1F4AC}</span>
    <span style="color: #ffffff; font-weight: 700;">${ytAnns.length} note${ytAnns.length === 1 ? "" : "s"} on this page</span>
    <span style="background: #ffd21a; color: #000; font-size: 10px; font-weight: 900; padding: 1px 6px; border-radius: 10px;">\u25BC</span>
  `;
    const menu = document.createElement("div");
    menu.className = "annotated-yt-dropdown-menu";
    menu.style.cssText = `
    position: absolute;
    bottom: calc(100% + 10px);
    left: 0;
    background: #0f172a;
    border: 1.5px solid #ffd21a;
    border-radius: 12px;
    padding: 8px;
    display: none;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 210, 26, 0.2);
    min-width: 280px;
    max-width: 360px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 2147483647;
    cursor: default;
  `;
    ytAnns.forEach((ann) => {
      const item = document.createElement("div");
      const tsRange = extractTimestampRange(ann.url, ann.comment || ann.commentary);
      let tsStr = "";
      let startSec = null;
      if (tsRange) {
        startSec = tsRange.start;
        tsStr = tsRange.end > tsRange.start + 2 ? `${formatSeconds(tsRange.start)} - ${formatSeconds(tsRange.end)}` : formatSeconds(tsRange.start);
      }
      const intent = ann.intent || "\u{1F4A1}";
      const commentRaw = (ann.comment || ann.commentary || ann.quote || ann.quote_text || "Annotation").trim();
      const cleanComment = commentRaw.replace(/\[(?:⏱️\s*)?[0-9hms:]+\s*-\s*[0-9hms:]+\]/i, "").trim();
      const prof = ann.user_id ? profiles[ann.user_id] : void 0;
      const authorName = prof?.full_name || (prof?.email ? `@${prof.email.split("@")[0]}` : ann.user_name || "Annotator");
      const avatarUrl = prof?.avatar_url;
      const avatarHtml = avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : `<div style="width: 18px; height: 18px; border-radius: 50%; background: #ffd21a; color: #000; font-size: 9px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0;">${escapeHtml(
        (authorName || "A")[0].toUpperCase()
      )}</div>`;
      item.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 10px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      text-align: left;
    `;
      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(255, 210, 26, 0.15)";
        item.style.borderColor = "rgba(255, 210, 26, 0.4)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "rgba(255, 255, 255, 0.05)";
        item.style.borderColor = "rgba(255, 255, 255, 0.08)";
      });
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (startSec != null) onSeek(startSec);
        onOpenAnnotation(ann);
        menu.style.display = "none";
      });
      item.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
          ${avatarHtml}
          <strong style="font-size: 11px; color: #ffd21a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
        authorName
      )}</strong>
        </div>
        ${intent ? `<span style="font-size: 12px; flex-shrink: 0;">${intent}</span>` : ""}
      </div>
      ${tsStr ? `<div style="display: flex; align-items: center; gap: 4px; margin-top: 1px;">
              <span style="background: #ffd21a; color: #000; padding: 2px 7px; border-radius: 10px; font-weight: 800; font-size: 10px; font-family: monospace;">\u23F1\uFE0F ${tsStr}</span>
             </div>` : ""}
      <div style="font-size: 11.5px; color: #e2e8f0; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-top: 2px;">
        ${escapeHtml(cleanComment || "Annotation note")}
      </div>
    `;
      menu.appendChild(item);
    });
    badge.appendChild(menu);
    let hoverTimer = null;
    badge.addEventListener("mouseenter", () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      badge.style.transform = "scale(1.03)";
      menu.style.display = "flex";
    });
    badge.addEventListener("mouseleave", () => {
      hoverTimer = setTimeout(() => {
        menu.style.display = "none";
        badge.style.transform = "scale(1)";
      }, 280);
    });
    badge.addEventListener("click", (e) => {
      if (e.target.closest(".annotated-yt-dropdown-menu")) return;
      if (ytAnns[0]) {
        const range = extractTimestampRange(ytAnns[0].url, ytAnns[0].comment || ytAnns[0].commentary);
        if (range) onSeek(range.start);
        onOpenAnnotation(ytAnns[0]);
      }
    });
    document.body.appendChild(badge);
  }

  // extension-src/content/selection.ts
  var lastKnownSelection = null;
  var lastKnownRect = null;
  var lastKnownElement = null;
  function getMediaTimestamp() {
    try {
      const moviePlayer = document.getElementById("movie_player");
      if (moviePlayer && typeof moviePlayer.getCurrentTime === "function") {
        const t = moviePlayer.getCurrentTime();
        if (t != null && !isNaN(t) && t > 0) return Math.floor(t);
      }
    } catch (_) {
    }
    try {
      if (lastKnownElement) {
        const container = lastKnownElement.closest(
          'div[data-testid="videoPlayer"], div[data-testid="videoComponent"], .html5-video-player, video, audio'
        );
        if (container) {
          const media = container.querySelector("video, audio");
          if (media && media.currentTime != null && !isNaN(media.currentTime) && media.currentTime > 0) {
            return Math.floor(media.currentTime);
          }
        }
      }
    } catch (_) {
    }
    try {
      const v = document.querySelector("video, audio");
      if (v && v.currentTime != null && !isNaN(v.currentTime) && v.currentTime > 0) {
        return Math.floor(v.currentTime);
      }
    } catch (_) {
    }
    return null;
  }
  function seekToTimestamp(seconds) {
    try {
      const moviePlayer = document.getElementById("movie_player");
      if (moviePlayer && typeof moviePlayer.seekTo === "function") {
        moviePlayer.seekTo(seconds, true);
        if (typeof moviePlayer.playVideo === "function") moviePlayer.playVideo();
        return;
      }
    } catch (_) {
    }
    const v = document.querySelector("video, audio");
    if (v) {
      try {
        v.currentTime = seconds;
        v.play().catch(() => {
        });
      } catch (_) {
      }
    }
  }
  function getSmartPageTitle(targetEl) {
    const el = targetEl || lastKnownElement;
    if (el) {
      const tweet = el.closest('article[data-testid="tweet"]');
      if (tweet) {
        const author = tweet.querySelector('[data-testid="User-Name"] span')?.textContent || "User";
        return `Post by ${author} on X`;
      }
    }
    return document.title || "Current page";
  }
  function getExactSourceUrl(targetEl) {
    const el = targetEl || lastKnownElement;
    if (el) {
      const tweet = el.closest('article[data-testid="tweet"]');
      if (tweet) {
        const timeLink = tweet.querySelector("time")?.closest("a");
        if (timeLink?.href) return timeLink.href;
        const statusLink = tweet.querySelector('a[href*="/status/"]');
        if (statusLink?.href) return statusLink.href;
      }
    }
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    return canonical || location.href;
  }
  function buildPageInfo() {
    const sel = window.getSelection()?.toString().trim() || lastKnownSelection || "";
    const url = getExactSourceUrl();
    const rawTs = getMediaTimestamp();
    const mediaTs = rawTs != null ? rawTs : extractTimestamp(url, "");
    return {
      title: getSmartPageTitle(),
      url,
      hostname: location.hostname,
      selectedText: sel,
      quote: sel,
      media_timestamp: mediaTs
    };
  }
  function recordSelection(onSelectionRecorded) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 2) return;
    lastKnownSelection = text;
    const range = sel.getRangeAt(0);
    lastKnownRect = range.getBoundingClientRect();
    lastKnownElement = range.commonAncestorContainer;
    if (lastKnownElement.nodeType === Node.TEXT_NODE) {
      lastKnownElement = lastKnownElement.parentElement;
    }
    const payload = buildPageInfo();
    try {
      chrome.storage.local.set({ pendingSelection: { ...payload, timestamp: Date.now() } });
      chrome.runtime.sendMessage({ type: "selection", ...payload }).catch(() => {
      });
    } catch (_) {
    }
    if (onSelectionRecorded) {
      onSelectionRecorded(payload);
    }
  }

  // extension-src/content/screenshot-crop.ts
  function startCropScreenshot(widgetIframe2, onCaptured, onError) {
    if (widgetIframe2) {
      widgetIframe2.style.visibility = "hidden";
    }
    const existing = document.getElementById("annotated-crop-overlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "annotated-crop-overlay";
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    cursor: crosshair;
    user-select: none;
    background: rgba(0, 0, 0, 0.35);
  `;
    const banner = document.createElement("div");
    banner.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.92);
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 9999px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12);
    pointer-events: none;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
    banner.innerHTML = `<span style="font-size: 15px;">\u{1F4F8}</span> Drag to crop screenshot &nbsp;\xB7&nbsp; <kbd style="background: rgba(255,255,255,0.18); padding: 1px 6px; border-radius: 4px; font-size: 11px;">ESC</kbd> to cancel`;
    overlay.appendChild(banner);
    const cropBox = document.createElement("div");
    cropBox.style.cssText = `
    position: absolute;
    display: none;
    border: 2px solid #ffd21a;
    box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.45), 0 0 12px rgba(255, 210, 26, 0.5);
    background: transparent;
    pointer-events: none;
  `;
    overlay.appendChild(cropBox);
    const dimBadge = document.createElement("div");
    dimBadge.style.cssText = `
    position: absolute;
    bottom: -26px;
    right: 0;
    background: #ffd21a;
    color: #000;
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
  `;
    cropBox.appendChild(dimBadge);
    let startX = 0;
    let startY = 0;
    let isDragging2 = false;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        cleanup();
      }
    };
    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (widgetIframe2) {
        widgetIframe2.style.visibility = "visible";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    overlay.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      isDragging2 = true;
      cropBox.style.left = `${startX}px`;
      cropBox.style.top = `${startY}px`;
      cropBox.style.width = "0px";
      cropBox.style.height = "0px";
      cropBox.style.display = "block";
    });
    overlay.addEventListener("mousemove", (e) => {
      if (!isDragging2) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      cropBox.style.left = `${left}px`;
      cropBox.style.top = `${top}px`;
      cropBox.style.width = `${width}px`;
      cropBox.style.height = `${height}px`;
      dimBadge.textContent = `${Math.round(width)} \xD7 ${Math.round(height)}`;
    });
    overlay.addEventListener("mouseup", (e) => {
      if (!isDragging2) return;
      isDragging2 = false;
      const endX = e.clientX;
      const endY = e.clientY;
      const cropX = Math.min(startX, endX);
      const cropY = Math.min(startY, endY);
      const cropW = Math.abs(endX - startX);
      const cropH = Math.abs(endY - startY);
      cleanup();
      if (cropW < 8 || cropH < 8) {
        return;
      }
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: "CAPTURE_SCREENSHOT" }, (response) => {
          if (!response?.dataUrl) {
            if (onError) onError("Failed to capture screen image");
            return;
          }
          const dpr = window.devicePixelRatio || 1;
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(cropW * dpr);
            canvas.height = Math.round(cropH * dpr);
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(
              img,
              Math.round(cropX * dpr),
              Math.round(cropY * dpr),
              Math.round(cropW * dpr),
              Math.round(cropH * dpr),
              0,
              0,
              Math.round(cropW * dpr),
              Math.round(cropH * dpr)
            );
            const croppedDataUrl = canvas.toDataURL("image/png");
            onCaptured(croppedDataUrl);
          };
          img.onerror = () => {
            if (onError) onError("Failed to process captured image");
          };
          img.src = response.dataUrl;
        });
      }, 60);
    });
    document.documentElement.appendChild(overlay);
  }

  // extension-src/content/dictation.ts
  var activeSpeechRecognition = null;
  var isDictating = false;
  var isStarting = false;
  var restartTimeoutId = null;
  var sessionAccumulatedFinal = "";
  var currentRunFinal = "";
  var consecutiveErrors = 0;
  function sendDictationEvent(widgetIframe2, eventData) {
    if (widgetIframe2?.contentWindow) {
      widgetIframe2.contentWindow.postMessage(eventData, "*");
    }
    try {
      chrome.runtime.sendMessage(eventData).catch(() => {
      });
    } catch (_) {
    }
  }
  function startDictation(widgetIframe2) {
    if (isDictating || isStarting) return;
    isStarting = true;
    consecutiveErrors = 0;
    sessionAccumulatedFinal = "";
    currentRunFinal = "";
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      sendDictationEvent(widgetIframe2, {
        type: "DICTATION_ERROR",
        error: "Speech recognition is not supported in this browser."
      });
      isStarting = false;
      return;
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        initRecognition();
      }).catch((err) => {
        console.warn("[Annotated STT] getUserMedia error:", err);
        initRecognition();
      });
    } else {
      initRecognition();
    }
    function initRecognition() {
      try {
        activeSpeechRecognition = new SpeechRecognition();
        activeSpeechRecognition.continuous = true;
        activeSpeechRecognition.interimResults = true;
        activeSpeechRecognition.lang = "en-US";
        activeSpeechRecognition.onstart = () => {
          isDictating = true;
          isStarting = false;
          sendDictationEvent(widgetIframe2, { type: "DICTATION_STARTED" });
        };
        activeSpeechRecognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentRunFinal += transcript + " ";
            } else {
              interim += transcript;
            }
          }
          sendDictationEvent(widgetIframe2, {
            type: "DICTATION_RESULT",
            text: (sessionAccumulatedFinal + currentRunFinal + interim).trim(),
            finalTranscript: (sessionAccumulatedFinal + currentRunFinal).trim(),
            interimTranscript: interim.trim()
          });
        };
        activeSpeechRecognition.onerror = (event) => {
          console.warn("[Annotated STT] Recognition error:", event.error);
          if (event.error === "not-allowed") {
            cleanupSTT();
            sendDictationEvent(widgetIframe2, {
              type: "DICTATION_ERROR",
              error: "Microphone permission denied."
            });
            return;
          }
          if (event.error === "no-speech") {
            return;
          }
          consecutiveErrors++;
          if (consecutiveErrors > 3) {
            cleanupSTT();
            sendDictationEvent(widgetIframe2, {
              type: "DICTATION_ERROR",
              error: `Dictation failed: ${event.error}`
            });
          }
        };
        activeSpeechRecognition.onend = () => {
          sessionAccumulatedFinal += currentRunFinal;
          currentRunFinal = "";
          if (isDictating) {
            restartTimeoutId = setTimeout(() => {
              if (isDictating && activeSpeechRecognition) {
                try {
                  activeSpeechRecognition.start();
                } catch (_) {
                }
              }
            }, 200);
          } else {
            cleanupSTT();
            sendDictationEvent(widgetIframe2, { type: "DICTATION_ENDED" });
          }
        };
        activeSpeechRecognition.start();
      } catch (err) {
        cleanupSTT();
        sendDictationEvent(widgetIframe2, {
          type: "DICTATION_ERROR",
          error: `Could not start dictation: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    }
  }
  function cleanupSTT() {
    isDictating = false;
    isStarting = false;
    if (restartTimeoutId) {
      clearTimeout(restartTimeoutId);
      restartTimeoutId = null;
    }
    if (activeSpeechRecognition) {
      try {
        activeSpeechRecognition.onstart = null;
        activeSpeechRecognition.onresult = null;
        activeSpeechRecognition.onerror = null;
        activeSpeechRecognition.onend = null;
        activeSpeechRecognition.stop();
        activeSpeechRecognition.abort();
      } catch (_) {
      }
      activeSpeechRecognition = null;
    }
  }
  function stopDictation(widgetIframe2) {
    isDictating = false;
    cleanupSTT();
    sendDictationEvent(widgetIframe2, { type: "DICTATION_ENDED" });
  }

  // extension-src/content/video-clip.ts
  var activeVideoRecorder = null;
  var activeRecordStream = null;
  var activeAudioStream = null;
  var activeSpeakerBridge = null;
  var activeVideoEl = null;
  var activeAnimFrameId = null;
  var isRecordingVideo = false;
  var pendingSendResponse = null;
  async function startOffscreenSpeakerBridge(audioStream) {
    try {
      const pc = new RTCPeerConnection();
      audioStream.getAudioTracks().forEach((track) => pc.addTrack(track, audioStream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await chrome.runtime.sendMessage({ type: "ENSURE_OFFSCREEN" });
      const answer = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "OFFSCREEN_START_AUDIO_BRIDGE", sdp: offer.sdp },
          (res) => resolve(res)
        );
      });
      if (answer?.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answer.sdp }));
        return pc;
      }
    } catch (err) {
      console.warn("[Annotated Bridge] Speaker bridge failed:", err);
    }
    return null;
  }
  function stopOffscreenSpeakerBridge() {
    if (activeSpeakerBridge) {
      try {
        activeSpeakerBridge.close();
      } catch (_) {
      }
      activeSpeakerBridge = null;
    }
    chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP_AUDIO_BRIDGE" }).catch(() => {
    });
  }
  function stopRecordingNow() {
    if (isRecordingVideo && activeVideoRecorder && activeVideoRecorder.state !== "inactive") {
      try {
        activeVideoRecorder.stop();
      } catch (_) {
      }
    }
  }
  async function capture240pVideoClip(durationSeconds = 15, sendResponse) {
    if (isRecordingVideo) {
      sendResponse({ error: "Video recording already in progress" });
      return;
    }
    const videoEl = document.querySelector("video");
    if (!videoEl) {
      sendResponse({ error: "No video playing on page" });
      return;
    }
    isRecordingVideo = true;
    pendingSendResponse = sendResponse;
    activeVideoEl = videoEl;
    const startTs = Math.floor(videoEl.currentTime || 0);
    const canvas = document.createElement("canvas");
    canvas.width = 426;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    const canvasStream = canvas.captureStream(24);
    const renderLoop = () => {
      if (!isRecordingVideo) return;
      if (ctx && activeVideoEl && !activeVideoEl.paused && !activeVideoEl.ended) {
        ctx.drawImage(activeVideoEl, 0, 0, canvas.width, canvas.height);
      }
      activeAnimFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    let finalStream = canvasStream;
    let audioContext = null;
    try {
      const tabStreamId = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getTabAudioStreamId" }, (res) => {
          resolve(res?.streamId || null);
        });
      });
      if (tabStreamId) {
        activeAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: tabStreamId
            }
          },
          video: false
        });
        activeSpeakerBridge = await startOffscreenSpeakerBridge(activeAudioStream);
        finalStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...activeAudioStream.getAudioTracks()
        ]);
      }
    } catch (err) {
      console.warn("[Annotated Video] Tab audio capture fallback:", err);
      try {
        audioContext = new AudioContext();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        const dest = audioContext.createMediaStreamDestination();
        gain.connect(dest);
        osc.start();
        finalStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]);
      } catch (_) {
      }
    }
    activeRecordStream = finalStream;
    const chunks = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : "video/webm";
      activeVideoRecorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 6e5
      });
      activeVideoRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      activeVideoRecorder.onstop = () => {
        isRecordingVideo = false;
        if (activeAnimFrameId) cancelAnimationFrame(activeAnimFrameId);
        stopOffscreenSpeakerBridge();
        if (activeAudioStream) {
          activeAudioStream.getTracks().forEach((t) => t.stop());
          activeAudioStream = null;
        }
        if (canvasStream) canvasStream.getTracks().forEach((t) => t.stop());
        if (audioContext) audioContext.close().catch(() => {
        });
        const endTs = Math.floor(videoEl.currentTime || startTs + durationSeconds);
        const rawBlob = new Blob(chunks, { type: "video/webm" });
        const durationMs = (endTs - startTs) * 1e3;
        const finishWithBlob = (blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (pendingSendResponse) {
              pendingSendResponse({
                dataUrl: reader.result,
                duration: Math.max(1, endTs - startTs),
                startTs,
                endTs
              });
              pendingSendResponse = null;
            }
          };
          reader.readAsDataURL(blob);
        };
        if (window.ysFixWebmDuration) {
          window.ysFixWebmDuration(rawBlob, durationMs, (fixedBlob) => {
            finishWithBlob(fixedBlob);
          });
        } else {
          finishWithBlob(rawBlob);
        }
      };
      activeVideoRecorder.start(500);
      setTimeout(() => {
        if (isRecordingVideo && activeVideoRecorder && activeVideoRecorder.state !== "inactive") {
          stopRecordingNow();
        }
      }, durationSeconds * 1e3);
    } catch (err) {
      isRecordingVideo = false;
      sendResponse({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  // extension-src/content/widget-host.ts
  var widgetContainer = null;
  var shadowRoot = null;
  var widgetIframe = null;
  var isDragging = false;
  var dragOffset = { x: 0, y: 0 };
  function ensureWidgetContainer() {
    if (widgetContainer && shadowRoot && document.body.contains(widgetContainer)) {
      return { container: widgetContainer, shadow: shadowRoot };
    }
    widgetContainer = document.createElement("div");
    widgetContainer.id = `annotated-layer-${crypto.randomUUID()}`;
    widgetContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483645;
    pointer-events: none;
  `;
    shadowRoot = widgetContainer.attachShadow({ mode: "open" });
    document.body.appendChild(widgetContainer);
    return { container: widgetContainer, shadow: shadowRoot };
  }
  var hasUserDragged = false;
  function positionWidget(iframe) {
    const width = 360;
    const padding = 20;
    const targetX = Math.max(padding, window.innerWidth - width - padding);
    const targetY = padding;
    iframe.style.left = `${targetX}px`;
    iframe.style.top = `${targetY}px`;
    iframe.style.right = "auto";
    iframe.style.bottom = "auto";
  }
  function createWidget() {
    const { shadow } = ensureWidgetContainer();
    if (widgetIframe && shadow.contains(widgetIframe)) {
      widgetIframe.style.display = "block";
      if (!hasUserDragged) {
        positionWidget(widgetIframe);
      }
      return widgetIframe;
    }
    widgetIframe = document.createElement("iframe");
    widgetIframe.src = chrome.runtime.getURL("widget.html");
    widgetIframe.setAttribute("allow", "microphone; display-capture");
    widgetIframe.style.cssText = `
    position: fixed;
    top: 20px;
    width: 360px;
    height: 390px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08);
    z-index: 2147483646;
    pointer-events: auto;
    transition: height 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: block;
    background: transparent;
  `;
    shadow.appendChild(widgetIframe);
    positionWidget(widgetIframe);
    document.addEventListener("mousemove", (e) => {
      if (!isDragging || !widgetIframe) return;
      hasUserDragged = true;
      const width = 360;
      const height = parseInt(widgetIframe.style.height || "390", 10);
      const padding = 8;
      let nextLeft = e.clientX - dragOffset.x;
      let nextTop = e.clientY - dragOffset.y;
      nextLeft = Math.max(padding, Math.min(window.innerWidth - width - padding, nextLeft));
      nextTop = Math.max(padding, Math.min(window.innerHeight - height - padding, nextTop));
      widgetIframe.style.left = `${nextLeft}px`;
      widgetIframe.style.top = `${nextTop}px`;
      widgetIframe.style.right = "auto";
    });
    document.addEventListener("mouseup", () => {
      if (isDragging && widgetIframe) {
        isDragging = false;
        widgetIframe.style.pointerEvents = "auto";
      }
    });
    window.addEventListener("resize", () => {
      if (widgetIframe && !hasUserDragged) {
        positionWidget(widgetIframe);
      }
    });
    return widgetIframe;
  }
  function openAnnotationInWidget(annotation) {
    const iframe = createWidget();
    const sendView = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "VIEW_ANNOTATION", annotation }, "*");
      }
    };
    sendView();
    setTimeout(sendView, 120);
  }
  function notifyWidgetOfSelection(payload) {
    const iframe = createWidget();
    const send = () => {
      try {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "PAGE_INFO_RESPONSE", ...payload }, "*");
        }
      } catch (_) {
      }
    };
    send();
    setTimeout(send, 60);
    setTimeout(send, 200);
    setTimeout(send, 400);
  }
  function setupMessageRouter(onReloadAnnotations) {
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || !data.type) return;
      switch (data.type) {
        case "DRAG_START":
          if (widgetIframe) {
            isDragging = true;
            hasUserDragged = true;
            dragOffset = {
              x: typeof data.clientX === "number" ? data.clientX : 50,
              y: typeof data.clientY === "number" ? data.clientY : 20
            };
            widgetIframe.style.pointerEvents = "none";
          }
          break;
        case "CLOSE_WIDGET":
          if (widgetIframe) {
            widgetIframe.style.display = "none";
            stopDictation(widgetIframe);
          }
          break;
        case "RESIZE_WIDGET":
          if (widgetIframe && data.height) {
            widgetIframe.style.height = `${data.height}px`;
          }
          break;
        case "SEEK_MEDIA":
          if (typeof data.seconds === "number") {
            seekToTimestamp(data.seconds);
          }
          break;
        case "START_DICTATION":
          startDictation(widgetIframe);
          break;
        case "STOP_DICTATION":
          stopDictation(widgetIframe);
          break;
        case "CAPTURE_VIDEO":
          capture240pVideoClip(data.duration || 15, (res) => {
            if (widgetIframe?.contentWindow) {
              widgetIframe.contentWindow.postMessage({ type: "VIDEO_CAPTURED", ...res }, "*");
            }
          });
          break;
        case "STOP_VIDEO":
          stopRecordingNow();
          break;
        case "GET_PAGE_INFO":
          if (widgetIframe?.contentWindow) {
            const info = buildPageInfo();
            widgetIframe.contentWindow.postMessage({ type: "PAGE_INFO_RESPONSE", ...info }, "*");
          }
          break;
        case "SAVE_ANNOTATION":
          onReloadAnnotations();
          break;
        case "RELOAD_ANNOTATIONS":
          onReloadAnnotations();
          break;
        case "OPEN_TAB":
        case "OPEN_URL":
          if (data.url) {
            chrome.runtime.sendMessage({ type: "openTab", url: data.url });
          }
          break;
        case "TAKE_SCREENSHOT":
        case "START_SCREENSHOT_SELECTION":
          startCropScreenshot(
            widgetIframe,
            (dataUrl) => {
              if (widgetIframe?.contentWindow) {
                widgetIframe.contentWindow.postMessage({ type: "SCREENSHOT_CAPTURED", dataUrl }, "*");
              }
            },
            (error) => {
              if (widgetIframe?.contentWindow) {
                widgetIframe.contentWindow.postMessage({ type: "SCREENSHOT_CAPTURED", error }, "*");
              }
            }
          );
          break;
      }
    });
  }

  // extension-src/content/index.ts
  var state = {
    annotations: [],
    profiles: {}
  };
  var domMutationDebounce = null;
  async function loadAnnotations() {
    const currentKey = pageKey();
    const vId = extractYouTubeVideoId(location.href);
    try {
      let url = `${SUPABASE_CONFIG.url}/rest/v1/annotations?select=*`;
      if (vId) {
        url += `&url=ilike.*${encodeURIComponent(vId)}*`;
      } else {
        url += `&url=ilike.*${encodeURIComponent(location.origin + location.pathname)}*`;
      }
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });
      const items = await res.json();
      if (Array.isArray(items)) {
        state.annotations = items;
        const userIds = Array.from(new Set(items.map((a) => a.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          try {
            const profRes = await fetch(
              `${SUPABASE_CONFIG.url}/rest/v1/profiles?id=in.(${userIds.join(",")})`,
              {
                headers: {
                  apikey: SUPABASE_CONFIG.anonKey,
                  Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`
                }
              }
            );
            const profList = await profRes.json();
            if (Array.isArray(profList)) {
              profList.forEach((p) => {
                if (p.id) state.profiles[p.id] = p;
              });
            }
          } catch (_) {
          }
        }
        renderAllPending();
        return;
      }
    } catch (err) {
      console.warn("[Annotated Content] Supabase load error:", err);
    }
    chrome.storage.local.get(currentKey, (data) => {
      state.annotations = data[currentKey] || [];
      renderAllPending();
    });
  }
  function renderAllPending() {
    state.annotations.forEach((ann) => renderHighlight(ann));
    renderYouTubeProgressBarMarkers(
      state.annotations,
      (ts) => {
        const v = document.querySelector("video");
        if (v) v.currentTime = ts;
      },
      (ann) => openAnnotationInWidget(ann)
    );
    renderYouTubeVideoTag(
      state.annotations,
      state.profiles,
      (ts) => {
        const v = document.querySelector("video");
        if (v) v.currentTime = ts;
      },
      (ann) => openAnnotationInWidget(ann)
    );
  }
  function init() {
    injectHighlightStyles();
    setupMessageRouter(() => loadAnnotations());
    const handleSelection = () => {
      setTimeout(() => {
        recordSelection((payload) => {
          if (payload.quote) {
            notifyWidgetOfSelection(payload);
          }
        });
      }, 25);
    };
    document.addEventListener("mouseup", (e) => {
      if (e.button !== 0) return;
      handleSelection();
    });
    document.addEventListener("keyup", (e) => {
      if (e.shiftKey || e.key.startsWith("Arrow")) {
        handleSelection();
      }
    });
    document.addEventListener(
      "mouseover",
      (e) => {
        const target = e.target?.closest(".annotated-highlight");
        if (!target) return;
        const ann = highlightMap.get(target);
        if (ann) {
          const { shadow } = ensureWidgetContainer();
          const prof = ann.user_id ? state.profiles[ann.user_id] : void 0;
          showHoverBubble(target, ann, prof, shadow, (a) => openAnnotationInWidget(a));
        }
      },
      true
    );
    document.addEventListener(
      "mouseout",
      (e) => {
        const target = e.target?.closest(".annotated-highlight");
        if (target) hideHoverBubble();
      },
      true
    );
    document.addEventListener(
      "click",
      (e) => {
        const target = e.target?.closest(".annotated-highlight");
        if (target) {
          const ann = highlightMap.get(target);
          if (ann) openAnnotationInWidget(ann);
        }
      },
      true
    );
    const observer = new MutationObserver(() => {
      if (domMutationDebounce) clearTimeout(domMutationDebounce);
      domMutationDebounce = setTimeout(() => {
        renderAllPending();
      }, 150);
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });
      });
    }
    [300, 700, 1500, 3e3].forEach((ms) => {
      setTimeout(renderAllPending, ms);
    });
    setInterval(() => {
      if (location.hostname.includes("youtube.com")) {
        renderYouTubeProgressBarMarkers(
          state.annotations,
          (ts) => {
            const v = document.querySelector("video");
            if (v) v.currentTime = ts;
          },
          (ann) => openAnnotationInWidget(ann)
        );
        renderYouTubeVideoTag(
          state.annotations,
          state.profiles,
          (ts) => {
            const v = document.querySelector("video");
            if (v) v.currentTime = ts;
          },
          (ann) => openAnnotationInWidget(ann)
        );
      }
    }, 1e3);
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "TOGGLE_WIDGET") {
        if (!widgetIframe || widgetIframe.style.display === "none") {
          createWidget();
        } else {
          widgetIframe.style.display = "none";
        }
        sendResponse({ ok: true });
        return true;
      }
      if (message.type === "openWidget") {
        const info = buildPageInfo();
        notifyWidgetOfSelection(info);
        sendResponse({ ok: true });
        return true;
      }
      if (message.type === "getPageInfo") {
        sendResponse(buildPageInfo());
        return true;
      }
      if (message.type === "saveAnnotation" && message.annotation) {
        state.annotations.push(message.annotation);
        renderAllPending();
        sendResponse({ ok: true });
        return true;
      }
    });
    const onYouTubeNavigation = () => {
      setTimeout(() => {
        loadAnnotations();
      }, 300);
    };
    window.addEventListener("yt-navigate-finish", onYouTubeNavigation);
    window.addEventListener("yt-page-data-updated", onYouTubeNavigation);
    window.addEventListener("spfdone", onYouTubeNavigation);
    loadAnnotations();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
