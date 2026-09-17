import re

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<div className="flex items-center justify-center w-8 h-8 rounded bg-[hsl(var(--accent))] text-[hsl(var(--background))]"><PencilLine size={18} strokeWidth={2.5} /></div>', '<PencilLine size={24} strokeWidth={2.5} className="text-[hsl(var(--accent))]" />')

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
