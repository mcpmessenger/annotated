import re
with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/content.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = re.compile(r'  const load = \(\) =>\s+chrome\.storage\.local\.get\(getKey\(\)\)\.then\(data => \{\s+state\.annotations = data\[getKey\(\)\] \|\| \[\];\s+state\.annotations\.forEach\(renderHighlight\);\s+\}\);')

replace = '''  const load = () => {
    chrome.storage.local.get(getKey()).then(data => {
      state.annotations = data[getKey()] || [];
      state.annotations.forEach(renderHighlight);
    });

    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?url=eq.${encodeURIComponent(location.href)}`, {
      headers: { 'apikey': anonKey }
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        data.forEach(ann => {
          if (!state.annotations.find(a => a.id === ann.id)) {
            state.annotations.push(ann);
            renderHighlight(ann);
          }
        });
      }
    })
    .catch(() => {});
  };'''

if pattern.search(text):
    text = pattern.sub(replace, text)
    with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/content.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Replaced')
else:
    print('Not found')
