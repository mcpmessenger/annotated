"use strict";
(() => {
  // extension-src/shared/dom.ts
  var $ = (sel, root = document) => root.querySelector(sel);
  var $$ = (sel, root = document) => root.querySelectorAll(sel);

  // extension-src/shared/config.ts
  var SUPABASE_CONFIG = {
    url: "https://dajadbvlldrmgzztdksn.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU"
  };
  var SITE_URL = "https://annotated-repo.vercel.app";
  var FACTCHECK_API_URL = `${SITE_URL}/api/ai/factcheck`;

  // extension-src/shared/supabase.ts
  var SupabaseClient = class {
    constructor(url = SUPABASE_CONFIG.url, key = SUPABASE_CONFIG.anonKey) {
      this.token = null;
      this.url = url;
      this.key = key;
    }
    headers(extra = {}) {
      return {
        "Content-Type": "application/json",
        apikey: this.key,
        Authorization: `Bearer ${this.token || this.key}`,
        ...extra
      };
    }
    async getAuthHeaders(extra = {}) {
      if (!this.token) {
        await this.restoreSession();
      }
      return this.headers(extra);
    }
    from(table) {
      const base = `${this.url}/rest/v1/${table}`;
      return {
        select: (cols = "*") => ({
          eq: (col, val) => ({
            order: (ord, opts = {}) => fetch(
              `${base}?select=${cols}&${col}=eq.${encodeURIComponent(val)}&order=${ord}${opts.ascending === false ? ".desc" : ""}`,
              { headers: this.headers({ Prefer: "return=representation" }) }
            ).then((r) => r.json()),
            execute: () => fetch(`${base}?select=${cols}&${col}=eq.${encodeURIComponent(val)}`, {
              headers: this.headers()
            }).then((r) => r.json())
          }),
          ilike: (col, pattern) => ({
            execute: () => fetch(`${base}?select=${cols}&${col}=ilike.${encodeURIComponent(pattern)}`, {
              headers: this.headers()
            }).then((r) => r.json())
          }),
          order: (ord, opts = {}) => ({
            limit: (n) => ({
              execute: () => fetch(`${base}?select=${cols}&order=${ord}${opts.ascending === false ? ".desc" : ""}&limit=${n}`, {
                headers: this.headers()
              }).then((r) => r.json())
            })
          }),
          execute: () => fetch(`${base}?select=${cols}`, { headers: this.headers() }).then((r) => r.json())
        }),
        insert: (data) => fetch(base, {
          method: "POST",
          headers: this.headers({ Prefer: "return=representation" }),
          body: JSON.stringify(data)
        }).then((r) => r.json()),
        delete: () => ({
          eq: (col, val) => ({
            execute: () => fetch(`${base}?${col}=eq.${encodeURIComponent(val)}`, {
              method: "DELETE",
              headers: this.headers()
            }).then((r) => r.json())
          })
        }),
        update: (data) => ({
          eq: (col, val) => ({
            eq: (col2, val2) => ({
              execute: () => fetch(`${base}?${col}=eq.${encodeURIComponent(val)}&${col2}=eq.${encodeURIComponent(String(val2))}`, {
                method: "PATCH",
                headers: this.headers({ Prefer: "return=representation" }),
                body: JSON.stringify(data)
              }).then((r) => r.json())
            })
          })
        })
      };
    }
    async uploadMedia(dataUrl, fileName) {
      if (!this.token) throw new Error("Not authenticated");
      const [header, base64] = dataUrl.split(",");
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${Date.now()}_${safeName}`;
      const res = await fetch(`${this.url}/storage/v1/object/annotation-media/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": mimeType,
          "x-upsert": "false"
        },
        body: blob
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed (${res.status})`);
      }
      return `${this.url}/storage/v1/object/public/annotation-media/${path}`;
    }
    async signInWithGoogle() {
      return new Promise((resolve, reject) => {
        const redirectUrl = chrome.identity.getRedirectURL();
        const authUrl = `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            const msg = chrome.runtime.lastError?.message || "Auth cancelled";
            reject(msg);
            return;
          }
          try {
            const url = new URL(responseUrl);
            const params = new URLSearchParams(url.hash ? url.hash.slice(1) : url.search.slice(1));
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token") || void 0;
            const expires_in = parseInt(params.get("expires_in") || "3600", 10);
            const error = params.get("error_description") || params.get("error");
            if (error) {
              reject(error);
              return;
            }
            if (!access_token) {
              reject("No token returned.");
              return;
            }
            const session = {
              access_token,
              refresh_token,
              expires_at: Math.floor(Date.now() / 1e3) + expires_in
            };
            this.token = access_token;
            await chrome.storage.local.set({ supabase_session: session });
            resolve(session);
          } catch (err) {
            reject(err instanceof Error ? err.message : String(err));
          }
        });
      });
    }
    async signInWithTwitter() {
      throw new Error("Twitter sign-in is coming soon.");
    }
    async signOut() {
      if (this.token) {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: "POST",
          headers: this.headers()
        }).catch(() => {
        });
      }
      this.token = null;
      await chrome.storage.local.remove("supabase_session");
    }
    async restoreSession() {
      const data = await chrome.storage.local.get("supabase_session");
      const session = data.supabase_session;
      if (session?.access_token) {
        const issuedAt = session.expires_at || 0;
        if (Date.now() / 1e3 < issuedAt) {
          this.token = session.access_token;
          return session;
        }
        if (session.refresh_token) {
          try {
            const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: this.key },
              body: JSON.stringify({ refresh_token: session.refresh_token })
            });
            const fresh = await res.json();
            if (fresh.access_token) {
              this.token = fresh.access_token;
              await chrome.storage.local.set({ supabase_session: fresh });
              return fresh;
            }
          } catch (_) {
          }
        }
        await chrome.storage.local.remove("supabase_session");
      }
      return null;
    }
    userFromSession(session) {
      if (!session?.access_token) return null;
      try {
        const payload = JSON.parse(atob(session.access_token.split(".")[1]));
        const meta = payload.user_metadata || {};
        const twitterHandle = meta.user_name || meta.preferred_username || meta.screen_name;
        const displayName = meta.full_name || meta.name || twitterHandle || payload.email?.split("@")[0] || "You";
        const email = payload.email || (twitterHandle ? `${twitterHandle}@x.com` : void 0);
        return {
          id: payload.sub,
          email,
          name: displayName,
          avatar: meta.avatar_url || meta.picture || void 0
        };
      } catch (_) {
        return null;
      }
    }
  };
  var supabase = new SupabaseClient();

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
  function initials(name) {
    return (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
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
  function openExternalUrl(url) {
    if (!url) return;
    try {
      if (typeof window !== "undefined" && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "OPEN_TAB", url }, "*");
        return;
      }
    } catch (_) {
    }
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (_) {
    }
  }

  // extension-src/widget/auth.ts
  function showAuth() {
    $("#authScreen")?.classList.remove("hidden");
    $("#mainApp")?.classList.add("hidden");
  }
  function showApp(user, onAppShown) {
    $("#authScreen")?.classList.add("hidden");
    $("#mainApp")?.classList.remove("hidden");
    $("#userMenuWrap")?.classList.remove("hidden");
    const profileName = $("#profileName");
    if (profileName) profileName.textContent = user.name;
    const avatarEl = $("#avatarEl");
    if (avatarEl) {
      avatarEl.textContent = initials(user.name);
      avatarEl.removeAttribute("title");
    }
    const dropdownAvatar = $("#dropdownAvatarEl");
    if (dropdownAvatar) dropdownAvatar.textContent = initials(user.name);
    if (user.avatar) {
      if (avatarEl) {
        avatarEl.style.backgroundImage = `url(${user.avatar})`;
        avatarEl.style.backgroundSize = "cover";
        avatarEl.textContent = "";
      }
      if (dropdownAvatar) {
        dropdownAvatar.style.backgroundImage = `url(${user.avatar})`;
        dropdownAvatar.style.backgroundSize = "cover";
        dropdownAvatar.textContent = "";
      }
    }
    onAppShown(user);
  }
  async function loadUserProfileStats(currentUser2) {
    if (!currentUser2) return;
    const name = currentUser2.email?.split("@")[0] || "user";
    const metaEl = $("#profileMeta");
    if (metaEl) metaEl.textContent = `@${name}`;
    try {
      const notesRes = await supabase.from("annotations").select("id").eq("user_id", currentUser2.id).execute();
      const count = Array.isArray(notesRes) ? notesRes.length : 0;
      const statNotes = $("#statNotes");
      if (statNotes) statNotes.textContent = String(count);
      const followersRes = await supabase.from("follows").select("follower_id").eq("following_id", currentUser2.id).execute();
      const followingRes = await supabase.from("follows").select("following_id").eq("follower_id", currentUser2.id).execute();
      const fCount = Array.isArray(followersRes) ? followersRes.length : 0;
      const flCount = Array.isArray(followingRes) ? followingRes.length : 0;
      const statFollowers = $("#statFollowers");
      if (statFollowers) statFollowers.textContent = String(fCount);
      const statFollowing = $("#statFollowing");
      if (statFollowing) statFollowing.textContent = String(flCount);
    } catch (_) {
    }
  }
  function initAuthHandlers(onUserChanged, onResize) {
    const signInTwitterBtn = $("#signInTwitterBtn");
    if (signInTwitterBtn) {
      signInTwitterBtn.addEventListener("click", async () => {
        signInTwitterBtn.disabled = true;
        signInTwitterBtn.textContent = "Signing in to \u{1D54F}\u2026";
        $("#authError")?.classList.add("hidden");
        try {
          const session = await supabase.signInWithTwitter();
          const user = supabase.userFromSession(session);
          if (user) {
            showApp(user, (u) => onUserChanged(u));
          }
        } catch (err) {
          const authErr = $("#authError");
          if (authErr) {
            authErr.textContent = `Twitter sign-in failed: ${err}`;
            authErr.classList.remove("hidden");
          }
        } finally {
          signInTwitterBtn.disabled = false;
          signInTwitterBtn.innerHTML = `<span style="font-weight: 900; font-size: 15px;">\u{1D54F}</span> Sign in with \u{1D54F}`;
        }
      });
    }
    const signInBtn = $("#signInBtn");
    if (signInBtn) {
      signInBtn.addEventListener("click", async () => {
        signInBtn.disabled = true;
        signInBtn.textContent = "Signing in\u2026";
        $("#authError")?.classList.add("hidden");
        try {
          const session = await supabase.signInWithGoogle();
          const user = supabase.userFromSession(session);
          if (user) {
            showApp(user, (u) => onUserChanged(u));
          }
        } catch (err) {
          const authErr = $("#authError");
          if (authErr) {
            authErr.textContent = `Sign-in failed: ${err}`;
            authErr.classList.remove("hidden");
          }
        } finally {
          signInBtn.disabled = false;
          signInBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Sign in with Google`;
        }
      });
    }
    $("#signOutBtn")?.addEventListener("click", async () => {
      await supabase.signOut();
      onUserChanged(null);
      showAuth();
    });
    $("#profileBtn")?.addEventListener("click", () => {
      chrome.storage.local.get("supabase_session", (data) => {
        const u = supabase.userFromSession(data.supabase_session);
        if (u?.email) {
          const username = u.email.split("@")[0];
          openExternalUrl(`${SITE_URL}/u/${username}`);
        }
      });
    });
  }

  // extension-src/widget/publish.ts
  async function publishAnnotation(payload, onProgress, onSuccess, onError) {
    let media_url = null;
    let media_type = null;
    if (payload.mediaDataUrl) {
      try {
        onProgress("Uploading media\u2026", 40);
        media_url = await supabase.uploadMedia(payload.mediaDataUrl, payload.mediaFileName || "media");
        media_type = payload.mediaType;
        onProgress("Media uploaded", 100);
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        onError(`Media upload failed: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
    }
    if (payload.videoClipBlob) {
      try {
        const fileName = `video_${Date.now()}.webm`;
        const uploadRes = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/annotation-media/${fileName}`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_CONFIG.anonKey,
            Authorization: `Bearer ${supabase.token || SUPABASE_CONFIG.anonKey}`,
            "Content-Type": "video/webm"
          },
          body: payload.videoClipBlob
        });
        if (uploadRes.ok) {
          media_url = `${SUPABASE_CONFIG.url}/storage/v1/object/public/annotation-media/${fileName}`;
          media_type = "video";
        }
      } catch (err) {
        console.error("[VideoUpload] Error:", err);
      }
    }
    let audio_url = null;
    if (payload.recordedAudioBlob) {
      try {
        const fileName = `audio_${Date.now()}.webm`;
        const uploadRes = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/annotation-media/${fileName}`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_CONFIG.anonKey,
            Authorization: `Bearer ${supabase.token || SUPABASE_CONFIG.anonKey}`,
            "Content-Type": "audio/webm"
          },
          body: payload.recordedAudioBlob
        });
        if (uploadRes.ok) {
          audio_url = `${SUPABASE_CONFIG.url}/storage/v1/object/public/annotation-media/${fileName}`;
        }
      } catch (err) {
        console.error("[AudioUpload] Error:", err);
      }
    }
    const safeQuote = payload.quote && payload.quote.trim() || (payload.videoClipBlob ? `\u{1F3AC} Video Clip (${payload.page.title || "Video"})` : media_url ? `Attachment: ${payload.page.title || "Media"}` : payload.page.title || "Page Annotation");
    const allowedIntents = ["\u{1F525}", "\u{1F914}", "\u{1F4A1}", "\u{1F4AF}", "\u{1F44E}"];
    const safeIntent = payload.intent && allowedIntents.includes(payload.intent) ? payload.intent : "\u{1F4A1}";
    let safeComment = payload.comment.trim() || (payload.videoClipBlob ? "Shared a video clip" : "Annotation");
    if (payload.videoStartTs != null && payload.videoEndTs != null) {
      const fmt = (ts) => {
        const m = Math.floor(ts / 60);
        const s = Math.floor(ts % 60);
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      };
      safeComment += `

[\u23F1\uFE0F ${fmt(payload.videoStartTs)} - ${fmt(payload.videoEndTs)}]`;
    }
    let publishUrl = payload.page.url || location.href;
    if (payload.currentMediaTimestamp != null) {
      if (publishUrl.includes("youtube.com") && !publishUrl.includes("&t=") && !publishUrl.includes("?t=")) {
        publishUrl += (publishUrl.includes("?") ? "&" : "?") + `t=${payload.currentMediaTimestamp}s`;
      } else if (!publishUrl.includes("#t=") && !publishUrl.includes("youtube.com")) {
        publishUrl += `#t=${payload.currentMediaTimestamp}`;
      }
    }
    const annotation = {
      audio_url: audio_url || void 0,
      media_url: media_url || void 0,
      media_type: media_type || (media_url ? payload.mediaType : null),
      quote: safeQuote,
      comment: safeComment,
      intent: safeIntent,
      page_title: payload.page.title || "Page",
      url: publishUrl,
      hostname: payload.page.hostname || "youtube.com",
      user_id: payload.currentUser.id,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    let savedRow = null;
    try {
      const res = await supabase.from("annotations").insert(annotation);
      if (res.code || res.error || res.message) {
        onError(`DB Error: ${res.message || res.error || JSON.stringify(res)}`);
        return;
      }
      if (Array.isArray(res) && res[0]) {
        savedRow = res[0];
      } else if (res && res.id) {
        savedRow = res;
      }
    } catch (err) {
      onError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const realId = savedRow?.id || crypto.randomUUID();
    const realSlug = savedRow?.slug || realId;
    const localAnnotation = { ...annotation, id: realId, slug: realSlug };
    const key = pageKey(publishUrl);
    chrome.storage.local.get(key, (data) => {
      const items = [...data[key] || [], localAnnotation];
      chrome.storage.local.set({ [key]: items }, () => {
        onSuccess(localAnnotation);
      });
    });
    try {
      chrome.runtime.sendMessage({ type: "saveAnnotation", annotation: localAnnotation }).catch(() => {
      });
    } catch (_) {
    }
    try {
      window.parent.postMessage({ type: "SAVE_ANNOTATION", annotation: localAnnotation }, "*");
    } catch (_) {
    }
    try {
      setTimeout(() => {
        window.parent.postMessage({ type: "RELOAD_ANNOTATIONS" }, "*");
      }, 400);
    } catch (_) {
    }
  }

  // extension-src/widget/factcheck.ts
  async function callFactCheckApi(payload) {
    const res = await fetch(FACTCHECK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorText = await res.text();
      try {
        const errJson = JSON.parse(errorText);
        throw new Error(errJson.error || `Fact-check error (${res.status})`);
      } catch (e) {
        if (e?.message && !e.message.startsWith("Fact-check error")) throw e;
        throw new Error(`Fact check request failed: ${res.statusText || res.status}`);
      }
    }
    return await res.json();
  }
  function wireFactCheck(ann, pageTitle, pageUrl) {
    const factBox = $("#detailFactCheckBox");
    if (factBox) factBox.style.display = "none";
    const factBtn = $("#detailFactCheckBtn");
    if (!factBtn) return;
    factBtn.onclick = async (e) => {
      e.stopPropagation();
      const fb = $("#detailFactCheckBox");
      const ft = $("#detailFactCheckText");
      const fbadge = $("#detailFactCheckBadge");
      const fnote = $("#detailFactCheckCommunityNote");
      const ftweet = $("#detailFactCheckTweetBtn");
      if (!fb) return;
      if (fb.style.display === "block") {
        fb.style.display = "none";
        return;
      }
      fb.style.display = "block";
      if (fbadge) {
        fbadge.textContent = "ANALYZING";
        fbadge.style.color = "var(--muted)";
      }
      if (ft) ft.textContent = "Analyzing claim and context with Google Gemini...";
      if (fnote) fnote.style.display = "none";
      if (ftweet) ftweet.style.display = "none";
      try {
        const data = await callFactCheckApi({
          quote: ann.quote || ann.quote_text,
          commentary: ann.comment || ann.commentary,
          sourceUrl: ann.url || pageUrl,
          sourceTitle: ann.title || pageTitle,
          timestamp: ann.media_timestamp,
          mediaUrl: ann.media_url
        });
        if (fbadge) {
          fbadge.textContent = (data.verdict || "ANALYZED").replace("_", " ");
          fbadge.style.color = data.verdict === "VERIFIED" ? "#22c55e" : data.verdict === "MISLEADING" || data.verdict === "FALSE" ? "#ef4444" : "#eab308";
        }
        if (ft) {
          ft.innerHTML = `<strong>${escapeHtml(data.headline || "")}</strong><br><span style="font-size:10px; color:var(--muted);">${escapeHtml(data.explanation || "")}</span>`;
        }
        if (data.communityNote && fnote) {
          fnote.textContent = data.communityNote;
          fnote.style.display = "block";
        }
        if (data.tweetIntentUrl && ftweet) {
          ftweet.href = data.tweetIntentUrl;
          ftweet.style.display = "inline-block";
        }
      } catch (err) {
        if (ft) {
          ft.textContent = `Fact-check error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    };
    const closeBtn = $("#detailFactCheckCloseBtn");
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        const fb = $("#detailFactCheckBox");
        if (fb) fb.style.display = "none";
      };
    }
  }

  // extension-src/widget/composer.ts
  var composerState = {
    quote: "",
    intent: null,
    mediaDataUrl: null,
    mediaType: null,
    mediaFileName: null,
    videoClipBlob: null,
    videoStartTs: null,
    videoEndTs: null,
    recordedAudioBlob: null,
    currentMediaTimestamp: null
  };
  function getComposerHeight() {
    let base = 390;
    if (composerState.videoClipBlob) {
      base = 630;
    } else if (composerState.mediaDataUrl) {
      base = 510;
    }
    const factBox = $("#composerFactCheckBox");
    if (factBox && factBox.style.display !== "none") {
      base += 140;
      const fnote = $("#composerFactCheckCommunityNote");
      if (fnote && fnote.style.display !== "none") {
        base += 35;
      }
    }
    return base;
  }
  function hideComposerFactCheck(onResize) {
    const fb = $("#composerFactCheckBox");
    if (fb) fb.style.display = "none";
    if (onResize) onResize(getComposerHeight());
  }
  function updatePublishButton() {
    const commentEl = $("#comment");
    const c = commentEl ? commentEl.value.trim() : "";
    const canPublish = c.length > 0 || !!composerState.videoClipBlob || !!composerState.mediaDataUrl || !!composerState.recordedAudioBlob || !!composerState.quote;
    const pubBtn = $("#publishBtn");
    if (pubBtn) {
      pubBtn.disabled = !canPublish;
    }
  }
  function setQuote(value) {
    composerState.quote = value;
    const qEl = $("#quote");
    if (qEl) {
      qEl.textContent = composerState.quote ? `"${composerState.quote}"` : "Select text on any page to anchor a comment here.";
    }
    updatePublishButton();
  }
  function setMedia(dataUrl, type, name, onResize) {
    composerState.mediaDataUrl = dataUrl;
    composerState.mediaType = type;
    composerState.mediaFileName = name;
    const previewImg = $("#previewImg");
    const previewVideo = $("#previewVideo");
    const mediaPreviewIcon = $("#mediaPreviewIcon");
    const previewName = $("#previewName");
    const mediaPreview = $("#mediaPreview");
    if (previewImg) previewImg.classList.add("hidden");
    if (previewVideo) previewVideo.classList.add("hidden");
    if (type === "video") {
      if (previewVideo) {
        previewVideo.src = dataUrl;
        previewVideo.classList.remove("hidden");
      }
      if (mediaPreviewIcon) mediaPreviewIcon.textContent = "\u{1F3AC}";
    } else {
      if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.classList.remove("hidden");
      }
      if (mediaPreviewIcon) mediaPreviewIcon.textContent = "\u{1F4F8}";
    }
    if (previewName) {
      previewName.textContent = name.length > 25 ? `${name.slice(0, 22)}...` : name;
    }
    if (mediaPreview) mediaPreview.classList.remove("hidden");
    onResize(getComposerHeight());
    updatePublishButton();
  }
  function removeMedia(onResize) {
    composerState.mediaDataUrl = null;
    composerState.mediaType = null;
    composerState.mediaFileName = null;
    const previewImg = $("#previewImg");
    const previewVideo = $("#previewVideo");
    const mediaInput = $("#mediaInput");
    const mediaPreview = $("#mediaPreview");
    if (previewImg) previewImg.src = "";
    if (previewVideo) previewVideo.src = "";
    if (mediaInput) mediaInput.value = "";
    if (mediaPreview) mediaPreview.classList.add("hidden");
    onResize(getComposerHeight());
    updatePublishButton();
  }
  function clearVideo(onResize) {
    composerState.videoClipBlob = null;
    const videoTrimmerBox = $("#videoTrimmerBox");
    const videoPreviewEl = $("#videoPreviewEl");
    const clipVideoBtn = $("#clipVideoBtn");
    if (videoTrimmerBox) videoTrimmerBox.classList.add("hidden");
    if (videoPreviewEl) {
      videoPreviewEl.pause();
      videoPreviewEl.src = "";
    }
    if (clipVideoBtn) {
      clipVideoBtn.innerText = "\u{1F3A5}";
      clipVideoBtn.classList.remove("recording");
    }
    onResize(getComposerHeight());
    updatePublishButton();
  }
  function showComposer(onResize) {
    $("#annotationDetailCard")?.classList.add("hidden");
    $("#composerSection")?.classList.remove("hidden");
    onResize(getComposerHeight());
  }
  function initComposer(getCurrentUser, getPage, onResize, onPublished) {
    const commentEl = $("#comment");
    const counterEl = $("#counter");
    const publishBtn = $("#publishBtn");
    const statusEl = $("#status");
    commentEl?.addEventListener("input", (e) => {
      const val = e.target.value;
      if (counterEl) counterEl.textContent = String(val.length);
      updatePublishButton();
    });
    const emojiButtons = $$(".emoji-btn, [data-intent]");
    emojiButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const emoji = btn.dataset.emoji || btn.dataset.intent || btn.textContent?.trim();
        const isAlreadyActive = btn.classList.contains("active");
        emojiButtons.forEach((b) => {
          b.classList.remove("active");
          b.style.background = "";
          b.style.borderRadius = "";
        });
        if (isAlreadyActive) {
          composerState.intent = null;
        } else {
          btn.classList.add("active");
          btn.style.background = "var(--yellow)";
          btn.style.borderRadius = "6px";
          composerState.intent = emoji || null;
        }
        updatePublishButton();
      });
    });
    const scBtn = $("#screenshotBtn");
    if (scBtn) {
      scBtn.innerHTML = "\u{1F4F8}";
      scBtn.addEventListener("click", () => {
        if (window.parent !== window) {
          window.parent.postMessage({ type: "TAKE_SCREENSHOT" }, "*");
        } else {
          chrome.runtime.sendMessage({ type: "CAPTURE_SCREENSHOT" }, (response) => {
            if (response?.dataUrl) {
              setMedia(response.dataUrl, "image", `screenshot_${Date.now()}.png`, onResize);
            }
          });
        }
      });
    }
    $("#uploadBtn")?.addEventListener("click", () => $("#mediaInput")?.click());
    $("#mediaInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const type = file.type.startsWith("video/") ? "video" : "image";
        setMedia(ev.target?.result, type, file.name, onResize);
      };
      reader.readAsDataURL(file);
    });
    $("#removeMedia")?.addEventListener("click", () => removeMedia(onResize));
    const clipVideoBtn = $("#clipVideoBtn");
    let isVideoRecording = false;
    clipVideoBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (isVideoRecording) {
        isVideoRecording = false;
        clipVideoBtn.innerText = "\u23F3";
        clipVideoBtn.classList.remove("recording");
        window.parent.postMessage({ type: "STOP_VIDEO" }, "*");
        chrome.runtime.sendMessage({ type: "stopVideo" }).catch(() => {
        });
      } else {
        isVideoRecording = true;
        clipVideoBtn.innerText = "\u{1F6D1}";
        clipVideoBtn.classList.add("recording");
        window.parent.postMessage({ type: "CAPTURE_VIDEO", duration: 90 }, "*");
        chrome.runtime.sendMessage({ type: "captureVideo", duration: 90 }).catch(() => {
        });
      }
    });
    $("#clearVideoBtn")?.addEventListener("click", () => clearVideo(onResize));
    $("#removeMediaBtn")?.addEventListener("click", () => clearVideo(onResize));
    const trimStartInput = $("#trimStartInput");
    const trimEndInput = $("#trimEndInput");
    const trimDurationLabel = $("#trimDurationLabel");
    const updateTrim = () => {
      if (!trimStartInput || !trimEndInput || !trimDurationLabel) return;
      let start = parseInt(trimStartInput.value, 10) || 0;
      let end = parseInt(trimEndInput.value, 10) || 15;
      if (end - start > 90) end = start + 90;
      if (end <= start) end = start + 1;
      trimEndInput.value = String(end);
      trimDurationLabel.innerText = `${end - start}s`;
    };
    trimStartInput?.addEventListener("change", updateTrim);
    trimEndInput?.addEventListener("change", updateTrim);
    let isDictating = false;
    let baseComment = "";
    const dictateBtn = $("#dictateBtn");
    dictateBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (isDictating) {
        isDictating = false;
        dictateBtn.classList.remove("recording");
        window.parent.postMessage({ type: "STOP_DICTATION" }, "*");
      } else {
        isDictating = true;
        baseComment = commentEl ? commentEl.value : "";
        if (baseComment && !baseComment.endsWith(" ") && !baseComment.endsWith("\n")) {
          baseComment += " ";
        }
        dictateBtn.classList.add("recording");
        window.parent.postMessage({ type: "START_DICTATION" }, "*");
      }
    });
    const composerFactCheckBtn = $("#composerFactCheckBtn");
    const composerFactCheckBox = $("#composerFactCheckBox");
    const composerFactCheckBadge = $("#composerFactCheckBadge");
    const composerFactCheckText = $("#composerFactCheckText");
    const composerFactCheckNote = $("#composerFactCheckCommunityNote");
    const composerFactCheckCloseBtn = $("#composerFactCheckCloseBtn");
    composerFactCheckCloseBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      hideComposerFactCheck(onResize);
    });
    composerFactCheckBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const quote = composerState.quote.trim();
      const comment = commentEl ? commentEl.value.trim() : "";
      if (!quote && !comment) {
        if (statusEl) {
          statusEl.textContent = "Select text on the page or write a comment to fact check!";
          setTimeout(() => {
            if (statusEl.textContent && statusEl.textContent.includes("Select text")) statusEl.textContent = "";
          }, 3500);
        }
        commentEl?.focus();
        return;
      }
      if (composerFactCheckBox) {
        composerFactCheckBox.style.display = "block";
      }
      if (composerFactCheckBadge) {
        composerFactCheckBadge.textContent = "ANALYZING";
        composerFactCheckBadge.style.color = "var(--muted)";
      }
      if (composerFactCheckText) {
        composerFactCheckText.textContent = "Analyzing claim and context with Google Gemini...";
      }
      if (composerFactCheckNote) {
        composerFactCheckNote.style.display = "none";
      }
      onResize(getComposerHeight());
      try {
        const pageCtx = getPage();
        const data = await callFactCheckApi({
          quote,
          commentary: comment,
          sourceUrl: pageCtx.url || location.href,
          sourceTitle: pageCtx.title || document.title,
          timestamp: composerState.videoStartTs ?? composerState.currentMediaTimestamp ?? null,
          mediaUrl: composerState.mediaDataUrl ?? null
        });
        if (composerFactCheckBadge) {
          composerFactCheckBadge.textContent = (data.verdict || "ANALYZED").replace("_", " ");
          composerFactCheckBadge.style.color = data.verdict === "VERIFIED" ? "#22c55e" : data.verdict === "MISLEADING" || data.verdict === "FALSE" ? "#ef4444" : "#eab308";
        }
        if (composerFactCheckText) {
          composerFactCheckText.innerHTML = `<strong>${escapeHtml(data.headline || "")}</strong><br><span style="font-size:10px; color:var(--muted);">${escapeHtml(data.explanation || "")}</span>`;
        }
        if (data.communityNote && composerFactCheckNote) {
          composerFactCheckNote.textContent = data.communityNote;
          composerFactCheckNote.style.display = "block";
        }
        onResize(getComposerHeight());
      } catch (err) {
        if (composerFactCheckText) {
          composerFactCheckText.textContent = `Fact check note: ${err instanceof Error ? err.message : String(err)}`;
        }
        if (composerFactCheckBadge) {
          composerFactCheckBadge.textContent = "NOTICE";
          composerFactCheckBadge.style.color = "#eab308";
        }
        onResize(getComposerHeight());
      }
    });
    publishBtn?.addEventListener("click", async () => {
      const user = getCurrentUser();
      if (!user) return;
      publishBtn.disabled = true;
      publishBtn.textContent = "Publishing\u2026";
      const payload = {
        comment: commentEl ? commentEl.value : "",
        quote: composerState.quote,
        intent: composerState.intent,
        mediaDataUrl: composerState.mediaDataUrl,
        mediaType: composerState.mediaType,
        mediaFileName: composerState.mediaFileName,
        videoClipBlob: composerState.videoClipBlob,
        videoStartTs: composerState.videoStartTs,
        videoEndTs: composerState.videoEndTs,
        recordedAudioBlob: composerState.recordedAudioBlob,
        currentMediaTimestamp: composerState.currentMediaTimestamp,
        page: getPage(),
        currentUser: user
      };
      await publishAnnotation(
        payload,
        (msg, _pct) => {
          if (statusEl) statusEl.textContent = msg;
        },
        () => {
          if (commentEl) commentEl.value = "";
          if (counterEl) counterEl.textContent = "0";
          setQuote("");
          removeMedia(onResize);
          clearVideo(onResize);
          hideComposerFactCheck(onResize);
          emojiButtons.forEach((b) => {
            b.classList.remove("active");
            b.style.background = "";
          });
          composerState.intent = null;
          publishBtn.textContent = "Publish";
          updatePublishButton();
          if (statusEl) {
            statusEl.textContent = "Published!";
            setTimeout(() => {
              if (statusEl.textContent === "Published!") statusEl.textContent = "";
            }, 4e3);
          }
          onPublished();
        },
        (err) => {
          publishBtn.disabled = false;
          publishBtn.textContent = "Publish";
          if (statusEl) {
            statusEl.textContent = err;
            setTimeout(() => {
              if (statusEl.textContent === err) statusEl.textContent = "";
            }, 5e3);
          }
        }
      );
    });
  }

  // extension-src/widget/feed.ts
  function renderFeed(items, page2, currentUser2, onAnnotationDeleted) {
    const currentVId = extractYouTubeVideoId(page2.url);
    const filteredItems = Array.isArray(items) ? items.filter((a) => {
      if (!a) return false;
      if (currentVId) return String(a.url || "").includes(currentVId);
      return true;
    }) : [];
    const countEl = $("#annotationCount");
    if (countEl) {
      countEl.textContent = `${filteredItems.length} annotation${filteredItems.length === 1 ? "" : "s"}`;
    }
    const feedEl = $("#feed");
    if (!feedEl) return;
    if (!filteredItems.length) {
      feedEl.innerHTML = '<div class="empty">Your annotations on this page will appear here.</div>';
      return;
    }
    feedEl.innerHTML = filteredItems.slice().reverse().map((a) => {
      const username = a.username || (a.author_profile?.email ? a.author_profile.email.split("@")[0] : currentUser2?.email ? currentUser2.email.split("@")[0] : "user");
      const targetSlug = String(a.slug || a.id || "");
      const webUrl = targetSlug ? `${SITE_URL}/${encodeURIComponent(username)}/${encodeURIComponent(targetSlug)}` : SITE_URL;
      const ts = extractTimestamp(a.url, a.comment || a.commentary);
      const tsStr = ts != null ? formatSeconds(ts) : "";
      return `
      <article class="annotation" data-id="${escapeHtml(a.id || "")}">
        <div class="aheader" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:700; font-size:12px; color:#ffd21a;">${escapeHtml(a.intent || "\u{1F4A1}")} ${tsStr ? `\u23F1\uFE0F ${tsStr}` : ""}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <a class="web-link" href="${escapeHtml(
        webUrl
      )}" target="_blank" rel="noopener" style="color:#8899a6; text-decoration:none; font-size:12px; font-weight:600;" data-tooltip="Open on Annotated Website">\u2197 View Web</a>
            ${currentUser2 && (a.user_id === currentUser2.id || !a.user_id) ? '<button class="feed-delete-btn" style="background:none; border:none; color:#8899a6; cursor:pointer; font-size:12px; padding:0 2px;" data-tooltip="Delete annotation">\u{1F5D1}\uFE0F</button>' : ""}
          </div>
        </div>
        <div class="aquote" style="cursor:pointer;" data-tooltip="Click to seek video">"${escapeHtml(
        a.quote || a.quote_text || ""
      )}"</div>
        ${a.media_url ? `
          <div class="feed-media-wrap">
            ${a.media_type === "video" || a.media_url.includes(".webm") || a.media_url.includes(".mp4") ? `<video class="feed-media" src="${escapeHtml(a.media_url)}" controls playsinline></video>` : `<img class="feed-media" src="${escapeHtml(a.media_url)}" alt="Annotation media" loading="lazy">`}
          </div>` : ""}
        <div class="acomment">${escapeHtml(a.comment || a.commentary || "")}</div>
        <div class="meta" style="margin-top:6px; display:flex; justify-content:space-between; font-size:11px; color:#8899a6;">
          <span>@${escapeHtml(username)} \xB7 ${new Date(a.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
      </article>`;
    }).join("");
    feedEl.querySelectorAll(".annotation").forEach((el) => {
      const annId = el.dataset.id;
      const ann = filteredItems.find((a) => String(a.id) === String(annId));
      if (!ann) return;
      el.querySelector(".web-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const username = ann.username || (ann.author_profile?.email ? ann.author_profile.email.split("@")[0] : currentUser2?.email ? currentUser2.email.split("@")[0] : "user");
        const targetSlug = String(ann.slug || ann.id || "");
        const webUrl = targetSlug ? `${SITE_URL}/${encodeURIComponent(username)}/${encodeURIComponent(targetSlug)}` : SITE_URL;
        openExternalUrl(webUrl);
      });
      el.querySelector(".feed-delete-btn")?.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this annotation?")) return;
        try {
          await supabase.from("annotations").delete().eq("id", ann.id || "").execute();
        } catch (err) {
          console.warn("[Annotated Delete] Error:", err);
        }
        try {
          const key = pageKey(page2.url);
          chrome.storage.local.get(key, (data) => {
            const stored = (data[key] || []).filter((a) => String(a.id) !== String(ann.id));
            chrome.storage.local.set({ [key]: stored }, () => {
            });
          });
        } catch (_) {
        }
        try {
          window.parent.postMessage({ type: "RELOAD_ANNOTATIONS" }, "*");
        } catch (_) {
        }
        onAnnotationDeleted();
      });
      el.querySelector(".aquote")?.addEventListener("click", () => {
        const ts = extractTimestamp(ann.url, ann.comment || ann.commentary);
        if (ts != null) {
          window.parent.postMessage({ type: "SEEK_MEDIA", seconds: ts }, "*");
        }
      });
    });
  }
  async function loadFeedFromSupabase(page2, currentUser2, onDeleted) {
    if (!currentUser2) {
      renderFeed([], page2, currentUser2, onDeleted);
      return;
    }
    let cleanUrl = page2.url || location.href;
    const currentVId = extractYouTubeVideoId(cleanUrl);
    try {
      let items = null;
      if (currentVId) {
        items = await supabase.from("annotations").select("*").ilike("url", `%${currentVId}%`).execute();
      } else if (cleanUrl) {
        items = await supabase.from("annotations").select("*").ilike("url", `%${cleanUrl}%`).execute();
      }
      if (Array.isArray(items)) {
        renderFeed(items, page2, currentUser2, onDeleted);
        return;
      }
    } catch (err) {
      console.warn("[Annotated Widget] loadFeedFromSupabase error:", err);
    }
    const key = pageKey(cleanUrl);
    chrome.storage.local.get(key, (data) => {
      const localItems = data[key] || [];
      renderFeed(localItems, page2, currentUser2, onDeleted);
    });
  }

  // extension-src/widget/comments.ts
  var currentDetailAnnotationId = null;
  var isCommentDictating = false;
  var baseCommentReply = "";
  async function loadWidgetComments(annotationId, currentUser2) {
    currentDetailAnnotationId = annotationId;
    const listEl = $("#widgetCommentList");
    const countEl = $("#widgetCommentCount");
    if (!listEl) return;
    let activeUser = currentUser2;
    if (!activeUser) {
      try {
        const session = await supabase.restoreSession();
        activeUser = supabase.userFromSession(session);
      } catch (_) {
      }
    }
    if (countEl) countEl.textContent = "\u2026";
    try {
      const res = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/comments?annotation_id=eq.${encodeURIComponent(
          annotationId
        )}&order=created_at.asc`,
        {
          headers: {
            apikey: SUPABASE_CONFIG.anonKey,
            Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`
          }
        }
      );
      const comments = await res.json();
      if (!Array.isArray(comments)) return;
      if (countEl) countEl.textContent = String(comments.length);
      if (comments.length === 0) {
        listEl.innerHTML = '<div style="font-size: 11px; color: var(--muted); text-align: center; padding: 12px 0;">No comments yet. Start the conversation!</div>';
        return;
      }
      const userIds = Array.from(new Set(comments.map((c) => c.user_id).filter(Boolean)));
      const profiles = {};
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
              if (p.id) profiles[p.id] = p;
            });
          }
        } catch (_) {
        }
      }
      const commentIds = comments.map((c) => c.id).filter(Boolean);
      const reactionsMap = {};
      commentIds.forEach((id) => {
        reactionsMap[id] = { counts: {}, userReacted: /* @__PURE__ */ new Set() };
      });
      if (commentIds.length > 0) {
        try {
          const reactRes = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/comment_reactions?comment_id=in.(${commentIds.join(
              ","
            )})&select=comment_id,emoji,user_id`,
            {
              headers: {
                apikey: SUPABASE_CONFIG.anonKey
              }
            }
          );
          const reactRows = await reactRes.json();
          if (Array.isArray(reactRows)) {
            reactRows.forEach((r) => {
              if (reactionsMap[r.comment_id]) {
                reactionsMap[r.comment_id].counts[r.emoji] = (reactionsMap[r.comment_id].counts[r.emoji] || 0) + 1;
                if (activeUser && r.user_id === activeUser.id) {
                  reactionsMap[r.comment_id].userReacted.add(r.emoji);
                }
              }
            });
          }
        } catch (_) {
        }
      }
      const COMMENT_EMOJIS = ["\u{1F525}", "\u{1F914}", "\u{1F4A1}", "\u{1F4AF}", "\u{1F44E}"];
      listEl.innerHTML = comments.map((c) => {
        const isMe = activeUser && c.user_id === activeUser.id;
        const prof = profiles[c.user_id];
        const name = isMe ? "You" : prof?.full_name || prof?.email?.split("@")[0] || "User";
        const handle = prof?.email ? `@${prof.email.split("@")[0]}` : "";
        const avatar = isMe ? activeUser?.avatar : prof?.avatar_url;
        const timeAgo = c.created_at ? new Date(c.created_at).toLocaleDateString() : "";
        const profileSlug = prof?.email ? prof.email.split("@")[0] : "";
        const profileUrl = profileSlug ? `${SITE_URL}/u/${profileSlug}` : "";
        const avatarMarkup = avatar ? `<div class="avatar avatar-clickable" data-profile="${escapeHtml(
          profileUrl
        )}" style="width: 20px; height: 20px; border-radius: 50%; background-image: url('${escapeHtml(
          avatar
        )}'); background-size: cover; background-position: center; flex-shrink: 0; cursor: pointer;"></div>` : `<div class="avatar avatar-clickable" data-profile="${escapeHtml(
          profileUrl
        )}" style="width: 20px; height: 20px; font-size: 9px; flex-shrink: 0; cursor: pointer;">${escapeHtml(
          initials(name)
        )}</div>`;
        const isCommentAuthor = Boolean(activeUser && c.user_id === activeUser.id);
        const commentReactions = reactionsMap[c.id] || { counts: {}, userReacted: /* @__PURE__ */ new Set() };
        const emojiBarHtml = `
          <div class="comment-reactions-bar" style="display: flex; align-items: center; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
            ${COMMENT_EMOJIS.map((emoji) => {
          const count = commentReactions.counts[emoji] || 0;
          const isReacted = commentReactions.userReacted.has(emoji);
          const activeStyle = isReacted ? "background: var(--yellow); border-color: var(--yellow); color: #000; font-weight: 700;" : "background: none; border: 1px solid var(--line); color: var(--ink); font-weight: normal;";
          return `
                <button type="button" class="comment-react-btn" data-comment-id="${escapeHtml(
            c.id
          )}" data-emoji="${emoji}" style="display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 12px; font-size: 10px; cursor: pointer; transition: all 0.15s ease; ${activeStyle}">
                  <span>${emoji}</span>
                  <span class="comment-react-count" style="font-size: 9px; opacity: ${count > 0 ? "1" : "0.6"};">${count}</span>
                </button>
              `;
        }).join("")}
          </div>
        `;
        return `
        <div class="widget-comment-card" data-comment-id="${escapeHtml(c.id)}" style="display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; font-size: 11px; position: relative;">
          ${avatarMarkup}
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
              <strong class="avatar-clickable" data-profile="${escapeHtml(
          profileUrl
        )}" style="color: var(--ink); font-size: 11px; cursor: pointer;">${escapeHtml(
          name
        )} <span style="font-weight: normal; color: var(--muted); font-size: 10px;">${escapeHtml(
          handle
        )}</span></strong>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 9px; color: var(--muted);">${escapeHtml(timeAgo)}</span>
                ${isCommentAuthor ? `<button class="comment-delete-btn" data-comment-id="${escapeHtml(
          c.id
        )}" data-tooltip="Delete comment" data-tooltip-pos="left" style="background: none; border: none; color: var(--muted); cursor: pointer; font-size: 11px; padding: 0 2px; line-height: 1; transition: color 0.15s ease;">&#128465;&#65039;</button>` : ""}
              </div>
            </div>
            <div style="color: var(--ink); line-height: 1.4; word-break: break-word; white-space: pre-wrap;">${escapeHtml(
          c.text || c.content || ""
        )}</div>
            ${emojiBarHtml}
          </div>
        </div>
      `;
      }).join("");
      listEl.querySelectorAll(".avatar-clickable").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const url = el.getAttribute("data-profile");
          if (url) openExternalUrl(url);
        });
      });
      listEl.querySelectorAll(".comment-react-btn").forEach((btnEl) => {
        btnEl.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          let reactUser = activeUser;
          if (!reactUser) {
            try {
              const session = await supabase.restoreSession();
              reactUser = supabase.userFromSession(session);
              if (reactUser) activeUser = reactUser;
            } catch (_) {
            }
          }
          if (!reactUser) {
            alert("Please sign in to react to comments!");
            return;
          }
          const commentId = btnEl.getAttribute("data-comment-id");
          const emoji = btnEl.getAttribute("data-emoji");
          if (!commentId || !emoji) return;
          const countEl2 = btnEl.querySelector(".comment-react-count");
          const curCount = parseInt(countEl2?.textContent || "0", 10);
          const isCurrentlyActive = btnEl.style.background.includes("var(--yellow)");
          if (isCurrentlyActive) {
            btnEl.style.background = "none";
            btnEl.style.borderColor = "var(--line)";
            btnEl.style.color = "var(--ink)";
            btnEl.style.fontWeight = "normal";
            const nextCount = Math.max(0, curCount - 1);
            if (countEl2) {
              countEl2.textContent = String(nextCount);
              countEl2.style.opacity = nextCount > 0 ? "1" : "0.6";
            }
            try {
              const headers = await supabase.getAuthHeaders();
              await fetch(
                `${SUPABASE_CONFIG.url}/rest/v1/comment_reactions?comment_id=eq.${encodeURIComponent(
                  commentId
                )}&user_id=eq.${encodeURIComponent(reactUser.id)}&emoji=eq.${encodeURIComponent(emoji)}`,
                {
                  method: "DELETE",
                  headers
                }
              );
            } catch (_) {
            }
          } else {
            btnEl.style.background = "var(--yellow)";
            btnEl.style.borderColor = "var(--yellow)";
            btnEl.style.color = "#000";
            btnEl.style.fontWeight = "700";
            const nextCount = curCount + 1;
            if (countEl2) {
              countEl2.textContent = String(nextCount);
              countEl2.style.opacity = "1";
            }
            try {
              const headers = await supabase.getAuthHeaders({ Prefer: "resolution=merge-duplicates" });
              await fetch(`${SUPABASE_CONFIG.url}/rest/v1/comment_reactions`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  comment_id: commentId,
                  user_id: reactUser.id,
                  emoji
                })
              });
            } catch (_) {
            }
          }
        });
      });
      listEl.querySelectorAll(".comment-delete-btn").forEach((btnEl) => {
        btnEl.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const commentId = btnEl.getAttribute("data-comment-id");
          if (!commentId) return;
          if (!confirm("Are you sure you want to delete this comment?")) return;
          btnEl.disabled = true;
          try {
            const headers = await supabase.getAuthHeaders();
            const delRes = await fetch(
              `${SUPABASE_CONFIG.url}/rest/v1/comments?id=eq.${encodeURIComponent(commentId)}`,
              {
                method: "DELETE",
                headers
              }
            );
            if (delRes.ok) {
              loadWidgetComments(annotationId, activeUser);
            } else {
              alert("Failed to delete comment.");
              btnEl.disabled = false;
            }
          } catch (err) {
            console.warn("[Annotated Delete Comment] Error:", err);
            btnEl.disabled = false;
          }
        });
      });
    } catch (err) {
      console.warn("[Annotated] loadWidgetComments error:", err);
    }
  }
  function initCommentForm(getCurrentUser, onResize) {
    const form = $("#widgetCommentForm");
    const input = $("#widgetCommentInput");
    const statusEl = $("#widgetCommentStatus");
    const submitBtn = $("#widgetCommentSubmitBtn");
    const micBtn = $("#widgetCommentMicBtn");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        let currentUser2 = getCurrentUser();
        if (!currentUser2) {
          try {
            const session = await supabase.restoreSession();
            currentUser2 = supabase.userFromSession(session);
          } catch (_) {
          }
        }
        if (!currentUser2 || !currentDetailAnnotationId || !input) return;
        const content = input.value.trim();
        if (!content) return;
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) {
          statusEl.textContent = "Posting\u2026";
          statusEl.style.color = "var(--muted)";
        }
        try {
          const headers = await supabase.getAuthHeaders({ Prefer: "return=representation" });
          const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/comments`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              annotation_id: currentDetailAnnotationId,
              user_id: currentUser2.id,
              text: content,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            })
          });
          if (res.ok) {
            input.value = "";
            if (statusEl) statusEl.textContent = "";
            loadWidgetComments(currentDetailAnnotationId, currentUser2);
          } else {
            const err = await res.json().catch(() => ({}));
            if (statusEl) {
              statusEl.textContent = `Error: ${err.message || "Failed to post"}`;
              statusEl.style.color = "#ef4444";
            }
          }
        } catch (err) {
          if (statusEl) {
            statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
            statusEl.style.color = "#ef4444";
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
    if (micBtn) {
      micBtn.addEventListener("click", () => {
        if (isCommentDictating) {
          isCommentDictating = false;
          micBtn.classList.remove("recording");
          window.parent.postMessage({ type: "STOP_DICTATION" }, "*");
        } else {
          isCommentDictating = true;
          baseCommentReply = input?.value || "";
          micBtn.classList.add("recording");
          window.parent.postMessage({ type: "START_DICTATION" }, "*");
        }
      });
    }
  }

  // extension-src/widget/detail.ts
  async function showAnnotationDetail(ann, currentUser2, onBackToComposer, onResize, onDeleted) {
    if (!ann) return;
    let activeUser = currentUser2;
    if (!activeUser) {
      try {
        const session = await supabase.restoreSession();
        activeUser = supabase.userFromSession(session);
      } catch (_) {
      }
    }
    $("#composerSection")?.classList.add("hidden");
    const detailCard = $("#annotationDetailCard");
    if (!detailCard) return;
    detailCard.classList.remove("hidden");
    const detailBack = $("#detailBackBtn");
    if (detailBack) {
      detailBack.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onBackToComposer();
      };
    }
    const isAuthor = Boolean(activeUser && (ann.user_id === activeUser.id || !ann.user_id));
    const deleteBtn = $("#detailDeleteBtn");
    if (deleteBtn) {
      if (isAuthor) {
        deleteBtn.classList.remove("hidden");
        deleteBtn.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!confirm("Are you sure you want to delete this annotation?")) return;
          deleteBtn.disabled = true;
          try {
            if (ann.id) {
              await supabase.from("annotations").delete().eq("id", ann.id).execute();
            }
          } catch (err) {
            console.warn("[Annotated Delete] Error:", err);
          }
          try {
            const key = pageKey(ann.url || location.href);
            chrome.storage.local.get(key, (data) => {
              const stored = (data[key] || []).filter(
                (a) => String(a.id) !== String(ann.id)
              );
              chrome.storage.local.set({ [key]: stored }, () => {
              });
            });
          } catch (_) {
          }
          try {
            window.parent.postMessage({ type: "RELOAD_ANNOTATIONS" }, "*");
          } catch (_) {
          }
          if (onDeleted) {
            onDeleted();
          }
          onBackToComposer();
        };
      } else {
        deleteBtn.classList.add("hidden");
        deleteBtn.onclick = null;
      }
    }
    const qEl = $("#detailQuote");
    if (qEl) qEl.textContent = ann.quote || ann.quote_text || "Annotation";
    const intentEl = $("#detailIntentBadge");
    if (intentEl) intentEl.textContent = ann.intent || "\u{1F4A1}";
    const slug = ann.slug || ann.id;
    const targetUser = ann.username || (ann.author_profile?.email ? ann.author_profile.email.split("@")[0] : currentUser2?.email ? currentUser2.email.split("@")[0] : "user");
    const detailUrl = slug ? `${SITE_URL}/${encodeURIComponent(targetUser)}/${encodeURIComponent(slug)}` : SITE_URL;
    const openWebBtn = $("#detailOpenWebBtn");
    if (openWebBtn) {
      openWebBtn.href = detailUrl;
      openWebBtn.onclick = (e) => {
        e.stopPropagation();
        openExternalUrl(detailUrl);
      };
    }
    const isVideoPage = ann.url && (ann.url.includes("youtube.com") || ann.url.includes("vimeo.com"));
    const hasVideoAttachment = !!(ann.media_url && (ann.media_type === "video" || ann.media_url.includes(".webm") || ann.media_url.includes(".mp4")));
    const explicitCommentTs = ann.comment ? String(ann.comment).match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\]/) : null;
    const showTs = isVideoPage || hasVideoAttachment || !!explicitCommentTs;
    const ts = showTs ? ann.extractedTimestamp != null ? ann.extractedTimestamp : extractTimestamp(ann.url, ann.comment || ann.commentary) : null;
    const tsBadge = $("#detailTimestampBadge");
    const tsText = $("#detailTimestampText");
    if (tsBadge && tsText && ts != null && ts > 0) {
      tsText.textContent = formatSeconds(ts);
      tsBadge.classList.remove("hidden");
      tsBadge.onclick = (e) => {
        e.stopPropagation();
        window.parent.postMessage({ type: "SEEK_MEDIA", seconds: ts }, "*");
      };
    } else if (tsBadge) {
      tsBadge.classList.add("hidden");
    }
    const commentEl = $("#detailComment");
    if (commentEl) commentEl.textContent = ann.comment || ann.commentary || "(No comment)";
    const authorEl = $("#detailAuthorName");
    const avatarEl = $("#detailAvatar");
    const dateEl = $("#detailDate");
    if (dateEl) {
      dateEl.textContent = "\xB7 " + (ann.created_at ? new Date(ann.created_at).toLocaleDateString() : "Recent");
    }
    const applyProfile = (name, handle, avatarUrl) => {
      if (authorEl) {
        authorEl.innerHTML = `${escapeHtml(name)}${handle ? ` <span class="muted" style="font-weight: normal; font-size: 10px;">${escapeHtml(handle)}</span>` : ""}`;
      }
      if (avatarEl) {
        if (avatarUrl) {
          avatarEl.style.backgroundImage = `url(${avatarUrl})`;
          avatarEl.style.backgroundSize = "cover";
          avatarEl.style.backgroundPosition = "center";
          avatarEl.textContent = "";
        } else {
          avatarEl.style.backgroundImage = "none";
          avatarEl.textContent = initials(name);
        }
      }
    };
    if (currentUser2 && (ann.user_id === currentUser2.id || !ann.user_id)) {
      const name = currentUser2.name || (currentUser2.email ? currentUser2.email.split("@")[0] : "You");
      const handle = currentUser2.email ? `@${currentUser2.email.split("@")[0]}` : "";
      applyProfile(name, handle, currentUser2.avatar);
    } else if (ann.author_profile) {
      const prof = ann.author_profile;
      const name = prof.full_name || (prof.email ? prof.email.split("@")[0] : "Annotator");
      const handle = prof.email ? `@${prof.email.split("@")[0]}` : "";
      applyProfile(name, handle, prof.avatar_url);
    } else {
      applyProfile(ann.user_name || "Community Member");
    }
    const mediaBox = $("#detailMediaBox");
    if (mediaBox) {
      mediaBox.innerHTML = "";
      if (ann.media_url && (ann.media_type === "video" || ann.media_url.includes(".webm") || ann.media_url.includes(".mp4"))) {
        mediaBox.innerHTML = `<video src="${escapeHtml(ann.media_url)}" controls playsinline style="width:100%; max-height:160px; display:block;"></video>`;
        mediaBox.classList.remove("hidden");
      } else if (ann.media_url) {
        mediaBox.innerHTML = `<img src="${escapeHtml(ann.media_url)}" style="width:100%; max-height:160px; object-fit:contain; display:block;">`;
        mediaBox.classList.remove("hidden");
      } else if (ann.audio_url) {
        mediaBox.innerHTML = `<audio src="${escapeHtml(ann.audio_url)}" controls style="width:100%; display:block;"></audio>`;
        mediaBox.classList.remove("hidden");
      } else {
        mediaBox.classList.add("hidden");
      }
    }
    const twitterShareBtn = $("#detailTwitterShareBtn");
    if (twitterShareBtn) {
      const tweetText = `Interesting annotation on "${ann.title || "Page"}":
"${(ann.comment || ann.quote || "").slice(0, 90)}..."
`;
      const shareUrl = `${SITE_URL}/annotations/${ann.id}`;
      twitterShareBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
    }
    wireDetailReactions(ann.id || ann.slug || "", activeUser);
    wireFactCheck(ann, ann.title || "Page", ann.url || location.href);
    if (ann.id || ann.slug) loadWidgetComments(ann.id || ann.slug || "", activeUser);
    const hasMedia = !!(ann.media_url || ann.audio_url);
    onResize(hasMedia ? 740 : 660);
  }
  async function wireDetailReactions(annotationId, currentUser2) {
    if (!annotationId) return;
    let activeUser = currentUser2;
    if (!activeUser) {
      try {
        const session = await supabase.restoreSession();
        activeUser = supabase.userFromSession(session);
      } catch (_) {
      }
    }
    const loadReactions = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_CONFIG.url}/rest/v1/annotation_reactions?annotation_id=eq.${encodeURIComponent(
            annotationId
          )}&select=emoji,user_id`,
          { headers: { apikey: SUPABASE_CONFIG.anonKey } }
        );
        const rows = await res.json();
        if (!Array.isArray(rows)) return;
        const counts = {};
        const myReacts = /* @__PURE__ */ new Set();
        rows.forEach((r) => {
          counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          if (activeUser && r.user_id === activeUser.id) myReacts.add(r.emoji);
        });
        document.querySelectorAll(".detail-react-btn").forEach((btnEl) => {
          const btn = btnEl;
          const emoji = btn.dataset.react;
          if (!emoji) return;
          const countEl = btn.querySelector(".react-count");
          if (countEl) countEl.textContent = String(counts[emoji] || 0);
          if (myReacts.has(emoji)) {
            btn.classList.add("react-active");
            btn.style.background = "var(--yellow)";
            btn.style.borderColor = "var(--yellow)";
            btn.style.color = "#000";
            btn.style.fontWeight = "700";
          } else {
            btn.classList.remove("react-active");
            btn.style.background = "none";
            btn.style.borderColor = "var(--line)";
            btn.style.color = "var(--ink)";
            btn.style.fontWeight = "normal";
          }
        });
      } catch (_) {
      }
    };
    document.querySelectorAll(".detail-react-btn").forEach((btnEl) => {
      const btn = btnEl;
      btn.onclick = async (e) => {
        e.stopPropagation();
        let reactUser = activeUser;
        if (!reactUser) {
          try {
            const session = await supabase.restoreSession();
            reactUser = supabase.userFromSession(session);
            if (reactUser) activeUser = reactUser;
          } catch (_) {
          }
        }
        if (!reactUser) {
          alert("Please sign in to react!");
          return;
        }
        const emoji = btn.dataset.react;
        if (!emoji) return;
        const countEl = btn.querySelector(".react-count");
        const curCount = parseInt(countEl?.textContent || "0", 10);
        const isActive = btn.classList.contains("react-active");
        if (isActive) {
          btn.classList.remove("react-active");
          btn.style.background = "none";
          btn.style.borderColor = "var(--line)";
          btn.style.color = "var(--ink)";
          btn.style.fontWeight = "normal";
          const next = Math.max(0, curCount - 1);
          if (countEl) countEl.textContent = String(next);
        } else {
          btn.classList.add("react-active");
          btn.style.background = "var(--yellow)";
          btn.style.borderColor = "var(--yellow)";
          btn.style.color = "#000";
          btn.style.fontWeight = "700";
          const next = curCount + 1;
          if (countEl) countEl.textContent = String(next);
        }
        try {
          const headers = await supabase.getAuthHeaders();
          if (isActive) {
            await fetch(
              `${SUPABASE_CONFIG.url}/rest/v1/annotation_reactions?annotation_id=eq.${encodeURIComponent(
                annotationId
              )}&user_id=eq.${encodeURIComponent(reactUser.id)}&emoji=eq.${encodeURIComponent(emoji)}`,
              {
                method: "DELETE",
                headers
              }
            );
          } else {
            await fetch(`${SUPABASE_CONFIG.url}/rest/v1/annotation_reactions`, {
              method: "POST",
              headers: {
                ...headers,
                Prefer: "resolution=merge-duplicates"
              },
              body: JSON.stringify({ annotation_id: annotationId, user_id: reactUser.id, emoji })
            });
          }
        } catch (err) {
          console.warn("[Annotated Reaction Error]", err);
        }
        loadReactions();
      };
    });
    loadReactions();
  }

  // extension-src/widget/notifications.ts
  var notifPanelOpen = false;
  async function loadNotifications(currentUser2) {
    if (!currentUser2?.id) return;
    const notifBadge = $("#notifBadge");
    const notifList = $("#notifList");
    if (!notifList) return;
    try {
      const res = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20).execute();
      const rows = Array.isArray(res) ? res : [];
      const unread = rows.filter((n) => !n.read).length;
      if (notifBadge) {
        if (unread > 0) {
          notifBadge.textContent = unread > 9 ? "9+" : String(unread);
          notifBadge.style.display = "inline-flex";
        } else {
          notifBadge.style.display = "none";
        }
      }
      if (rows.length === 0) {
        notifList.innerHTML = `<div style="padding:20px; text-align:center; font-size:12px; color:var(--muted); font-style:italic;">You're all caught up!</div>`;
      } else {
        notifList.innerHTML = rows.map((n) => {
          const dot = !n.read ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;flex-shrink:0;margin-top:3px;"></span>' : '<span style="display:inline-block;width:7px;height:7px;flex-shrink:0;"></span>';
          const ts = n.created_at ? new Date(n.created_at).toLocaleString() : "";
          const bg = !n.read ? "background:var(--soft);" : "";
          return `<div style="${bg}display:flex;gap:8px;align-items:flex-start;padding:10px 14px;border-bottom:1px solid var(--line);cursor:pointer;"
                       data-annot="${escapeHtml(n.annotation_id || "")}">
            ${dot}
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;color:var(--ink);line-height:1.4;">${escapeHtml(n.message || "")}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px;">${ts}</div>
            </div>
          </div>`;
        }).join("");
        notifList.querySelectorAll("[data-annot]").forEach((el) => {
          el.addEventListener("click", () => {
            const annId = el.getAttribute("data-annot");
            if (annId) openExternalUrl(`${SITE_URL}/annotations/${annId}`);
            closeNotifPanel();
          });
        });
      }
    } catch (e) {
      console.warn("[notif] exception", e);
    }
  }
  async function markNotificationsRead(currentUser2) {
    if (!currentUser2?.id) return;
    try {
      await supabase.from("notifications").update({ read: true }).eq("recipient_id", currentUser2.id).eq("read", false).execute();
      const badge = $("#notifBadge");
      if (badge) badge.style.display = "none";
      document.querySelectorAll('#notifList [style*="var(--soft)"]').forEach((el) => {
        el.style.background = "";
      });
      document.querySelectorAll('#notifList span[style*="#ef4444"]').forEach((el) => {
        el.style.background = "transparent";
      });
    } catch (_) {
    }
  }
  function openNotifPanel(currentUser2) {
    const panel = $("#notifPanel");
    if (panel) panel.style.display = "flex";
    notifPanelOpen = true;
    markNotificationsRead(currentUser2);
  }
  function closeNotifPanel() {
    const panel = $("#notifPanel");
    if (panel) panel.style.display = "none";
    notifPanelOpen = false;
  }
  function initNotifications(getCurrentUser) {
    const bell = $("#notifBell");
    bell?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (notifPanelOpen) {
        closeNotifPanel();
      } else {
        openNotifPanel(getCurrentUser());
      }
    });
    $("#notifMarkRead")?.addEventListener("click", (e) => {
      e.stopPropagation();
      markNotificationsRead(getCurrentUser());
    });
    document.addEventListener("click", (e) => {
      if (!notifPanelOpen) return;
      const panel = $("#notifPanel");
      if (panel && !panel.contains(e.target) && e.target !== bell && !bell?.contains(e.target)) {
        closeNotifPanel();
      }
    });
  }

  // extension-src/widget/ui-controls.ts
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    chrome.storage.local.set({ theme });
    const themeBtn = $("#themeBtn");
    if (!themeBtn) return;
    if (theme === "dark") {
      themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
    } else {
      themeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
    }
  }
  function initUiControls() {
    $("#themeBtn")?.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      setTheme(cur);
    });
    const dragHandle = $("#dragHandle");
    if (dragHandle) {
      dragHandle.addEventListener("mousedown", (e) => {
        const target = e.target;
        if (target.closest("#brandLogo") || target.closest("#authBrandLogo") || target.closest("button") || target.closest(".icon-btn") || target.closest(".user-menu-wrap") || target.closest(".avatar")) {
          return;
        }
        window.parent.postMessage(
          {
            type: "DRAG_START",
            clientX: e.clientX,
            clientY: e.clientY
          },
          "*"
        );
      });
    }
    $("#closeBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: "CLOSE_WIDGET" }, "*");
    });
    const onBrandClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openExternalUrl(SITE_URL);
    };
    $("#brandLogo")?.addEventListener("click", onBrandClick);
    $("#authBrandLogo")?.addEventListener("click", onBrandClick);
    const userMenuWrap = $("#userMenuWrap");
    const avatarEl = $("#avatarEl");
    const userDropdown = $("#userDropdown");
    let userMenuHideTimeout = null;
    if (userMenuWrap && userDropdown) {
      userMenuWrap.addEventListener("mouseenter", () => {
        if (userMenuHideTimeout) clearTimeout(userMenuHideTimeout);
        userDropdown.classList.remove("hidden");
      });
      userMenuWrap.addEventListener("mouseleave", () => {
        if (userMenuHideTimeout) clearTimeout(userMenuHideTimeout);
        userMenuHideTimeout = setTimeout(() => {
          userDropdown.classList.add("hidden");
        }, 240);
      });
      avatarEl?.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("hidden");
      });
      document.addEventListener("click", (e) => {
        if (!userMenuWrap.contains(e.target)) {
          userDropdown.classList.add("hidden");
        }
      });
    }
  }

  // extension-src/widget/index.ts
  var currentUser = null;
  var page = {
    title: "Current page",
    url: "",
    hostname: "Current page"
  };
  function resizeWidget(height) {
    try {
      if (window.parent) {
        window.parent.postMessage({ type: "RESIZE_WIDGET", height }, "*");
      }
    } catch (_) {
    }
  }
  function refreshAll() {
    loadFeedFromSupabase(page, currentUser, () => refreshAll());
    loadUserProfileStats(currentUser);
    loadNotifications(currentUser);
  }
  function setupParentMessageListener() {
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || !data.type) return;
      switch (data.type) {
        case "VIEW_ANNOTATION":
          if (data.annotation) {
            (async () => {
              if (!currentUser) {
                const session = await supabase.restoreSession();
                if (session) {
                  currentUser = supabase.userFromSession(session);
                }
              }
              showAnnotationDetail(
                data.annotation,
                currentUser,
                () => showComposer(resizeWidget),
                resizeWidget,
                () => refreshAll()
              );
            })();
          }
          break;
        case "SCREENSHOT_CAPTURED":
          if (data.dataUrl) {
            setMedia(data.dataUrl, "image", `screenshot_${Date.now()}.png`, resizeWidget);
            const statusEl = $("#status");
            if (statusEl) {
              statusEl.textContent = "\u{1F4F8} Screenshot attached";
              setTimeout(() => {
                if (statusEl.textContent === "\u{1F4F8} Screenshot attached") statusEl.textContent = "";
              }, 3e3);
            }
          }
          break;
        case "PAGE_INFO_RESPONSE":
          page = {
            title: data.title || page.title,
            url: data.url || page.url,
            hostname: data.hostname || page.hostname
          };
          const pageHost = $("#pageHost");
          if (pageHost) pageHost.textContent = page.hostname.replace(/^www\./, "");
          if (data.quote || data.selectedText) {
            setQuote(data.quote || data.selectedText);
          }
          if (data.media_timestamp != null) {
            composerState.currentMediaTimestamp = data.media_timestamp;
            const badge = $("#composerTimestampBadge");
            const txt = $("#composerTimestampText");
            if (badge && txt) {
              txt.textContent = formatSeconds(data.media_timestamp);
              badge.classList.remove("hidden");
            }
          }
          refreshAll();
          break;
        case "VIDEO_CAPTURED":
          const clipBtn = $("#clipVideoBtn");
          if (clipBtn) {
            clipBtn.classList.remove("recording");
            clipBtn.innerText = "\u{1F3A5}";
          }
          if (data.dataUrl) {
            fetch(data.dataUrl).then((r) => r.blob()).then((blob) => {
              composerState.videoClipBlob = blob;
              if (data.startTs !== void 0) {
                composerState.videoStartTs = data.startTs;
                composerState.videoEndTs = data.endTs;
              }
              const preview = $("#videoPreviewEl");
              if (preview) {
                preview.src = URL.createObjectURL(blob);
              }
              $("#videoTrimmerBox")?.classList.remove("hidden");
              resizeWidget(630);
              updatePublishButton();
            });
          }
          break;
        case "DICTATION_RESULT":
          const commentEl = $("#comment");
          if (commentEl) {
            const text = data.text !== void 0 ? data.text : `${data.finalTranscript || ""} ${data.interimTranscript || ""}`;
            commentEl.value = text;
            updatePublishButton();
          }
          break;
        case "DICTATION_ENDED":
          const dBtn = $("#dictateBtn");
          if (dBtn) dBtn.classList.remove("recording");
          break;
        case "DICTATION_ERROR":
          const errBtn = $("#dictateBtn");
          if (errBtn) errBtn.classList.remove("recording");
          const st = $("#status");
          if (st) {
            st.textContent = data.error || "Dictation failed";
            setTimeout(() => {
              if (st.textContent === data.error) st.textContent = "";
            }, 4e3);
          }
          break;
      }
    });
  }
  async function boot() {
    chrome.storage.local.get("theme", (data) => {
      const t = data.theme === "dark" ? "dark" : "light";
      setTheme(t);
    });
    initUiControls();
    setupParentMessageListener();
    initComposer(
      () => currentUser,
      () => page,
      resizeWidget,
      () => refreshAll()
    );
    initCommentForm(
      () => currentUser,
      resizeWidget
    );
    initNotifications(() => currentUser);
    initAuthHandlers(
      (u) => {
        currentUser = u;
        if (u) {
          showApp(u, () => {
            refreshAll();
            resizeWidget(390);
          });
        } else {
          showAuth();
        }
      },
      resizeWidget
    );
    try {
      window.parent.postMessage({ type: "GET_PAGE_INFO" }, "*");
    } catch (_) {
    }
    const session = await supabase.restoreSession();
    if (session) {
      const user = supabase.userFromSession(session);
      if (user) {
        currentUser = user;
        showApp(user, () => {
          refreshAll();
          resizeWidget(390);
        });
        return;
      }
    }
    showAuth();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
