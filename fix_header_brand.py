with open('components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_brand = """        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-[hsl(var(--text-muted))] transition-colors">
          <img src="/logo.png" alt="Annotated" className="w-6 h-6 object-contain" />
          Annotated
        </Link>"""

new_brand = """        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="annotated." className="w-6 h-6 object-contain" />
          <span>annotated<span className="text-[hsl(var(--accent))] font-black">.</span></span>
        </Link>"""

text = text.replace(old_brand, new_brand)

with open('components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
