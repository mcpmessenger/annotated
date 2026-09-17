with open('extension/widget.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# We want to replace everything from `function setTheme(theme)` up to `// 💬 Message listener`
correct_block = """function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  chrome.storage.local.set({ theme });
  if (theme === 'dark') {
    $('#themeBtn').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
  } else {
    $('#themeBtn').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
  }
}

// 💬 Message listener"""

text = re.sub(r'function setTheme\(theme\).*?// 💬 Message listener', correct_block, text, flags=re.DOTALL)

with open('extension/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)

