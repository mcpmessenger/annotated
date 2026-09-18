with open('components/AnnotationCard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add audio player before ReactionRow
old_commentary_end = """      {/* Commentary */}
      <div className="mb-4">
        <p className={`text-base text-[hsl(var(--foreground))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
          {annotation.commentary}
        </p>
      </div>"""

new_commentary_end = """      {/* Commentary */}
      <div className="mb-4">
        <p className={`text-base text-[hsl(var(--foreground))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
          {annotation.commentary}
        </p>

        {annotation.audio_url && (
          <div className="mt-3 p-2 rounded bg-[hsl(var(--border))] border border-[hsl(var(--border))] relative z-20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--text-subtle))] mb-1">🎙️ Audio Commentary</p>
            <audio controls src={annotation.audio_url} className="w-full h-8" />
          </div>
        )}
      </div>"""

text = text.replace(old_commentary_end, new_commentary_end)

with open('components/AnnotationCard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
