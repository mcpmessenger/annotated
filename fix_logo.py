import re

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the img tag with a Lucide React icon!
# <img src="/logo.png" alt="Annotated Logo" className="w-8 h-8 rounded" />
text = text.replace('import { Sun, Moon } from "lucide-react";', 'import { Sun, Moon, PencilLine } from "lucide-react";')
text = text.replace('<img src="/logo.png" alt="Annotated Logo" className="w-8 h-8 rounded" />', '<div className="flex items-center justify-center w-8 h-8 rounded bg-[hsl(var(--accent))] text-[hsl(var(--background))]"><PencilLine size={18} strokeWidth={2.5} /></div>')

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
