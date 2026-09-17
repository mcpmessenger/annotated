with open('extension/widget.js', 'r', encoding='utf-8') as f:
    js_text = f.read()

moon_svg = '`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`'
sun_svg = '`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`'

js_replace = "function setTheme(theme) {\n  document.documentElement.dataset.theme = theme;\n  chrome.storage.local.set({ theme });\n  if (theme === 'dark') {\n    $('#themeBtn').innerHTML = " + sun_svg + ";\n  } else {\n    $('#themeBtn').innerHTML = " + moon_svg + ";\n  }\n}"

import re
js_text = re.sub(r'function setTheme\(theme\).*?\}', js_replace, js_text, flags=re.DOTALL)

with open('extension/widget.js', 'w', encoding='utf-8') as f:
    f.write(js_text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.js', 'w', encoding='utf-8') as f:
    f.write(js_text)

