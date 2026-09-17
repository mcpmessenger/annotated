with open('components/CommentSection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { CommentReactionRow } from "./CommentReactionRow";\n\'use client\';', '\'use client\';\nimport { CommentReactionRow } from "./CommentReactionRow";')

with open('components/CommentSection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
