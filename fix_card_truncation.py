with open('components/AnnotationCard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('line-clamp-3 relative z-10', 'relative z-10 whitespace-pre-wrap')
text = text.replace('line-clamp-2 mb-4 relative z-10', 'mb-4 relative z-10 whitespace-pre-wrap')

with open('components/AnnotationCard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
