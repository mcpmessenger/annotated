with open('extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update load function to use cleanUrl and ilike query
old_load = """    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?url=eq.${encodeURIComponent(location.href)}`, {
      headers: { 'apikey': anonKey }
    })"""

new_load = """    const cleanUrl = location.origin + location.pathname;
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?url=ilike.${encodeURIComponent('%' + cleanUrl + '%')}`, {
      headers: { 'apikey': anonKey }
    })"""

text = text.replace(old_load, new_load)

# 2. Update renderHighlight to support phrase fallback for multi-node tweets
old_render = """  const renderHighlight = (annotation) => {
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
  };"""

new_render = """  const renderHighlight = (annotation) => {
    const quote = annotation.quote || annotation.quote_text;
    if (!quote || !document.body) return false;
    if (document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) return true;

    const targetText = quote.trim();
    const searchPhrases = [targetText];
    if (targetText.length > 25) {
      searchPhrases.push(targetText.slice(0, 25));
    }

    for (const phrase of searchPhrases) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const index = node.nodeValue.indexOf(phrase);
        if (index !== -1 && !node.parentElement?.closest('[data-annotated-highlight]')) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + phrase.length);
          const mark = document.createElement('mark');
          mark.dataset.annotatedHighlight = annotation.id;
          mark.className = 'annotated-highlight';
          mark.title = `${annotation.intent || 'Annotation'} - ${annotation.commentary || annotation.comment || ''}`;
          try { 
            range.surroundContents(mark); 
            return true; 
          } catch (_) {}
        }
      }
    }
    return false;
  };"""

text = text.replace(old_render, new_render)

with open('extension/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/content.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated content.js successfully!")
