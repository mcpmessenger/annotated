# -*- coding: utf-8 -*-
with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/layout.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('Annotated — Editorial', 'Annotated - Editorial')
text = text.replace('Annotated ? Editorial', 'Annotated - Editorial')

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/app/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
