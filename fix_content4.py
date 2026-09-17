import re
with open('extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()

new_func = """  const renderHighlight = (annotation) => {
    const quote = annotation.quote || annotation.quote_text;
    if (!quote || !document.body) return false;
    if (document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) return true;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    let found = false;
    while ((node = walker.nextNode())) {
      const index = node.nodeValue.indexOf(quote);
      if (index !== -1 && !node.parentElement?.closest('[data-annotated-highlight]')) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + quote.length);
        const mark = document.createElement('mark');
        mark.dataset.annotatedHighlight = annotation.id;
        mark.className = 'annotated-highlight';
        mark.title = `${annotation.intent || 'Annotation'} - ${annotation.commentary || annotation.comment || ''}`;
        try { range.surroundContents(mark); found = true; } catch (_) {}
        break;
      }
    }
    return found;
  };

  setInterval(() => {
    state.annotations.forEach(ann => renderHighlight(ann));
  }, 1000);"""

text = re.sub(r'  const renderHighlight = \(annotation\) => \{.+?  \};\n', new_func + '\n', text, flags=re.DOTALL)

with open('extension/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
