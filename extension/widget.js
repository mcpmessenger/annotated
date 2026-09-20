// ─── State ───────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
let page = { title: 'Current page', url: '', hostname: 'Current page' };
let quote = '', intent = null;
let mediaDataUrl = null, mediaType = null, mediaFileName = null;
let videoClipBlob = null;
let videoStartTs = null;
let videoEndTs = null;
let currentMediaTimestamp = null;

let recordedAudioBlob = null;
let mediaRecorder = null;
let audioChunks = [];

let currentUser = null;
let currentDetailWebUrl = "https://annotated-repo.vercel.app";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pageKey() {
  try { const u = new URL(page.url || 'https://annotated.com'); return `page:${u.origin}${u.pathname}`; }
  catch (_) { return 'page:https://annotated.com/'; }
}
function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function openExternalUrl(url) {
  if (!url) return;
  console.log('[Annotated Widget] openExternalUrl called for:', url);

  // 1. Direct runtime message to background script
  try {
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'openTab', url }, (res) => {
        if (chrome.runtime.lastError) {
          console.warn('[Annotated Widget] runtime.sendMessage openTab failed:', chrome.runtime.lastError.message);
        }
      });
    }
  } catch (err) {
    console.warn('[Annotated Widget] runtime.sendMessage exception:', err);
  }

  // 2. Parent postMessage relay to content script (handles cases where background worker is asleep or needs top frame)
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'OPEN_TAB', url }, '*');
    }
  } catch (err) {
    console.warn('[Annotated Widget] parent.postMessage exception:', err);
  }

  // 3. Native tabs API if directly available
  try {
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url, active: true });
    }
  } catch (_) {}

  // 4. Direct window.open fallback
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (_) {}
}

function extractTimestamp(url, comment) {
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
}

function formatSeconds(sec) {
  if (sec == null || isNaN(sec)) return '';
  const s = Math.floor(sec);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function setQuote(value) {
  quote = value;
  $('#quote').textContent = quote ? `"${quote}"` : 'Select text on any page to anchor a comment here.';
  updateButton();
}
function updateButton() {
  const commentEl = document.querySelector('#comment');
  const c = commentEl ? commentEl.value.trim() : '';
  const canPublish = (c.length > 0) || !!videoClipBlob || !!mediaDataUrl || !!recordedAudioBlob || !!quote;
  const pubBtn = document.querySelector('#publishBtn');
  if (pubBtn) {
    pubBtn.disabled = !canPublish;
  }
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Auth UI ─────────────────────────────────────────────────────────────────
function showAuth() {
  $('#authScreen').classList.remove('hidden');
  $('#mainApp').classList.add('hidden');
}
function showApp(user) {
  currentUser = user;
  $('#authScreen').classList.add('hidden');
  $('#mainApp').classList.remove('hidden');
  $('#userMenuWrap').classList.remove('hidden');
  $('#profileName').textContent = user.name;
  $('#avatarEl').textContent = initials(user.name);
  $('#avatarEl').removeAttribute('title');
  const dropdownAvatar = $('#dropdownAvatarEl');
  if (dropdownAvatar) dropdownAvatar.textContent = initials(user.name);

  if (user.avatar) {
    $('#avatarEl').style.backgroundImage = `url(${user.avatar})`;
    $('#avatarEl').style.backgroundSize = 'cover';
    $('#avatarEl').textContent = '';
    if (dropdownAvatar) {
      dropdownAvatar.style.backgroundImage = `url(${user.avatar})`;
      dropdownAvatar.style.backgroundSize = 'cover';
      dropdownAvatar.textContent = '';
    }
  }
  loadAnnotationCount();
  loadPage();
  resizeWidget(videoClipBlob ? 630 : 390);
}

$('#signInBtn').addEventListener('click', async () => {
  $('#signInBtn').disabled = true;
  $('#signInBtn').textContent = 'Signing in…';
  $('#authError').classList.add('hidden');
  try {
    const session = await supabase.signInWithGoogle();
    const user = supabase.userFromSession(session);
    if (user) showApp(user);
  } catch (err) {
    $('#authError').textContent = `Sign-in failed: ${err}`;
    $('#authError').classList.remove('hidden');
  } finally {
    $('#signInBtn').disabled = false;
    $('#signInBtn').innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Sign in with Google`;
  }
});

$('#signOutBtn').addEventListener('click', async () => {
  await supabase.signOut();
  currentUser = null;
  showAuth();
});

// ─── Profile ─────────────────────────────────────────────────────────────────
$('#profileBtn').addEventListener('click', () => {
  if (currentUser?.email) {
    const username = currentUser.email.split('@')[0];
    openExternalUrl(`https://annotated-repo.vercel.app/u/${username}`);
  }
});

async function loadAnnotationCount() {
  if (!currentUser) return;
  try {
    const db = await supabase.from('annotations');
    const result = await db.select('id').eq('user_id', currentUser.id).execute();
    const count = Array.isArray(result) ? result.length : 0;
    const name = currentUser.email?.split('@')[0] || 'user';

    // Query follower and following counts
    let fCount = 0;
    let flCount = 0;
    try {
      const dbFollows = await supabase.from('follows');
      const followers = await dbFollows.select('follower_id').eq('following_id', currentUser.id).execute();
      const following = await dbFollows.select('following_id').eq('follower_id', currentUser.id).execute();
      fCount = Array.isArray(followers) ? followers.length : 0;
      flCount = Array.isArray(following) ? following.length : 0;
    } catch (_) {}

    $('#profileMeta').textContent = `@${name}`;
    if ($('#statFollowers')) $('#statFollowers').textContent = fCount;
    if ($('#statFollowing')) $('#statFollowing').textContent = flCount;
    if ($('#statNotes')) $('#statNotes').textContent = count;

    if ($('#avatarEl')) {
      $('#avatarEl').removeAttribute('title');
    }
  } catch (_) {
    const name = currentUser.email?.split('@')[0] || 'user';
    $('#profileMeta').textContent = `@${name}`;
  }
}

// ─── Feed ─────────────────────────────────────────────────────────────────────
function renderFeed(items) {
  const currentVId = (() => {
    try {
      if (page.url && page.url.includes('youtube.com') && page.url.includes('v=')) {
        return new URL(page.url).searchParams.get('v');
      }
    } catch (_) {}
    return null;
  })();

  const filteredItems = Array.isArray(items) ? items.filter(a => {
    if (!a) return false;
    if (currentVId) return String(a.url || '').includes(currentVId);
    return true;
  }) : [];

  if ($('#annotationCount')) $('#annotationCount').textContent = `${filteredItems.length} annotation${filteredItems.length === 1 ? '' : 's'}`;

  if (!filteredItems.length) {
    $('#feed').innerHTML = '<div class="empty">Your annotations on this page will appear here.</div>';
    return;
  }

  $('#feed').innerHTML = filteredItems.slice().reverse().map(a => {
    const username = a.username || (a.author_profile?.email ? a.author_profile.email.split('@')[0] : (currentUser?.email ? currentUser.email.split('@')[0] : 'user'));
    const webUrl = a.slug || a.id ? `https://annotated-repo.vercel.app/${encodeURIComponent(username)}/${encodeURIComponent(a.slug || a.id)}` : 'https://annotated-repo.vercel.app';
    const ts = extractTimestamp(a.url, a.comment || a.commentary);
    const tsStr = ts != null ? formatSeconds(ts) : '';

    return `
      <article class="annotation" data-id="${a.id}">
        <div class="aheader" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:700; font-size:12px; color:#ffd21a;">${escapeHtml(a.intent || '💡')} ${tsStr ? `⏱️ ${tsStr}` : ''}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <a class="web-link" href="${webUrl}" target="_blank" rel="noopener" style="color:#8899a6; text-decoration:none; font-size:12px; font-weight:600;" title="Open on Annotated Website">↗ View Web</a>
            ${currentUser && (a.user_id === currentUser.id || !a.user_id) ? '<button class="feed-delete-btn" style="background:none; border:none; color:#8899a6; cursor:pointer; font-size:12px; padding:0 2px;" title="Delete annotation">🗑️</button>' : ''}
          </div>
        </div>
        <div class="aquote" style="cursor:pointer;" title="Click to seek video">"${escapeHtml(a.quote || a.quote_text || "")}"</div>
        ${a.media_url ? `
          <div class="feed-media-wrap">
            ${a.media_type === 'video' || a.media_url.includes('.webm') || a.media_url.includes('.mp4')
              ? `<video class="feed-media" src="${escapeHtml(a.media_url)}" controls playsinline></video>`
              : `<img class="feed-media" src="${escapeHtml(a.media_url)}" alt="Annotation media" loading="lazy">`
            }
          </div>` : ''}
        <div class="acomment">${escapeHtml(a.comment || a.commentary || "")}</div>
        <div class="meta" style="margin-top:6px; display:flex; justify-content:space-between; font-size:11px; color:#8899a6;">
          <span>@${escapeHtml(username)} · ${new Date(a.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
      </article>`;
  }).join('');

  $('#feed').querySelectorAll('.annotation').forEach(el => {
    const annId = el.dataset.id;
    const ann = filteredItems.find(a => String(a.id) === String(annId));
    if (!ann) return;

    const webLink = el.querySelector('.web-link');
    if (webLink) {
      webLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const username = ann.username || (ann.author_profile?.email ? ann.author_profile.email.split('@')[0] : (currentUser?.email ? currentUser.email.split('@')[0] : 'user'));
        const webUrl = ann.slug || ann.id ? `https://annotated-repo.vercel.app/${encodeURIComponent(username)}/${encodeURIComponent(ann.slug || ann.id)}` : 'https://annotated-repo.vercel.app';
        openExternalUrl(webUrl);
      });
    }

    const feedDelBtn = el.querySelector('.feed-delete-btn');
    if (feedDelBtn) {
      feedDelBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this annotation?')) return;
        try {
          const db = await supabase.from('annotations');
          await db.delete().eq('id', ann.id).execute();
        } catch (err) {
          console.warn('[Annotated Delete] Error:', err);
        }
        try {
          const key = pageKey();
          chrome.storage.local.get(key, data => {
            const items = (data[key] || []).filter(a => String(a.id) !== String(ann.id));
            chrome.storage.local.set({ [key]: items }, () => {});
          });
        } catch (_) {}
        try { window.parent.postMessage({ type: 'RELOAD_ANNOTATIONS' }, '*');
        fetchAnnotations(); } catch (_) {}
        loadFeedFromSupabase();
        loadAnnotationCount();
      });
    }

    const aquote = el.querySelector('.aquote');
    if (aquote) {
      aquote.addEventListener('click', () => {
        const ts = extractTimestamp(ann.url, ann.comment || ann.commentary);
        if (ts != null) {
          window.parent.postMessage({ type: 'SEEK_MEDIA', seconds: ts }, '*');
        }
      });
    }
  });
}

