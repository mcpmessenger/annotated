with open('extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()

new_render = """  const renderHighlight = (annotation) => {
    const quote = annotation.quote || annotation.quote_text;
    if (!quote || !document.body) return false;
    
    // Check if already highlighted
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

  // Keep trying to render highlights every second (useful for SPAs like Twitter)
  setInterval(() => {
    state.annotations.forEach(ann => {
      renderHighlight(ann);
    });
  }, 1000);"""

text = text.replace("""  const renderHighlight = (annotation) => {
    const quote = annotation.quote || annotation.quote_text;
    if (!quote || !document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.nodeValue.indexOf(quote);
      if (index !== -1 && !node.parentElement?.closest('[data-annotated-highlight]')) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + quote.length);
        const mark = document.createElement('mark');
        mark.dataset.annotatedHighlight = annotation.id;
        mark.className = 'annotated-highlight';
        mark.title = `${annotation.intent || 'Annotation'} ?" ${annotation.commentary || annotation.comment || ''}`;
        try { range.surroundContents(mark); } catch (_) {}
        break;
      }
    }
  };""", new_render)

with open('extension/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
