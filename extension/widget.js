// ─── State ───────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
let page = { title: 'Current page', url: '', hostname: 'Current page' };
let quote = '', intent = null;
let mediaDataUrl = null, mediaType = null, mediaFileName = null;
let videoClipBlob = null;

let recordedAudioBlob = null;
let mediaRecorder = null;
let audioChunks = [];

let currentUser = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pageKey() {
  try { const u = new URL(page.url || 'https://annotated.com'); return `page:${u.origin}${u.pathname}`; }
  catch (_) { return 'page:https://annotated.com/'; }
}
function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function setQuote(value) {
  quote = String(value || '').trim();
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
  if (user.avatar) {
    $('#avatarEl').style.backgroundImage = `url(${user.avatar})`;
    $('#avatarEl').style.backgroundSize = 'cover';
    $('#avatarEl').textContent = '';
  }
  loadAnnotationCount();
  loadPage();
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
    chrome.tabs.create({ url: `https://annotated-six.vercel.app/u/${username}` });
  }
});

async function loadAnnotationCount() {
  if (!currentUser) return;
  try {
    const db = await supabase.from('annotations');
    const result = await db.select('id').eq('user_id', currentUser.id).execute();
    const count = Array.isArray(result) ? result.length : 0;
    const name = currentUser.email?.split('@')[0] || 'user';
    $('#profileMeta').textContent = `@${name} · ${count} annotation${count !== 1 ? 's' : ''}`;
  } catch (_) {
    const name = currentUser.email?.split('@')[0] || 'user';
    $('#profileMeta').textContent = `@${name}`;
  }
}

// ─── Feed ─────────────────────────────────────────────────────────────────────
function renderFeed(items) {
  $('#annotationCount').textContent = `${items.length} annotation${items.length === 1 ? '' : 's'}`;
  $('#feed').innerHTML = items.length
    ? items.slice().reverse().map(a => `
        <article class="annotation">
          <div class="aquote">"${escapeHtml(a.quote)}"</div>
          ${a.media_url ? `
            <div class="feed-media-wrap">
              ${a.media_type === 'video'
                ? `<video class="feed-media" src="${escapeHtml(a.media_url)}" controls playsinline></video>`
                : `<img class="feed-media" src="${escapeHtml(a.media_url)}" alt="Annotation media" loading="lazy">`
              }
            </div>` : ''}
          <div class="acomment">${escapeHtml(a.comment)}</div>
          <div class="meta">
            <span>${escapeHtml(a.intent)} · ${new Date(a.created_at || Date.now()).toLocaleDateString()}</span>
            <a href="https://annotated-six.vercel.app" target="_blank" rel="noopener">↗</a>
          </div>
        </article>`).join('')
    : '<div class="empty">Your annotations on this page will appear here.</div>';
}

async function loadFeedFromSupabase() {
  if (!currentUser) { renderFeed([]); return; }
  try {
    const db = await supabase.from('annotations');
    const items = await db.select('*').eq('url', page.url).execute();
    if (Array.isArray(items)) { renderFeed(items); return; }
  } catch (_) {}
  chrome.storage.local.get(pageKey(), data => renderFeed(data[pageKey()] || []));
}

// ─── Selection Handling ───────────────────────────────────────────────────────
function applySelection(selection) {
  if (!selection?.quote) return;
  page = {
    title: selection.title || page.title,
    url: selection.url || page.url,
    hostname: selection.hostname || page.hostname,
  };
  if ($('#pageHost')) $('#pageHost').textContent = page.hostname.replace(/^www\./, '');
  setQuote(selection.quote);
  loadFeedFromSupabase();
}

function loadPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs?.[0];
    if (!tab?.id) return;
    page = {
      title: tab.title || 'Current page',
      url: tab.url || 'https://annotated.com',
      hostname: (() => { try { return new URL(tab.url || '').hostname; } catch (_) { return 'Current page'; } })(),
    };
    if ($('#pageHost')) $('#pageHost').textContent = page.hostname.replace(/^www\./, '');
    chrome.storage.local.get(['pendingSelection', pageKey()], data => {
      if (data.pendingSelection && Date.now() - data.pendingSelection.timestamp < 120000) {
        applySelection(data.pendingSelection);
        chrome.storage.local.remove('pendingSelection');
      } else {
        loadFeedFromSupabase();
        chrome.tabs.sendMessage(tab.id, { type: 'getPageInfo' }, info => {
          if (!chrome.runtime.lastError && info?.selectedText) {
            applySelection({ ...info, url: page.url, hostname: page.hostname });
          }
        });
      }
    });
  });
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

let shouldTweetOnPublish = false;
if ($('#tweetBtn')) {
  $('#tweetBtn').addEventListener('click', () => {
    shouldTweetOnPublish = true;
    $('#publishBtn').click();
  });
}

