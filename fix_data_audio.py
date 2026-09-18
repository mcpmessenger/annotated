with open('lib/data.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'media_url: row.media_url,',
    'media_url: row.media_url,\n      audio_url: row.audio_url,'
)

with open('lib/data.ts', 'w', encoding='utf-8') as f:
    f.write(text)