async function loadFeedFromSupabase() {
  if (!currentUser) { renderFeed([]); return; }

  let cleanUrl = page.url || location.href;
  let currentVId = null;

  if (cleanUrl.includes('youtube.com') && cleanUrl.includes('v=')) {
    try {
      const u = new URL(cleanUrl);
      currentVId = u.searchParams.get('v');
      if (currentVId) cleanUrl = `https://www.youtube.com/watch?v=${currentVId}`;
    } catch (_) {}
  }

  try {
    const db = await supabase.from('annotations');
    let items = null;
    if (currentVId) {
      items = await db.select('*').ilike('url', `%${currentVId}%`).execute();
    } else if (cleanUrl) {
      items = await db.select('*').ilike('url', `%${cleanUrl}%`).execute();
    }
    if (Array.isArray(items)) {
      renderFeed(items);
      return;
    }
  } catch (err) {
    console.warn('[Annotated Widget] loadFeedFromSupabase error:', err);
  }

  chrome.storage.local.get(pageKey(), data => {
    const localItems = data[pageKey()] || [];
    if (currentVId) {
      const filtered = localItems.filter(a => String(a.url || '').includes(currentVId));
      renderFeed(filtered);
    } else {
      renderFeed(localItems);
    }
  });
}

// ─── Selection & View Handling ─────────────────────────────────────────────
function applySelection(selection) {
  if (!selection?.quote) return;
  page = {
    title: selection.title || page.title,
    url: selection.url || page.url,
    hostname: selection.hostname || page.hostname,
  };
  if ($('#pageHost')) $('#pageHost').textContent = page.hostname.replace(/^www\./, '');
  setQuote(selection.quote);

  // Return to composer view when user selects new text
  showComposer();

  // Media timestamp badge
  const ts = selection.media_timestamp != null ? selection.media_timestamp : extractTimestamp(selection.url, '');
  if (ts != null) {
    currentMediaTimestamp = ts;
    const tsBadge = $('#composerTimestampBadge');
    const tsText = $('#composerTimestampText');
    if (tsBadge && tsText) {
      tsText.textContent = formatSeconds(ts);
      tsBadge.classList.remove('hidden');
      tsBadge.onclick = (e) => {
        e.stopPropagation();
        window.parent.postMessage({ type: 'SEEK_MEDIA', seconds: ts }, '*');
      };
    }
  } else {
    currentMediaTimestamp = null;
    const tsBadge = $('#composerTimestampBadge');
    if (tsBadge) tsBadge.classList.add('hidden');
  }

  loadFeedFromSupabase();
}

