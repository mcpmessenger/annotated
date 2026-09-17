with open('extension/widget.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("let quote = '', intent = '🔥';", "let quote = '', intent = null;")
# In powershell it might be read as utf8 but let's be careful. Let's just use regex.
import re
text = re.sub(r"let quote = '', intent = '[^']*';", "let quote = '', intent = null;", text)

text = text.replace("setQuote(''); intent = '';", "setQuote(''); intent = null;")

with open('extension/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)
