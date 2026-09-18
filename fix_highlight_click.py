with open('extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Add hover style injection near top of content.js
style_injection = """
  // Inject custom highlight styles into document
  if (!document.getElementById('annotated-highlight-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'annotated-highlight-style';
    styleEl.textContent = `
      .annotated-highlight {
        background-color: #ffd21a !important;
        color: #000 !important;
        cursor: pointer !important;
        border-radius: 3px;
        padding: 0 2px;
        transition: all 0.2s ease;
      }
      .annotated-highlight:hover {
        background-color: #f0c400 !important;
        box-shadow: 0 0 10px rgba(255, 210, 26, 0.8);
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }
"""

text = text.replace('const load = () => {', style_injection + '\n  const load = () => {')

# Update renderHighlight to attach click listener and website redirect
old_mark_code = """            const mark = document.createElement('mark');
            mark.dataset.annotatedHighlight = annotation.id;
            mark.className = 'annotated-highlight';
            mark.title = `${annotation.intent || 'Annotation'} - ${annotation.commentary || annotation.comment || ''}`;
            try { 
              range.surroundContents(mark); 
              return true; 
            } catch (_) {}"""

new_mark_code = """            const mark = document.createElement('mark');
            mark.dataset.annotatedHighlight = annotation.id;
            mark.className = 'annotated-highlight';
            const commentary = annotation.commentary || annotation.comment || 'Annotation';
            const intent = annotation.intent ? `${annotation.intent} ` : '';
            mark.title = `${intent}"${commentary}" — Click to view on Annotated`;
            mark.style.cursor = 'pointer';

            mark.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const username = annotation.username || annotation.profiles?.username || 'u';
              const slug = annotation.slug || annotation.id;
              const targetUrl = (slug && username) 
                ? `https://annotated-repo.vercel.app/${username}/${slug}` 
                : 'https://annotated-repo.vercel.app';
              window.open(targetUrl, '_blank');
            });

            try { 
              range.surroundContents(mark); 
              return true; 
            } catch (_) {}"""

text = text.replace(old_mark_code, new_mark_code)

with open('extension/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/content.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated content.js with highlight click listener!")