function showAnnotationDetail(ann) {
  if (!ann) return;
  const compSec = $('#composerSection');
  if (compSec) compSec.classList.add('hidden');
  const detailCard = $('#annotationDetailCard');
  if (!detailCard) return;

  detailCard.classList.remove('hidden');

  // Wire Compose button directly
  const detailBack = $('#detailBackBtn');
  if (detailBack) {
    detailBack.onmousedown = (e) => e.stopPropagation();
    detailBack.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Annotated Widget] Compose button clicked');
      showComposer();
    };
  }

  // Compute target URL and button bindings immediately
  const slug = ann.slug || ann.id;
  let targetUser = ann.username || (ann.author_profile?.email ? ann.author_profile.email.split('@')[0] : (currentUser?.email ? currentUser.email.split('@')[0] : 'a'));
  let detailUrl = slug ? `https://annotated-repo.vercel.app/${encodeURIComponent(targetUser)}/${encodeURIComponent(slug)}` : 'https://annotated-repo.vercel.app';
  currentDetailWebUrl = detailUrl;

  const openWebBtn = $('#detailOpenWebBtn');
  const bindWebButton = (url) => {
    if (!openWebBtn || !url) return;
    openWebBtn.href = url;
    openWebBtn.setAttribute('href', url);
    openWebBtn.onmousedown = (e) => e.stopPropagation();
    openWebBtn.onclick = (e) => {
      e.stopPropagation();
      console.log('[Annotated Widget] Open on Annotated button clicked:', url);
      openExternalUrl(url);
    };
  };
  bindWebButton(detailUrl); currentDetailWebUrl = detailUrl;

  // Quote
  const qEl = $('#detailQuote');
  if (qEl) qEl.textContent = ann.quote || ann.quote_text || 'Annotation';

  // Intent
  const intentEl = $('#detailIntentBadge');
  if (intentEl) intentEl.textContent = ann.intent || '💡';

  // Timestamp: only show on actual video platforms (e.g. YouTube/Vimeo) or with video attachments
  const isVideoPage = ann.url && (ann.url.includes('youtube.com') || ann.url.includes('vimeo.com'));
  const hasVideoAttachment = !!(ann.media_url && (ann.media_type === 'video' || ann.media_url.includes('.webm') || ann.media_url.includes('.mp4')));
  const explicitCommentTs = ann.comment ? String(ann.comment).match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\]/) : null;
  const showTs = isVideoPage || hasVideoAttachment || !!explicitCommentTs;
  const ts = showTs ? (ann.extractedTimestamp != null ? ann.extractedTimestamp : extractTimestamp(ann.url, ann.comment || ann.commentary)) : null;

  const tsBadge = $('#detailTimestampBadge');
  const tsText = $('#detailTimestampText');
  if (tsBadge && tsText && ts != null && ts > 0) {
    tsText.textContent = formatSeconds(ts);
    tsBadge.classList.remove('hidden');
    tsBadge.onclick = (e) => {
      e.stopPropagation();
      window.parent.postMessage({ type: 'SEEK_MEDIA', seconds: ts }, '*');
    };
  } else if (tsBadge) {
    tsBadge.classList.add('hidden');
  }

  // Comment
  const commentEl = $('#detailComment');
  if (commentEl) commentEl.textContent = ann.comment || ann.commentary || '(No comment)';

  // Author & Date Resolution
  const authorEl = $('#detailAuthorName');
  const avatarEl = $('#detailAvatar');
  const dateEl = $('#detailDate');
  if (dateEl) dateEl.textContent = ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recent';

  function applyProfile(name, handle, avatarUrl) {
    if (authorEl) {
      authorEl.innerHTML = `<span>${escapeHtml(name)}</span>${handle ? ` <span class="muted" style="font-weight: normal; font-size: 10px;">${escapeHtml(handle)}</span>` : ''}`;
    }
    if (avatarEl) {
      if (avatarUrl) {
        avatarEl.style.backgroundImage = `url(${avatarUrl})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.textContent = initials(name);
      }
    }
  }

  if (currentUser && (ann.user_id === currentUser.id || !ann.user_id)) {
    const name = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'You');
    const handle = currentUser.email ? `@${currentUser.email.split('@')[0]}` : '';
    applyProfile(name, handle, currentUser.avatar);
  } else if (ann.author_profile) {
    const prof = ann.author_profile;
    const name = prof.full_name || (prof.email ? prof.email.split('@')[0] : 'Annotator');
    const handle = prof.email ? `@${prof.email.split('@')[0]}` : '';
    applyProfile(name, handle, prof.avatar_url);
    if (prof.email && slug) {
      targetUser = prof.email.split('@')[0];
      detailUrl = `https://annotated-repo.vercel.app/${encodeURIComponent(targetUser)}/${encodeURIComponent(slug)}`;
      bindWebButton(detailUrl);
    }
  } else if (ann.user_id) {
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/profiles?id=eq.${ann.user_id}`, {
      headers: { apikey: anonKey }
    })
    .then(r => r.json())
    .then(profs => {
      if (Array.isArray(profs) && profs[0]) {
        const p = profs[0];
        const name = p.full_name || (p.email ? p.email.split('@')[0] : 'Annotator');
        const handle = p.email ? `@${p.email.split('@')[0]}` : '';
        applyProfile(name, handle, p.avatar_url);
        if (p.email && slug) {
          targetUser = p.email.split('@')[0];
          detailUrl = `https://annotated-repo.vercel.app/${encodeURIComponent(targetUser)}/${encodeURIComponent(slug)}`;
          bindWebButton(detailUrl);
        }
      } else {
        applyProfile(ann.user_name || 'Community Member', '', null);
      }
    })
    .catch(() => {
      applyProfile(ann.user_name || 'Community Member', '', null);
    });
  } else {
    applyProfile(ann.user_name || 'Community Member', '', null);
  }

  // Media box
  const mediaBox = $('#detailMediaBox');
  if (mediaBox) {
    mediaBox.innerHTML = '';
    if (ann.media_url && (ann.media_type === 'video' || ann.media_url.includes('.webm') || ann.media_url.includes('.mp4'))) {
      mediaBox.innerHTML = `<video src="${escapeHtml(ann.media_url)}" controls playsinline style="width:100%; max-height:160px; display:block;"></video>`;
      mediaBox.classList.remove('hidden');
    } else if (ann.media_url) {
      mediaBox.innerHTML = `<img src="${escapeHtml(ann.media_url)}" style="width:100%; max-height:160px; object-fit:contain; display:block;">`;
      mediaBox.classList.remove('hidden');
    } else if (ann.audio_url) {
      mediaBox.innerHTML = `<audio src="${escapeHtml(ann.audio_url)}" controls style="width:100%; display:block;"></audio>`;
      mediaBox.classList.remove('hidden');
    } else {
      mediaBox.classList.add('hidden');
    }
  }

  const hasMedia = !!(ann.media_url || ann.audio_url);
  resizeWidget(hasMedia ? 740 : 660);
  loadWidgetComments(ann.id);
}

