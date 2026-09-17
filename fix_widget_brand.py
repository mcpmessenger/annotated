with open('extension/widget.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '<div class="auth-logo"><span class="brand-mark large">✏</span><span class="auth-title">annotated<span class="dot">.</span></span></div>',
    '<div class="auth-logo"><img src="assets/icon-32.png" width="32" height="32" style="vertical-align: middle; margin-right: 8px;"><span class="auth-title">annotated<span class="dot">.</span></span></div>'
)

with open('extension/widget.html', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.html', 'w', encoding='utf-8') as f:
    f.write(text)
