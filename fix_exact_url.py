with open('extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()

get_exact_url_func = """  const getExactSourceUrl = () => {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchorNode = selection.anchorNode;
        const element = anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
        const tweetArticle = element?.closest('article[data-testid="tweet"]');
        if (tweetArticle) {
          const statusLink = tweetArticle.querySelector('a[href*="/status/"]');
          if (statusLink) {
            const href = statusLink.getAttribute('href');
            if (href) return href.startsWith('http') ? href : `https://x.com${href}`;
          }
        }
      }
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href) return canonical.href;
    } catch (_) {}
    return location.href;
  };
"""

# Inject helper after load definition or near top
text = text.replace('const load = () => {', get_exact_url_func + '\n  const load = () => {')

# Replace payload url: location.href with url: getExactSourceUrl()
text = text.replace('url: location.href,', 'url: getExactSourceUrl(),')

with open('extension/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/content.js', 'w', encoding='utf-8') as f:
    f.write(text)