function showComposer() {
  const detailCard = $('#annotationDetailCard');
  if (detailCard) detailCard.classList.add('hidden');
  const compSec = $('#composerSection');
  if (compSec) compSec.classList.remove('hidden');
  resizeWidget(videoClipBlob ? 630 : 390);
}

function loadPage() {
  const applyInfo = (info) => {
    if (!info) return;
    page = {
      title: info.title || page.title || 'Current page',
      url: info.url || page.url || location.href,
      hostname: info.hostname || page.hostname || 'youtube.com',
    };
    if ($('#pageHost')) $('#pageHost').textContent = (page.hostname || '').replace(/^www\./, '');
    if (info.selectedText || info.quote) {
      setQuote(info.quote || info.selectedText);
    }
    if (info.media_timestamp != null) {
      currentMediaTimestamp = info.media_timestamp;
    }
    loadFeedFromSupabase();
  };

  try {
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'getPageInfo' }, (info) => {
        if (!chrome.runtime.lastError && info) {
          applyInfo(info);
        } else {
          try { window.parent.postMessage({ type: 'GET_PAGE_INFO' }, '*'); } catch (_) {}
        }
      });
    } else {
      try { window.parent.postMessage({ type: 'GET_PAGE_INFO' }, '*'); } catch (_) {}
    }
  } catch (_) {
    try { window.parent.postMessage({ type: 'GET_PAGE_INFO' }, '*'); } catch (_) {}
  }

  try {
    chrome.storage.local.get(['pendingSelection', pageKey()], data => {
      if (data.pendingSelection && Date.now() - data.pendingSelection.timestamp < 120000) {
        applySelection(data.pendingSelection);
        chrome.storage.local.remove('pendingSelection');
      }
    });
  } catch (_) {}
}

// ─── Media: Screenshot ────────────────────────────────────────────────────────
if ($('#screenshotBtn')) if ($('#screenshotBtn')) $('#screenshotBtn').addEventListener('click', () => {
  $('#screenshotBtn').disabled = true;
  $('#screenshotBtn').textContent = '⏳ Capturing…';
  chrome.runtime.sendMessage({ type: 'captureScreenshot' }, (response) => {
    $('#screenshotBtn').disabled = false;
    $('#screenshotBtn').textContent = '📷 Screenshot';
    if (response?.dataUrl) {
      setMedia(response.dataUrl, 'screenshot', 'screenshot.png');
    } else {
      $('#status').textContent = '📷 Failed: ' + (response?.error || 'Unknown error');
      setTimeout(() => $('#status').textContent = '', 3000);
    }
  });
});

// ─── Media: File Upload ───────────────────────────────────────────────────────
if ($('#uploadBtn')) if ($('#uploadBtn')) $('#uploadBtn').addEventListener('click', () => $('#mediaInput').click());
if ($('#mediaInput')) if ($('#mediaInput')) $('#mediaInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMedia(ev.target.result, type, file.name);
  };
  reader.readAsDataURL(file);
});

function setMedia(dataUrl, type, name) {
  mediaDataUrl = dataUrl;
  mediaType = type;
  mediaFileName = name;

  // Show correct preview element
  $('#previewImg').classList.add('hidden');
  $('#previewVideo').classList.add('hidden');
  if (type === 'video') {
    $('#previewVideo').src = dataUrl;
    $('#previewVideo').classList.remove('hidden');
  } else {
    $('#previewImg').src = dataUrl;
    $('#previewImg').classList.remove('hidden');
  }

  $('#previewName').textContent = name.length > 28 ? name.slice(0, 25) + '…' : name;
  $('#mediaPreview').classList.remove('hidden');
  updateButton();
}

if ($('#removeMedia')) if ($('#removeMedia')) $('#removeMedia').addEventListener('click', () => {
  mediaDataUrl = null; mediaType = null; mediaFileName = null;
  if ($('#previewImg')) if ($('#previewImg')) $('#previewImg').src = '';
  if ($('#previewVideo')) if ($('#previewVideo')) $('#previewVideo').src = '';
  if ($('#mediaInput')) if ($('#mediaInput')) $('#mediaInput').value = '';
  if ($('#mediaPreview')) if ($('#mediaPreview')) $('#mediaPreview').classList.add('hidden');
  updateButton();
});