// ─── Publish ──────────────────────────────────────────────────────────────────
$('#publishBtn').addEventListener('click', () => {
  if (!currentUser) return;

  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
    const tabId = tabs?.[0]?.id;
    if (!tabId) return;

    $('#publishBtn').disabled = true;
    $('#publishBtn').textContent = 'Publishing…';

    // Upload media first if attached
    let media_url = null;
    if (mediaDataUrl) {
      try {
        $('#uploadProgress').classList.remove('hidden');
        $('#progressLabel').textContent = 'Uploading media…';
        $('#progressFill').style.width = '40%';
        media_url = await supabase.uploadMedia(mediaDataUrl, mediaFileName || 'media');
        $('#progressFill').style.width = '100%';
        await new Promise(r => setTimeout(r, 300));
        $('#uploadProgress').classList.add('hidden');
      } catch (err) {
        $('#uploadProgress').classList.add('hidden');
        $('#status').textContent = `Media upload failed: ${err.message}`;
        $('#publishBtn').disabled = false;
        $('#publishBtn').innerHTML = ('Publish ' + '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>');
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
      const safeComment = ($('#comment') ? $('#comment').value.trim() : '') || (videoClipBlob ? 'Shared a video clip' : 'Annotation');
      const safeIntent = intent || 'Explainer';

      const annotation = {
        audio_url,
        media_url,
        media_type: media_type || (media_url ? mediaType : null),
        quote: safeQuote,
        comment: safeComment,
        intent: safeIntent,
        page_title: page.title,
        url: page.url,
        hostname: page.hostname,
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
      };

    // Save to Supabase
  try {
    const db = await supabase.from('annotations');
    const res = await db.insert(annotation);
    if (res.code || res.error || res.message) {
      $('#publishBtn').innerHTML = 'Publish';
      $('#publishBtn').disabled = false;
      $('#status').textContent = 'DB Error: ' + (res.message || res.error || JSON.stringify(res));
      return;
    }
  } catch (err) {
    $('#publishBtn').innerHTML = 'Publish';
    $('#publishBtn').disabled = false;
    $('#status').textContent = 'Error: ' + err.message;
    return;
  }

    // Also save locally for highlight rendering
    const localAnnotation = { ...annotation, id: crypto.randomUUID() };
    const finishPublish = () => {
      const key = pageKey();
      chrome.storage.local.get(key, data => {
        const items = [...(data[key] || []), localAnnotation];
        chrome.storage.local.set({ [key]: items }, () => {
          // Reset form
          $('#comment').value = ''; if ($('#counter')) $('#counter').textContent = '0';
          setQuote(''); intent = null;
          mediaDataUrl = null; mediaType = null; mediaFileName = null;
          videoClipBlob = null;
          if ($('#videoTrimmerBox')) $('#videoTrimmerBox').classList.add('hidden');
          if ($('#videoPreviewEl')) $('#videoPreviewEl').src = '';
          if ($('#clipVideoBtn')) $('#clipVideoBtn').innerText = '🎥 Clip Video';
          resizeWidget(450);
          if ($('#previewImg')) if ($('#previewImg')) $('#previewImg').src = ''; if ($('#previewVideo')) if ($('#previewVideo')) $('#previewVideo').src = '';
          if ($('#mediaInput')) if ($('#mediaInput')) $('#mediaInput').value = '';
          if ($('#mediaPreview')) if ($('#mediaPreview')) $('#mediaPreview').classList.add('hidden');
          if (document.querySelector('[data-intent]')) if (document.querySelector('[data-intent]')) document.querySelectorAll('[data-intent]').forEach(b => b.classList.remove('active'));
          $('#publishBtn').innerHTML = ('Publish ' + '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>');
          updateButton();

          loadFeedFromSupabase();
          loadAnnotationCount();
          
          const shareUrl = `https://twitter.com/intent/tweet?text=I%20just%20annotated%20this%20page!&url=https://annotated-repo.vercel.app/`;
          if (shouldTweetOnPublish) {
            window.open(shareUrl, '_blank');
            shouldTweetOnPublish = false;
          }
          $('#status').innerHTML = `Published! <br/>`;
          const shareBtn = document.createElement('a');
          shareBtn.href = shareUrl;
          shareBtn.target = '_blank';
          shareBtn.className = 'tweet-btn';
          shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Tweet Annotation`;
          $('#status').appendChild(shareBtn);
        });
      });
    };
    finishPublish();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) chrome.tabs.sendMessage(tabId, { type: 'saveAnnotation', annotation: localAnnotation }).catch(() => {});
    });
  });
});

// ─── UI Controls ─────────────────────────────────────────────────────────────
$('#comment').addEventListener('input', e => { if ($('#counter')) $('#counter').textContent = e.target.value.length; updateButton(); });
if (document.querySelector('[data-intent]')) if (document.querySelector('[data-intent]')) document.querySelectorAll('[data-intent]').forEach(btn => btn.addEventListener('click', () => {
  if (document.querySelector('[data-intent]')) if (document.querySelector('[data-intent]')) document.querySelectorAll('[data-intent]').forEach(b => b.classList.remove('active'));
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

// --- Nordic UI Dropdown & Dictation ---

const avatarEl = $('#avatarEl');
const userDropdown = $('#userDropdown');

if(avatarEl) {
  avatarEl.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    userDropdown.classList.add('hidden');
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
    trimDurationLabel.innerText = `${end - start}s clip (90s max)`;
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
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;

        if (isVideoRecording) {
          // Send stop message to content.js
          isVideoRecording = false;
          clipVideoBtn.innerText = '🎥 Finalizing 240p Clip...';
          clipVideoBtn.classList.remove('recording');
          chrome.tabs.sendMessage(tabId, { type: 'stopVideo' }, () => {});
        } else {
          // Start recording
          isVideoRecording = true;
          clipVideoBtn.innerText = '🛑 Stop Capture (Click anytime)';
          clipVideoBtn.classList.add('recording');

          const launchCapture = (streamId) => {
            chrome.tabs.sendMessage(tabId, {
              type: 'captureVideo',
              duration: 90,
              streamId: streamId || null
            }, (res) => {
              isVideoRecording = false;
              clipVideoBtn.classList.remove('recording');
              clipVideoBtn.innerText = '🎥 Clip Video';
              if (res && res.dataUrl) {
                fetch(res.dataUrl)
                  .then(r => r.blob())
                  .then(blob => {
                    videoClipBlob = blob;
                    if (videoPreviewEl) {
                      videoPreviewEl.src = URL.createObjectURL(blob);
                      videoPreviewEl.muted = false;
                      videoPreviewEl.volume = 1.0;
                    }
                    if (videoTrimmerBox) videoTrimmerBox.classList.remove('hidden');
                    const clipDuration = res.duration || 15;
                    if (trimStartInput) trimStartInput.value = 0;
                    if (trimEndInput) trimEndInput.value = clipDuration;
                    if (trimDurationLabel) trimDurationLabel.innerText = `${clipDuration}s clip (90s max)`;
                    resizeWidget(640);
                    updateButton();
                  });
              } else if (res && res.error) {
                alert(res.error);
              }
            });
          };

          // Try to acquire tab capture streamId with user gesture right here in the extension page
          if (chrome.tabCapture && chrome.tabCapture.getMediaStreamId) {
            try {
              chrome.tabCapture.getMediaStreamId({ targetTabId: tabId, consumerTabId: tabId }, (streamId) => {
                if (chrome.runtime.lastError || !streamId) {
                  launchCapture(null);
                } else {
                  launchCapture(streamId);
                }
              });
            } catch (_) {
              launchCapture(null);
            }
          } else {
            launchCapture(null);
          }
        }
      });
    });
  }

  if ($('#removeMediaBtn')) {
    $('#removeMediaBtn').addEventListener('click', (e) => {
      e.preventDefault();
      videoClipBlob = null;
      if (videoTrimmerBox) videoTrimmerBox.classList.add('hidden');
      if (videoPreviewEl) videoPreviewEl.src = '';
      if (clipVideoBtn) clipVideoBtn.innerText = '🎥 Clip Video';
      resizeWidget(450); // Reset widget height
      updateButton();
    });
  }

  const dictateBtn = $('#dictateBtn');
let recognition;
let isRecording = false;

if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false; // continuous sometimes stops abruptly, false makes it single-shot
  recognition.interimResults = true;

  let finalTranscript = '';
  
  recognition.onstart = () => {
    finalTranscript = $('#comment').value; // Store existing text
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    const commentInput = $('#comment');
    commentInput.value = finalTranscript + interimTranscript;
    updateButton(); // Not updateCounter() because updateButton does it
  };

  recognition.onerror = (e) => {
    console.error('Speech recognition error', e);
    stopDictation();
  };

  recognition.onend = () => {
    stopDictation(); // We set continuous to false so it stops after a phrase. User can click again.
  };
}

function stopDictation() {
  isRecording = false;
  if(dictateBtn) dictateBtn.classList.remove('recording');
  if (recognition) recognition.stop();
}

if (dictateBtn) {
  dictateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!recognition) {
      alert("Dictation is not supported in this browser.");
      return;
    }
    if (isRecording) {
      stopDictation();
    } else {
      isRecording = true;
      dictateBtn.classList.add('recording');
      recognition.start();
    }
  });
}



// Emojis
document.querySelectorAll('.emoji-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const c = document.querySelector('#comment');
    c.value = c.value + e.target.dataset.emoji;
    if (document.querySelector('#counter')) document.querySelector('#counter').textContent = c.value.length;
    updateButton();
  });
});

// --- Widget Dragging & Closing ---
const dragHandle = document.getElementById('dragHandle');
if (dragHandle) {
  dragHandle.addEventListener('mousedown', (e) => {
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
  // Override window.close() behavior for iframe
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.parent.postMessage({ type: 'CLOSE_WIDGET' }, '*');
  });
}









  // Open website on logo click
  if ($('#brandLogo')) $('#brandLogo').addEventListener('click', () => window.open('https://annotated-repo.vercel.app', '_blank'));
  if ($('#authBrandLogo')) $('#authBrandLogo').addEventListener('click', () => window.open('https://annotated-repo.vercel.app', '_blank'));
