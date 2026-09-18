with open('lib/types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'media_url?: string | null;',
    'media_url?: string | null;\n  audio_url?: string | null;'
)

with open('lib/types.ts', 'w', encoding='utf-8') as f:
    f.write(text)
