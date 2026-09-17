with open('components/CommentSection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add CommentReactionRow import
if 'CommentReactionRow' not in text:
    text = 'import { CommentReactionRow } from "./CommentReactionRow";\n' + text

# Ensure QUICK_EMOJIS is utf-8 clean
import re
text = re.sub(
    r'const QUICK_EMOJIS = \[.*?\];',
    'const QUICK_EMOJIS = ["🔥", "🤔", "💡", "💯", "👎"];',
    text
)

# Insert CommentReactionRow below comment text
old_p = '<p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap pl-8">{comment.text}</p>'
new_p = '<p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap pl-8">{comment.text}</p>\n            <CommentReactionRow commentId={comment.id} />'

text = text.replace(old_p, new_p)

with open('components/CommentSection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