// ─── Publish ──────────────────────────────────────────────────────────────────
$('#publishBtn').addEventListener('click', async () => {
  if (!currentUser) return;

  $('#publishBtn').disabled = true;
  $('#publishBtn').textContent = 'Publishing…';

  let media_url = null;
  if (mediaDataUrl) {
    try {
      if ($('#uploadProgress')) $('#uploadProgress').classList.remove('hidden');
      if ($('#progressLabel')) $('#progressLabel').textContent = 'Uploading media…';
      if ($('#progressFill')) $('#progressFill').style.width = '40%';
      media_url = await supabase.uploadMedia(mediaDataUrl, mediaFileName || 'media');
      if ($('#progressFill')) $('#progressFill').style.width = '100%';
      await new Promise(r => setTimeout(r, 300));
      if ($('#uploadProgress')) $('#uploadProgress').classList.add('hidden');
    } catch (err) {
      if ($('#uploadProgress')) $('#uploadProgress').classList.add('hidden');
      $('#status').textContent = `Media upload failed: ${err.message}`;
      $('#publishBtn').disabled = false;
      $('#publishBtn').textContent = 'Publish';
      setTimeout(() => $('#status').textContent = '', 4000);
      return;
    }
  }

  let media_type = null;
  if (videoClipBlob) {
    try {
      const fileName = `video_${Date.now()}.webm`;
      const uploadRes = await fetch(`${supabase.url}/storage/v1/object/annotation-media/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': supabase.key,
          'Authorization': `Bearer ${supabase.token || supabase.key}`,
          'Content-Type': 'video/webm'
        },
        body: videoClipBlob
      });
      if (uploadRes.ok) {
        media_url = `${supabase.url}/storage/v1/object/public/annotation-media/${fileName}`;
        media_type = 'video';
      }
    } catch (err) {
      console.error('[VideoUpload] Error:', err);
    }
  }

  let audio_url = null;
  if (recordedAudioBlob) {
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const uploadRes = await fetch(`${supabase.url}/storage/v1/object/annotation-media/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': supabase.key,
          'Authorization': `Bearer ${supabase.token || supabase.key}`,
          'Content-Type': 'audio/webm'
        },
        body: recordedAudioBlob
      });
      if (uploadRes.ok) {
        audio_url = `${supabase.url}/storage/v1/object/public/annotation-media/${fileName}`;
      }
    } catch (err) {
      console.error('[AudioUpload] Error:', err);
    }
  }

  const safeQuote = (quote && quote.trim()) || (videoClipBlob ? `🎬 Video Clip (${page.title || 'Video'})` : (media_url ? `Attachment: ${page.title || 'Media'}` : (page.title || 'Page Annotation')));
  const allowedIntents = ['🔥', '🤔', '💡', '💯', '👎'];
  const safeIntent = (intent && allowedIntents.includes(intent)) ? intent : '💡';
  let safeComment = ($('#comment') ? $('#comment').value.trim() : '') || (videoClipBlob ? 'Shared a video clip' : 'Annotation');

  // Inject start and stop times into the comment to render progress markers
  if (videoStartTs != null && videoEndTs != null) {
    const fmt = (ts) => {
      const m = Math.floor(ts / 60);
      const s = Math.floor(ts % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    safeComment += `\n\n[⏱️ ${fmt(videoStartTs)} - ${fmt(videoEndTs)}]`;
  }

  let publishUrl = page.url || location.href;
  if (currentMediaTimestamp != null) {
    if (publishUrl.includes('youtube.com') && !publishUrl.includes('&t=') && !publishUrl.includes('?t=')) {
      publishUrl += (publishUrl.includes('?') ? '&' : '?') + `t=${currentMediaTimestamp}s`;
    } else if (!publishUrl.includes('#t=') && !publishUrl.includes('youtube.com')) {
      publishUrl += `#t=${currentMediaTimestamp}`;
    }
  }

  const annotation = {
    audio_url,
    media_url,
    media_type: media_type || (media_url ? mediaType : null),
    quote: safeQuote,
    comment: safeComment,
    intent: safeIntent,
    page_title: page.title || 'Page',
    url: publishUrl,
    hostname: page.hostname || 'youtube.com',
    user_id: currentUser.id,
    created_at: new Date().toISOString(),
  };

  let savedRow = null;
  try {
    const db = await supabase.from('annotations');
    const res = await db.insert(annotation);
    if (res.code || res.error || res.message) {
      $('#publishBtn').textContent = 'Publish';
      $('#publishBtn').disabled = false;
      $('#status').textContent = 'DB Error: ' + (res.message || res.error || JSON.stringify(res));
      return;
    }
    if (Array.isArray(res) && res[0]) {
      savedRow = res[0];
    } else if (res && res.id) {
      savedRow = res;
    }
  } catch (err) {
    $('#publishBtn').textContent = 'Publish';
    $('#publishBtn').disabled = false;
    $('#status').textContent = 'Error: ' + err.message;
    return;
  }

  const realId = savedRow?.id || crypto.randomUUID();
  const realSlug = savedRow?.slug || realId;
  const localAnnotation = { ...annotation, id: realId, slug: realSlug };

  const key = pageKey();
  try {
    chrome.storage.local.get(key, data => {
      const items = [...(data[key] || []), localAnnotation];
      chrome.storage.local.set({ [key]: items }, () => {
        $('#comment').value = '';
        if ($('#counter')) $('#counter').textContent = '0';
        setQuote(''); intent = null;
        mediaDataUrl = null; mediaType = null; mediaFileName = null;
        videoClipBlob = null;
        videoStartTs = null;
        videoEndTs = null;
        currentMediaTimestamp = null;
        if ($('#composerTimestampBadge')) $('#composerTimestampBadge').classList.add('hidden');
        if ($('#videoTrimmerBox')) $('#videoTrimmerBox').classList.add('hidden');
        if ($('#videoPreviewEl')) $('#videoPreviewEl').src = '';
        if ($('#clipVideoBtn')) $('#clipVideoBtn').innerText = '🎥';
        resizeWidget(390);
        if ($('#previewImg')) $('#previewImg').src = '';
        if ($('#previewVideo')) $('#previewVideo').src = '';
        if ($('#mediaInput')) $('#mediaInput').value = '';
        if ($('#mediaPreview')) $('#mediaPreview').classList.add('hidden');
        if (document.querySelector('[data-intent]')) document.querySelectorAll('[data-intent]').forEach(b => b.classList.remove('active'));
        $('#publishBtn').textContent = 'Publish';
        updateButton();

        loadFeedFromSupabase();
        loadAnnotationCount();

        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`"${safeQuote.slice(0, 100)}"`)}&url=${encodeURIComponent(publishUrl)}`;
        $('#status').innerHTML = `Published! &nbsp;`;
        const shareBtn = document.createElement('a');
        shareBtn.href = shareUrl;
        shareBtn.target = '_blank';
        shareBtn.className = 'tweet-btn';
        shareBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Tweet Annotation`;
        $('#status').appendChild(shareBtn);
        setTimeout(() => {
          if ($('#status') && $('#status').innerHTML.includes('Published!')) {
            $('#status').innerHTML = '';
          }
        }, 6000);
      });
    });
  } catch (_) {}

  // Notify content script to render highlight and progress bar markers immediately
  try {
    chrome.runtime.sendMessage({ type: 'saveAnnotation', annotation: localAnnotation });
  } catch (_) {}
  try {
    window.parent.postMessage({ type: 'SAVE_ANNOTATION', annotation: localAnnotation }, '*');
  } catch (_) {}
  try {
    setTimeout(() => {
      window.parent.postMessage({ type: 'RELOAD_ANNOTATIONS' }, '*');
        fetchAnnotations();
    }, 400);
  } catch (_) {}
});

// ─── UI Controls ─────────────────────────────────────────────────────────────
$('#comment').addEventListener('input', e => { if ($('#counter')) $('#counter').textContent = e.target.value.length; updateButton(); });
if (document.querySelector('[data-intent]')) document.querySelectorAll('[data-intent]').forEach(btn => btn.addEventListener('click', () => {
  if (document.querySelector('[data-intent]')) document.querySelectorAll('[data-intent]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); intent = btn.dataset.intent; updateButton();
}));
$('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
if ($('#refreshBtn')) if ($('#refreshBtn')) $('#refreshBtn').addEventListener('click', loadPage);
// closeBtn logic moved to bottom

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  chrome.storage.local.set({ theme });
  if (theme === 'dark') {
    $('#themeBtn').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
  } else {
    $('#themeBtn').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
  }
}

// ─── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'selection') applySelection(message);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  chrome.storage.local.get('theme', data => setTheme(data.theme || 'light'));
  const session = await supabase.restoreSession();
  if (session) {
    const user = supabase.userFromSession(session);
    if (user) { showApp(user); return; }
  }
  showAuth();
})();

