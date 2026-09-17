import re

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the corrupted ?? with Lucide icons
text = text.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { Sun, Moon } from "lucide-react";')
text = text.replace('{theme === "dark" ? "??" : "??"}', '{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}')

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)


with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/page.tsx', 'r', encoding='utf-8') as f:
    text2 = f.read()

text2 = text2.replace('View all annotations ?', 'View all annotations ->')

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text2)
