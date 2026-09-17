import sys
with open(r'C:\Users\senti\OneDrive\Desktop\Extensions\Annotated\annotated-repo\extension\sidepanel.js', 'r', encoding='utf-8') as f:
    js = f.read()

share_html = 'Published! &middot; <a href="https://twitter.com/intent/tweet?text=I%20just%20annotated%20this%20page!&url=https://annotated-repo.vercel.app/" target="_blank" style="color: #1da1f2; font-weight: bold; text-decoration: underline; pointer-events: auto;">Share on X</a>'

# The unicode characters might be parsed differently so let's just do a blanket replace of status assignment
import re
js = re.sub(r"\#status'\)\.textContent = media_url\s*\?\s*'.*?'\s*:\s*'.*?';", f\"#status').innerHTML = '{share_html}';\", js, flags=re.DOTALL)
js = js.replace(\"setTimeout(() => #status.textContent = '', 3000);\", \"// timeout removed\")

with open(r'C:\Users\senti\OneDrive\Desktop\Extensions\Annotated\annotated-repo\extension\sidepanel.js', 'w', encoding='utf-8') as f:
    f.write(js)
