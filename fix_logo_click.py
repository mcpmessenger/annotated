with open('extension/widget.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Make brand logos clickable
html = html.replace(
    '<div class="brand">',
    '<div class="brand" id="brandLogo" style="cursor: pointer;" title="Open Annotated Website">'
)
html = html.replace(
    '<div class="auth-logo">',
    '<div class="auth-logo" id="authBrandLogo" style="cursor: pointer;" title="Open Annotated Website">'
)

with open('extension/widget.html', 'w', encoding='utf-8') as f:
    f.write(html)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('extension/widget.js', 'r', encoding='utf-8') as f:
    js = f.read()

click_listener = """
  // Open website on logo click
  if ($('#brandLogo')) $('#brandLogo').addEventListener('click', () => window.open('https://annotated-repo.vercel.app', '_blank'));
  if ($('#authBrandLogo')) $('#authBrandLogo').addEventListener('click', () => window.open('https://annotated-repo.vercel.app', '_blank'));
"""

if "window.open('https://annotated-repo.vercel.app', '_blank')" not in js:
    js += click_listener

with open('extension/widget.js', 'w', encoding='utf-8') as f:
    f.write(js)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.js', 'w', encoding='utf-8') as f:
    f.write(js)

