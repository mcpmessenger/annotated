import json

with open('extension/manifest.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if "sidePanel" not in data.get("permissions", []):
    data["permissions"].append("sidePanel")

data["side_panel"] = {
    "default_path": "widget.html"
}

with open('extension/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

with open('extension/background.js', 'r', encoding='utf-8') as f:
    bg = f.read()

# Enable sidepanel on action click
bg_sidepanel = """// Enable side panel on action click
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}
"""

if "setPanelBehavior" not in bg:
    bg = bg_sidepanel + "\n" + bg

with open('extension/background.js', 'w', encoding='utf-8') as f:
    f.write(bg)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/background.js', 'w', encoding='utf-8') as f:
    f.write(bg)

print("SidePanel API enabled in manifest and background.js!")
