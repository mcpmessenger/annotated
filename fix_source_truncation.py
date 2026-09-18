with open('components/AnnotationCard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_source = """        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(var(--border))]/50">
          <p className="text-xs text-[hsl(var(--text-subtle))]">
            from{" "}
            <a href={annotation.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--accent))] hover:underline font-medium relative z-20">
              {annotation.sourceTitle}
            </a>
          </p>"""

new_source = """        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(var(--border))]/50">
          <p className="text-xs text-[hsl(var(--text-subtle))] flex items-center gap-1 max-w-[70%]">
            <span>from</span>
            <a 
              href={annotation.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[hsl(var(--accent))] hover:underline font-medium relative z-20 truncate max-w-[260px] inline-block align-bottom"
              title={annotation.sourceTitle}
            >
              {annotation.sourceDomain || (annotation.sourceTitle.length > 45 ? annotation.sourceTitle.slice(0, 45) + '...' : annotation.sourceTitle)}
            </a>
          </p>"""

text = text.replace(old_source, new_source)

with open('components/AnnotationCard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
