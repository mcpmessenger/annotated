with open('components/AnnotationCard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if '"use client"' not in text:
    text = '"use client";\n\nimport { useState } from "react";\n' + text
else:
    if 'import { useState }' not in text:
        text = text.replace('"use client";', '"use client";\nimport { useState } from "react";')

# Inject state
text = text.replace('export function AnnotationCard({ annotation }: { annotation: Annotation }) {', 'export function AnnotationCard({ annotation }: { annotation: Annotation }) {\n  const [isExpanded, setIsExpanded] = useState(false);\n')

# Replace Quote block
old_quote = """        <p className="text-sm italic text-[hsl(var(--text-muted))] relative z-10 whitespace-pre-wrap">
          &ldquo;{annotation.quoteText}&rdquo;
        </p>"""

new_quote = """        <div className="relative z-20">
          <p className={`text-sm italic text-[hsl(var(--text-muted))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
            &ldquo;{annotation.quoteText}&rdquo;
          </p>
        </div>"""
text = text.replace(old_quote, new_quote)
# Or if the previous code was line-clamp-3:
text = text.replace("""        <p className="text-sm italic text-[hsl(var(--text-muted))] line-clamp-3 relative z-10 whitespace-pre-wrap">
          &ldquo;{annotation.quoteText}&rdquo;
        </p>""", new_quote)

# Replace Commentary block
old_commentary = """      <p className="mb-4 relative z-10 whitespace-pre-wrap text-base text-[hsl(var(--foreground))]">
        {annotation.commentary}
      </p>"""
old_commentary2 = """      <p className="text-base text-[hsl(var(--foreground))] mb-4 relative z-10 whitespace-pre-wrap">
        {annotation.commentary}
      </p>"""

new_commentary = """      <div className="relative z-20 mb-4">
        <p className={`text-base text-[hsl(var(--foreground))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
          {annotation.commentary}
        </p>
        {(annotation.quoteText.length > 150 || annotation.commentary.length > 100) && (
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="text-[hsl(var(--accent))] text-sm font-medium hover:underline mt-1"
          >
            {isExpanded ? "See less" : "See more"}
          </button>
        )}
      </div>"""

# Try both forms of old commentary since we modified it earlier
if old_commentary in text:
    text = text.replace(old_commentary, new_commentary)
elif old_commentary2 in text:
    text = text.replace(old_commentary2, new_commentary)
else:
    # Just regex it
    import re
    text = re.sub(r'<p className="[^"]*?text-base text-\[hsl\(var\(--foreground\)\)\][^"]*?whitespace-pre-wrap[^"]*?">\s*\{annotation\.commentary\}\s*</p>', new_commentary, text, flags=re.DOTALL)

with open('components/AnnotationCard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
