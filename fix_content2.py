import re
with open('extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'mark\.title = `\$\{annotation\.intent \|\| \'Annotation\'\}.+?;', 'mark.title = `${annotation.intent || \'Annotation\'} — ${annotation.commentary || annotation.comment || \'\'}`;', text)

with open('extension/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
