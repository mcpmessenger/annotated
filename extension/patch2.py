with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/widget.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('\.appendChild(shareBtn);', '$(\'#status\').appendChild(shareBtn);')

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)
