const fs = require('fs');
let code = fs.readFileSync('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/widget.js', 'utf8');

const targetStr = "    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {\r\n      const tabId = tabs[0]?.id;\r\n      if (!tabId) return;\r\n      chrome.tabs.sendMessage(tabId, { type: 'saveAnnotation', annotation: localAnnotation }, () => {\r\n        const key = pageKey();\r\n        chrome.storage.local.get(key, data => {\r\n          const items = [...(data[key] || []), localAnnotation];\r\n          chrome.storage.local.set({ [key]: items }, () => {";

const newStr = "    const key = pageKey();\r\n    chrome.storage.local.get(key, data => {\r\n      const items = [...(data[key] || []), localAnnotation];\r\n      chrome.storage.local.set({ [key]: items }, () => {\r\n        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {\r\n          const tabId = tabs[0]?.id;\r\n          if (tabId) chrome.tabs.sendMessage(tabId, { type: 'saveAnnotation', annotation: localAnnotation }).catch(() => {});\r\n        });";

if (code.includes(targetStr)) {
  let newCode = code.replace(targetStr, newStr);
  newCode = newCode.replace("          $('#status').appendChild(shareBtn);\r\n        });\r\n      });\r\n    });\r\n  });\r\n});", "          $('#status').appendChild(shareBtn);\r\n      });\r\n    });\r\n});");
  fs.writeFileSync('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/extension/widget.js', newCode);
  console.log('Replaced');
} else {
  console.log('Target string not found');
}
