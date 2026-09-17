import re

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/widget.js', 'r', encoding='utf-8') as f:
    text = f.read()

# We just want to replace the whole chrome.tabs.query down to the end of the publishBtn event listener.
pattern = re.compile(r'    chrome\.tabs\.query\(\{ active: true, currentWindow: true \}, \(tabs\) => \{[\s\S]*?\n\}\);\n\n// --- UI Controls.*')

replace = '''    const key = pageKey();
    chrome.storage.local.get(key, data => {
      const items = [...(data[key] || []), localAnnotation];
      chrome.storage.local.set({ [key]: items }, () => {
        // Reset form
        document.querySelector('#comment').value = ''; if (document.querySelector('#counter')) document.querySelector('#counter').textContent = '0';
        setQuote(''); intent = 'Hot Take';
        mediaDataUrl = null; mediaType = null; mediaFileName = null;
        if (document.querySelector('#previewImg')) document.querySelector('#previewImg').src = ''; if (document.querySelector('#previewVideo')) document.querySelector('#previewVideo').src = '';
        if (document.querySelector('#mediaInput')) document.querySelector('#mediaInput').value = '';
        if (document.querySelector('#mediaPreview')) document.querySelector('#mediaPreview').classList.add('hidden');
        if (document.querySelector('[data-intent]')) document.querySelectorAll('[data-intent]').forEach(b => b.classList.remove('active'));
        document.querySelector('#publishBtn').innerHTML = 'Publish';
        updateButton();

        if (document.querySelector('#feed')) loadFeedFromSupabase();
        if (document.querySelector('#annotationCount')) loadAnnotationCount();
        
        const shareUrl = "https://twitter.com/intent/tweet?text=I%20just%20annotated%20this%20page!&url=https://annotated-repo.vercel.app/";
        if (shouldTweetOnPublish) {
          window.open(shareUrl, '_blank');
          shouldTweetOnPublish = false;
        }
        document.querySelector('#status').innerHTML = "Published! <br/>";
        const shareBtn = document.createElement('a');
        shareBtn.href = shareUrl;
        shareBtn.target = '_blank';
        shareBtn.className = 'tweet-btn';
        shareBtn.innerHTML = "<svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'><path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/></svg> Tweet Annotation";
        document.querySelector('#status').appendChild(shareBtn);
      });
    });

    // Best effort to send message to active tab to render highlight immediately
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        try {
            chrome.tabs.sendMessage(tabId, { type: 'saveAnnotation', annotation: localAnnotation });
        } catch (_) {}
      }
    });
});

// --- UI Controls ------------------------------------------------------------'''

if pattern.search(text):
    text = pattern.sub(replace, text)
    with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/widget.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Replaced')
else:
    print('Not found')