// --- Nordic UI Dropdown & Hover Card ---

const userMenuWrap = $('#userMenuWrap');
const avatarEl = $('#avatarEl');
const userDropdown = $('#userDropdown');
let userMenuHideTimeout = null;

if (userMenuWrap && userDropdown) {
  userMenuWrap.addEventListener('mouseenter', () => {
    if (userMenuHideTimeout) {
      clearTimeout(userMenuHideTimeout);
      userMenuHideTimeout = null;
    }
    userDropdown.classList.remove('hidden');
  });

  userMenuWrap.addEventListener('mouseleave', () => {
    if (userMenuHideTimeout) clearTimeout(userMenuHideTimeout);
    userMenuHideTimeout = setTimeout(() => {
      userDropdown.classList.add('hidden');
    }, 240);
  });

  if (avatarEl) {
    avatarEl.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });
  }

  document.addEventListener('click', (e) => {
    if (!userMenuWrap.contains(e.target)) {
      userDropdown.classList.add('hidden');
    }
  });
}

// Dictation

    // 🎬 Video Preview, Trimmer & Dynamic Widget Resizing
  const trimStartInput = $('#trimStartInput');
  const trimEndInput = $('#trimEndInput');
  const videoPreviewEl = $('#videoPreviewEl');
  const videoTrimmerBox = $('#videoTrimmerBox');
  const trimDurationLabel = $('#trimDurationLabel');

  function resizeWidget(height) {
    try {
      if (window.parent) {
        window.parent.postMessage({ type: 'RESIZE_WIDGET', height }, '*');
      }
    } catch (_) {}
  }

  const updateTrim = () => {
    if (!trimStartInput || !trimEndInput || !trimDurationLabel) return;
    let start = parseInt(trimStartInput.value) || 0;
    let end = parseInt(trimEndInput.value) || 15;
    if (end - start > 90) end = start + 90;
    if (end <= start) end = start + 1;
    trimEndInput.value = end;
    trimDurationLabel.innerText = `${end - start}s`;
  };

  if (trimStartInput) trimStartInput.addEventListener('change', updateTrim);
  if (trimEndInput) trimEndInput.addEventListener('change', updateTrim);

  if (videoPreviewEl) {
    videoPreviewEl.addEventListener('timeupdate', () => {
      const start = parseInt(trimStartInput?.value) || 0;
      const end = parseInt(trimEndInput?.value) || 90;
      if (videoPreviewEl.currentTime < start) {
        videoPreviewEl.currentTime = start;
      }
      if (videoPreviewEl.currentTime >= end) {
        videoPreviewEl.pause();
        videoPreviewEl.currentTime = start;
      }
    });
  }

  const clipVideoBtn = $('#clipVideoBtn');
  let isVideoRecording = false;

  if (clipVideoBtn) {
    clipVideoBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const handleVideoResult = (res) => {
        isVideoRecording = false;
        if (clipVideoBtn) {
          clipVideoBtn.classList.remove('recording');
          clipVideoBtn.innerText = '🎥';
        }
        if (res && res.dataUrl) {
          fetch(res.dataUrl)
            .then(r => r.blob())
            .then(blob => {
              videoClipBlob = blob;
              if (res.startTs !== undefined) { videoStartTs = res.startTs; videoEndTs = res.endTs; }
              if (videoPreviewEl) {
                videoPreviewEl.src = URL.createObjectURL(blob);
                videoPreviewEl.muted = false;
                videoPreviewEl.volume = 1.0;
              }
              if (videoTrimmerBox) videoTrimmerBox.classList.remove('hidden');
              const clipDuration = res.duration || 15;
              if (trimStartInput) trimStartInput.value = 0;
              if (trimEndInput) trimEndInput.value = clipDuration;
              if (trimDurationLabel) trimDurationLabel.innerText = `${clipDuration}s`;
              resizeWidget(630);
              updateButton();
            });
        } else if (res && res.error) {
          alert(res.error);
        }
      };

      if (isVideoRecording) {
        // Stop recording
        isVideoRecording = false;
        clipVideoBtn.innerText = '⏳';
        clipVideoBtn.classList.remove('recording');

        try {
          chrome.runtime.sendMessage({ type: 'stopVideo' }, () => {});
        } catch (_) {}
        try {
          window.parent.postMessage({ type: 'STOP_VIDEO' }, '*');
        } catch (_) {}
      } else {
        // Start recording
        isVideoRecording = true;
        clipVideoBtn.innerText = '🛑';
        clipVideoBtn.classList.add('recording');

        let handled = false;

        // A. Primary: chrome.runtime.sendMessage to content.js
        try {
          chrome.runtime.sendMessage({ type: 'captureVideo', duration: 90 }, (res) => {
            if (!handled && (res || chrome.runtime.lastError == null)) {
              handled = true;
              handleVideoResult(res);
            }
          });
        } catch (_) {}

        // B. Secondary: window.parent.postMessage relay
        try {
          window.parent.postMessage({ type: 'CAPTURE_VIDEO', duration: 90 }, '*');
        } catch (_) {}

        // Listener for parent postMessage response fallback
        const onMsg = (event) => {
          if (event.data && event.data.type === 'VIDEO_CAPTURED') {
            window.removeEventListener('message', onMsg);
            if (!handled) {
              handled = true;
              handleVideoResult(event.data);
            }
          }
        };
        window.addEventListener('message', onMsg);
      }
    });
  }

  const clearVideo = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    videoClipBlob = null;
    if (videoTrimmerBox) videoTrimmerBox.classList.add('hidden');
    if (videoPreviewEl) {
      videoPreviewEl.pause();
      videoPreviewEl.src = '';
    }
    if (clipVideoBtn) {
      clipVideoBtn.innerText = '🎥';
      clipVideoBtn.classList.remove('recording');
    }
    resizeWidget(390); // Reset widget height to compact
    updateButton();
  };

  if ($('#clearVideoBtn')) $('#clearVideoBtn').addEventListener('click', clearVideo);
  if ($('#removeMediaBtn')) $('#removeMediaBtn').addEventListener('click', clearVideo);

  const dictateBtn = $('#dictateBtn');
  let isDictating = false;
    let activeDictationTarget = 'main'; // 'main' | 'comment'
  let baseComment = '';
  let baseCommentReply = '';
  let hasLastError = false;

  function setSttStatus(msg, isError = false) {
    const st = $('#status');
    if (!st) return;
    st.textContent = msg;
    st.className = isError ? 'status error' : 'status';
    console.log(`[Widget STT Status] ${isError ? 'ERROR: ' : ''}${msg}`);
  }

  function toggleDictation() {
    activeDictationTarget = 'main';
    console.log('[Widget STT] toggleDictation clicked. Current isDictating:', isDictating);
    if (isDictating) {
      setSttStatus('Stopping dictation…');
      stopDictationUI();
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'STOP_DICTATION' }, '*');
      }
    } else {
      hasLastError = false;
      const commentEl = $('#comment');
      baseComment = commentEl ? commentEl.value : '';
      if (baseComment && !baseComment.endsWith(' ') && !baseComment.endsWith('\n')) {
        baseComment += ' ';
      }
      isDictating = true;
      if (dictateBtn) dictateBtn.classList.add('recording');
      setSttStatus('🎙️ Mic active… listening');

      console.log('[Widget STT] Sending START_DICTATION to parent...');
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'START_DICTATION' }, '*');
      }
    }
  }

  function stopDictationUI() {
    isDictating = false;
    if (dictateBtn) dictateBtn.classList.remove('recording');
    const commentEl = $('#comment');
    if (commentEl) {
      commentEl.value = commentEl.value.trim();
      baseComment = commentEl.value;
      updateButton();
    }
  }

  function handleDictationMsg(data) {
    if (!data || !data.type) return;
    if (data.type.startsWith('DICTATION_')) {
      console.log('[Widget STT Message]', data);
    }

    if (activeDictationTarget === 'comment') {
      const commentInput = $('#widgetCommentInput');
      const micBtn = $('#widgetCommentMicBtn');
      const statusEl = $('#widgetCommentStatus');

      if (data.type === 'DICTATION_STATUS') {
        if (statusEl && data.status) {
          statusEl.textContent = data.status;
          statusEl.style.color = 'var(--muted)';
        }
      } else if (data.type === 'DICTATION_STARTED') {
        isCommentDictating = true;
        if (micBtn) micBtn.classList.add('recording');
        if (statusEl) {
          statusEl.textContent = '🎙️ Listening…';
          statusEl.style.color = 'var(--muted)';
        }
      } else if (data.type === 'DICTATION_RESULT') {
        if (commentInput) {
          const text = (data.text !== undefined) ? data.text : ((data.finalTranscript || '') + (data.interimTranscript || ''));
          commentInput.value = (baseCommentReply ? baseCommentReply.trim() + ' ' : '') + text;
        }
      } else if (data.type === 'DICTATION_ENDED') {
        isCommentDictating = false;
        if (micBtn) micBtn.classList.remove('recording');
        if (statusEl) statusEl.textContent = '';
      } else if (data.type === 'DICTATION_ERROR') {
        isCommentDictating = false;
        if (micBtn) micBtn.classList.remove('recording');
        if (statusEl) {
          statusEl.textContent = data.error || 'Dictation failed';
          statusEl.style.color = '#ef4444';
          setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 5000);
        }
      }
      return;
    }

    if (data.type === 'DICTATION_STATUS') {
      if (!hasLastError) {
        setSttStatus(data.status || '');
      }
    } else if (data.type === 'DICTATION_STARTED') {
      hasLastError = false;
      isDictating = true;
      if (dictateBtn) dictateBtn.classList.add('recording');
      setSttStatus('🎙️ Listening… speak now');
    } else if (data.type === 'DICTATION_RESULT') {
      hasLastError = false;
      const commentEl = $('#comment');
      if (commentEl) {
        const text = (data.text !== undefined) ? data.text : ((data.finalTranscript || '') + (data.interimTranscript || ''));
        commentEl.value = (baseComment ? baseComment.trim() + ' ' : '') + text;
        updateButton();
      }
    } else if (data.type === 'DICTATION_ENDED') {
      console.log('[Widget STT] Dictation ended cleanly.');
      stopDictationUI();
      if (!hasLastError) {
        setSttStatus('');
      }
    } else if (data.type === 'DICTATION_ERROR') {
      console.warn('[Widget STT] Dictation error received:', data.error);
      hasLastError = true;
      stopDictationUI();
      setSttStatus(data.error || 'Dictation failed', true);
      setTimeout(() => {
        hasLastError = false;
        const st = $('#status');
        if (st && st.textContent === data.error) {
          st.textContent = '';
          st.className = 'status';
        }
      }, 7000);
    }
  }

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'VIEW_ANNOTATION') {
      showAnnotationDetail(e.data.annotation);
    } else {
      handleDictationMsg(e.data);
    }
  });

  const detailBack = document.getElementById('detailBackBtn');
  if (detailBack) {
    detailBack.addEventListener('click', (e) => {
      e.preventDefault();
      showComposer();
    });
  }

  try {
    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        handleDictationMsg(msg);
      });
    }
  } catch (_) {}

  if (dictateBtn) {
    dictateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleDictation();
    });
  }



