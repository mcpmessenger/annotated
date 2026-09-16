// ─── State ───────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
let page = { title: 'Current page', url: '', hostname: 'Current page' };
let quote = '', intent = '', clip = false;
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
  $('#publishBtn').disabled = !(quote && $('#comment').value.trim() && intent && currentUser);
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
  try {
    const session = await supabase.signInWithGoogle();
    const user = supabase.userFromSession(session);
    if (user) showApp(user);
  } catch (err) {
    $('#authError').textContent = `Sign-in failed: ${err}`;
    $('#authError').classList.remove('hidden');
  } finally {
    $('#signInBtn').disabled = false;
    $('#signInBtn').innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Sign in with Google`;
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
    // Supabase not configured yet — fall back gracefully
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
  // Fallback to local storage
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
  $('#pageHost').textContent = page.hostname.replace(/^www\./, '');
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
    $('#pageHost').textContent = page.hostname.replace(/^www\./, '');
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

// ─── Publish ──────────────────────────────────────────────────────────────────
$('#publishBtn').addEventListener('click', () => {
  if (!currentUser) return;
  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
    const tabId = tabs?.[0]?.id;
    if (!tabId) return;

    const annotation = {
      quote,
      comment: $('#comment').value.trim(),
      intent,
      clip,
      page_title: page.title,
      url: page.url,
      hostname: page.hostname,
      user_id: currentUser.id,
      created_at: new Date().toISOString(),
    };

    // Save to Supabase
    try {
      const db = await supabase.from('annotations');
      await db.insert(annotation);
    } catch (_) {}

    // Also save locally for highlight rendering
    const localAnnotation = { ...annotation, id: crypto.randomUUID() };
    chrome.tabs.sendMessage(tabId, { type: 'saveAnnotation', annotation: localAnnotation }, () => {
      const key = pageKey();
      chrome.storage.local.get(key, data => {
        const items = [...(data[key] || []), localAnnotation];
        chrome.storage.local.set({ [key]: items }, () => {
          loadFeedFromSupabase();
          $('#status').textContent = 'Published to your annotation layer ✓';
          $('#comment').value = ''; $('#counter').textContent = '0';
          setQuote(''); intent = ''; clip = false;
          document.querySelectorAll('[data-intent]').forEach(b => b.classList.remove('active'));
          $('#clipEditor').classList.add('hidden'); $('#clipBtn').textContent = 'Add clip';
          updateButton();
          loadAnnotationCount();
          setTimeout(() => $('#status').textContent = '', 3000);
        });
      });
    });
  });
});

// ─── UI Controls ─────────────────────────────────────────────────────────────
$('#comment').addEventListener('input', e => { $('#counter').textContent = e.target.value.length; updateButton(); });
document.querySelectorAll('[data-intent]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-intent]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); intent = btn.dataset.intent; updateButton();
}));
$('#clipBtn').addEventListener('click', () => { clip = true; $('#clipEditor').classList.remove('hidden'); $('#clipBtn').textContent = 'Added'; });
$('#removeClip').addEventListener('click', () => { clip = false; $('#clipEditor').classList.add('hidden'); $('#clipBtn').textContent = 'Add clip'; });
$('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('#refreshBtn').addEventListener('click', loadPage);
$('#closeBtn').addEventListener('click', () => window.close());

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#themeBtn').textContent = theme === 'dark' ? '☀' : '☾';
  $('#themeBtn').title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  chrome.storage.local.set({ theme });
}

// ─── Message listener for live selection relay ────────────────────────────────
chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'selection') applySelection(message);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  chrome.storage.local.get('theme', data => setTheme(data.theme || 'light'));

  // Try restoring an existing Supabase session
  const session = await supabase.restoreSession();
  if (session) {
    const user = supabase.userFromSession(session);
    if (user) { showApp(user); return; }
  }
  showAuth();
})();
