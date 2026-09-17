with open('extension/widget.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = """  }
});
}"""

replacement = """  }
}"""

text = text.replace(target, replacement)

with open('extension/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)

