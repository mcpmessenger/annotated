with open('extension/widget.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace publish-btn colors
css = css.replace(
    '.publish-btn{margin-top:15px;width:100%;padding:10px;border:0;border-radius:6px;background:#172631;color:#fff;font-weight:750;cursor:pointer}.publish-btn:disabled{background:#71808c;cursor:not-allowed}',
    '.publish-btn{margin-top:15px;width:100%;padding:10px;border:0;border-radius:6px;background:#000;color:#fff;font-weight:750;cursor:pointer;transition:background 0.2s}.publish-btn:disabled{background:#94a3b8;color:#e2e8f0;cursor:not-allowed}'
)

# Also ensure dark mode publish btn is styled nicely
if '[data-theme="dark"] .publish-btn' not in css:
    css += '\n[data-theme="dark"] .publish-btn { background: #fff; color: #000; }\n[data-theme="dark"] .publish-btn:disabled { background: #475569; color: #94a3b8; }\n'

with open('extension/widget.css', 'w', encoding='utf-8') as f:
    f.write(css)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.css', 'w', encoding='utf-8') as f:
    f.write(css)
