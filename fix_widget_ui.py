with open('extension/widget.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_html = html.replace("""    <div class="intents" style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px;">
      <button data-intent="Hot Take" class="active">Hot Take</button>
      <button data-intent="Fact Check">Fact Check</button>
      <button data-intent="Steelmanning">Steelmanning</button>
      <button data-intent="Receipts">Receipts</button>
      <button data-intent="Explainer">Explainer</button>
    </div>""", """    <div class="intents" style="display: flex; gap: 8px; margin-bottom: 16px; justify-content: space-between;">
      <button data-intent="🔥" class="emoji-btn" title="Hot Take">🔥</button>
      <button data-intent="🤔" class="emoji-btn" title="Question">🤔</button>
      <button data-intent="💡" class="emoji-btn" title="Idea/Explainer">💡</button>
      <button data-intent="💯" class="emoji-btn" title="Receipts/Truth">💯</button>
      <button data-intent="👎" class="emoji-btn" title="Critique">👎</button>
    </div>""")

new_html = new_html.replace("""    button[data-intent].active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }""", """    button[data-intent] {
      font-size: 24px;
      padding: 8px;
      border-radius: 50%;
      border: 2px solid transparent;
      background: var(--bg);
      cursor: pointer;
      transition: all 0.2s;
    }
    button[data-intent]:hover {
      transform: scale(1.1);
    }
    button[data-intent].active {
      border-color: var(--accent);
      background: var(--border);
    }""")

with open('extension/widget.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