// Emojis
document.querySelectorAll('.emoji-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const em = btn.dataset.emoji || e.target.dataset.emoji;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    intent = em;
    const c = document.querySelector('#comment');
    if (c) {
      c.value = c.value ? `${c.value} ${em}` : em;
      if (document.querySelector('#counter')) document.querySelector('#counter').textContent = c.value.length;
    }
    updateButton();
  });
});

// --- Widget Dragging & Closing ---
const dragHandle = document.getElementById('dragHandle');
if (dragHandle) {
  dragHandle.addEventListener('mousedown', (e) => {
    // Crucial: do NOT start dragging or disable pointerEvents if clicking brand logo, buttons, theme toggle, or user menu
    if (e.target.closest('#brandLogo') || e.target.closest('#authBrandLogo') || e.target.closest('button') || e.target.closest('.icon-btn') || e.target.closest('.user-menu-wrap') || e.target.closest('.avatar')) {
      return;
    }
    // Tell parent frame to start dragging
    window.parent.postMessage({
      type: 'DRAG_START',
      clientX: e.clientX,
      clientY: e.clientY
    }, '*');
  });
}

const closeBtn = document.getElementById('closeBtn');
if (closeBtn) {
  closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'CLOSE_WIDGET' }, '*');
  });
}

const themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  themeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
}

const detailBackBtn = document.getElementById('detailBackBtn');
if (detailBackBtn) {
  detailBackBtn.addEventListener('mousedown', (e) => e.stopPropagation());
}

// Open website on logo click - stop mousedown propagation to prevent drag pointerEvents interception
const brandLogo = document.getElementById('brandLogo');
if (brandLogo) {
  brandLogo.addEventListener('mousedown', (e) => e.stopPropagation());
  brandLogo.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Annotated Widget] Brand logo clicked');
    openExternalUrl('https://annotated-repo.vercel.app');
  });
}

