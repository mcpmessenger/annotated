with open('extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace('if (!annotation.quote || !document.body) return;', 'const quote = annotation.quote || annotation.quote_text;\n    if (!quote || !document.body) return;')
text = text.replace('const index = node.nodeValue.indexOf(annotation.quote);', 'const index = node.nodeValue.indexOf(quote);')
text = text.replace('range.setEnd(node, index + annotation.quote.length);', 'range.setEnd(node, index + quote.length);')
with open('extension/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
