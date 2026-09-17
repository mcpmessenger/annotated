import re
with open('app/[username]/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add CommentSection to the bottom of the article
text = re.sub(
    r'(</footer>)',
    r'\1\n          <CommentSection annotationId={annotation.id} />',
    text
)

# Replace the intentLabels/intentColors logic with the raw emoji intent
text = re.sub(
    r'<span\s+className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap \${\s*intentColors\[annotation\.intent\]\s*}`}\s*>\s*\{intentLabels\[annotation\.intent\]\}\s*</span>',
    r'{annotation.intent && (\n              <span className="text-2xl bg-[hsl(var(--border))] rounded-full w-10 h-10 flex items-center justify-center shadow-sm">\n                {annotation.intent}\n              </span>\n            )}',
    text
)

# Add ReactionRow above Commentary
text = re.sub(
    r'(<section className="mb-12">\s*<p className="text-xs text-\[hsl\(var\(--text-subtle\)\)\] uppercase tracking-wide mb-3">\s*Commentary\s*</p>)',
    r'<div className="mb-8">\n            <ReactionRow annotationId={annotation.id} />\n          </div>\n          \1',
    text
)

with open('app/[username]/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
