with open('extension/widget.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Find the emoji bar and replace its buttons
old_emoji_bar = r'<button class="emoji-btn" data-emoji=".*?">.*?</button>\s*<button class="emoji-btn" data-emoji=".*?">.*?</button>\s*<button class="emoji-btn" data-emoji=".*?">.*?</button>\s*<button class="emoji-btn" data-emoji=".*?">.*?</button>\s*<button class="emoji-btn" data-emoji=".*?">.*?</button>'

new_emoji_bar = """<button class="emoji-btn" data-emoji="🔥">🔥</button>
          <button class="emoji-btn" data-emoji="🤔">🤔</button>
          <button class="emoji-btn" data-emoji="💡">💡</button>
          <button class="emoji-btn" data-emoji="💯">💯</button>
          <button class="emoji-btn" data-emoji="👎">👎</button>"""

text = re.sub(old_emoji_bar, new_emoji_bar, text)

with open('extension/widget.html', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.html', 'w', encoding='utf-8') as f:
    f.write(text)
