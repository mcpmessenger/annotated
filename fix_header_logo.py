with open('components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace PencilLine in logo with img src="/logo.png"
text = text.replace(
    '<PencilLine size={24} strokeWidth={2.5} className="text-[hsl(var(--accent))]" />',
    '<img src="/logo.png" alt="Annotated" className="w-6 h-6 object-contain" />'
)

with open('components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
