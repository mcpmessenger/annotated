with open('app/[username]/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the old intent mapping logic if it's there
old_intent_block = """          {annotation.intent && intentLabels[annotation.intent] && (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${intentColors[annotation.intent]}`}>
              {intentLabels[annotation.intent]}
            </span>
          )}"""

new_intent_block = """          {annotation.intent && (
            <span className="text-2xl bg-[hsl(var(--border))] rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
              {annotation.intent}
            </span>
          )}"""

text = text.replace(old_intent_block, new_intent_block)

with open('app/[username]/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
