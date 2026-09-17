with open('app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('px-6 py-3 rounded font-medium', 'px-6 py-3 rounded-[6px] font-medium')

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