const authBrandLogo = document.getElementById('authBrandLogo');
if (authBrandLogo) {
  authBrandLogo.addEventListener('mousedown', (e) => e.stopPropagation());
  authBrandLogo.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Annotated Widget] Auth brand logo clicked');
    openExternalUrl('https://annotated-repo.vercel.app');
  });
}



// ─── Annotation Detail Comments (Discussion) ───────────────────────────────────
let currentDetailAnnotationId = null;
let isCommentDictating = false;

async function loadWidgetComments(annotationId) {
  currentDetailAnnotationId = annotationId;
  const listEl = $('#widgetCommentList');
  const countEl = $('#widgetCommentCount');
  const emptyEl = $('#widgetCommentEmpty');
  if (!listEl) return;

  if (countEl) countEl.textContent = '…';

  try {
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    const res = await fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/comments?annotation_id=eq.${encodeURIComponent(annotationId)}&order=created_at.asc`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${supabase.token || anonKey}`
      }
    });

    const comments = await res.json();
    if (!Array.isArray(comments)) {
      if (countEl) countEl.textContent = '0';
      return;
    }

    if (countEl) countEl.textContent = String(comments.length);

    if (comments.length === 0) {
      listEl.innerHTML = '<div id="widgetCommentEmpty" style="font-size: 11px; color: var(--muted); text-align: center; padding: 12px 0;">No comments yet. Be the first to join the discussion!</div>';
      return;
    }

    // Fetch author profiles for avatars/names
    const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
    let profileMap = {};
    if (userIds.length > 0) {
      try {
        const pRes = await fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/profiles?id=in.(${userIds.join(',')})`, {
          headers: { apikey: anonKey }
        });
        const profs = await pRes.json();
        if (Array.isArray(profs)) {
          profs.forEach(p => { profileMap[p.id] = p; });
        }
      } catch (_) {}
    }

    listEl.innerHTML = comments.map(c => {
      const prof = profileMap[c.user_id] || {};
      const author = prof.full_name || (prof.email ? `@${prof.email.split('@')[0]}` : 'Annotator');
      const avatarUrl = prof.avatar_url;
      const initial = (author || 'A')[0].toUpperCase();
      const timeStr = c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
      const commentTargetUrl = `${currentDetailWebUrl}#comment-${c.id}`;

      const avatarMarkup = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`
        : `<div style="width: 18px; height: 18px; border-radius: 50%; background: var(--yellow); color: #000; font-size: 9px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0;">${initial}</div>`;

      return `
        <div class="widget-comment-card" data-url="${escapeHtml(commentTargetUrl)}" title="View comment on website" style="background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font-size: 11.5px; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 5px; overflow: hidden;">
              ${avatarMarkup}
              <strong style="color: var(--ink); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(author)}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
              <span style="font-size: 10px; color: var(--muted);">${timeStr}</span>
              <span class="widget-comment-link-icon" style="font-size: 11px; color: var(--muted); opacity: 0.7;">↗</span>
            </div>
          </div>
          <div style="color: var(--ink); line-height: 1.35; word-break: break-word; white-space: pre-wrap;">${escapeHtml(c.text || '')}</div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.widget-comment-card').forEach(card => {
      card.onmousedown = (e) => e.stopPropagation();
      card.onclick = (e) => {
        e.stopPropagation();
        const targetUrl = card.getAttribute('data-url');
        if (targetUrl) openExternalUrl(targetUrl);
      };
    });

    // Scroll to bottom of comments
    listEl.scrollTop = listEl.scrollHeight;
    setTimeout(() => {
      const neededHeight = Math.max(660, Math.min(820, document.body.scrollHeight + 15));
      resizeWidget(neededHeight);
    }, 50);
  } catch (err) {
    console.error('[Widget Comments] Failed to load:', err);
    if (countEl) countEl.textContent = '0';
  }
}

// Handle Comment Submission
const widgetCommentForm = $('#widgetCommentForm');
if (widgetCommentForm) {
  widgetCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please sign in to post a comment!');
      return;
    }

    const input = $('#widgetCommentInput');
    const submitBtn = $('#widgetCommentSubmitBtn');
    const statusEl = $('#widgetCommentStatus');
    const text = input ? input.value.trim() : '';

    if (!text || !currentDetailAnnotationId) return;

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Posting…'; }
    if (statusEl) statusEl.textContent = '';

    try {
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
      const res = await fetch('https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${supabase.token || anonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          annotation_id: currentDetailAnnotationId,
          user_id: currentUser.id,
          text: text
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to post comment');
      }

      if (input) input.value = '';
      if (statusEl) {
        statusEl.textContent = 'Posted!';
        statusEl.style.color = '#22c55e';
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
      }
      // Reload comments
      await loadWidgetComments(currentDetailAnnotationId);
    } catch (err) {
      console.error('[Widget Comments] Post error:', err);
      if (statusEl) {
        statusEl.textContent = err.message || 'Error posting';
        statusEl.style.color = '#ef4444';
      }
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Reply'; }
    }
  });
}

// Mic / Speech-to-Text for widget comment box
const widgetCommentMicBtn = $('#widgetCommentMicBtn');
if (widgetCommentMicBtn) {
  widgetCommentMicBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const commentInput = $('#widgetCommentInput');
    const statusEl = $('#widgetCommentStatus');
    if (!commentInput) return;

    if (isCommentDictating) {
      isCommentDictating = false;
      widgetCommentMicBtn.classList.remove('recording');
      if (statusEl) statusEl.textContent = '';
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'STOP_DICTATION' }, '*');
      }
    } else {
      if (isDictating) {
        stopDictationUI();
      }
      activeDictationTarget = 'comment';
      isCommentDictating = true;
      baseCommentReply = commentInput.value || '';
      if (baseCommentReply && !baseCommentReply.endsWith(' ') && !baseCommentReply.endsWith('\n')) {
        baseCommentReply += ' ';
      }
      widgetCommentMicBtn.classList.add('recording');
      if (statusEl) {
        statusEl.textContent = '🎙️ Listening…';
        statusEl.style.color = 'var(--muted)';
      }
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'START_DICTATION' }, '*');
      }
    }
  });
}


  window.addEventListener('message', (e) => {
    if (e.data?.type === 'PAGE_INFO_RESPONSE') {
      page = {
        title: e.data.title || page.title || 'Current page',
        url: e.data.url || page.url || location.href,
        hostname: e.data.hostname || page.hostname || 'youtube.com',
      };
      if ($('#pageHost')) $('#pageHost').textContent = (page.hostname || '').replace(/^www\./, '');
      if (e.data.selectedText || e.data.quote) setQuote(e.data.quote || e.data.selectedText);
      if (e.data.media_timestamp != null) currentMediaTimestamp = e.data.media_timestamp;
      loadFeedFromSupabase();
    }
  });
