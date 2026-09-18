with open('components/AnnotationCard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add File a Claim button to footer row in AnnotationCard
old_footer = """        <Link
          href={`${detailLink}#comments`}
          className="flex items-center gap-1.5 font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors relative z-20"
        >
          <MessageSquare size={14} />
          <span>Comments</span>
        </Link>
      </div>"""

new_footer = """        <div className="flex items-center gap-4 relative z-20">
          <a
            href={`mailto:magnetarsenti@gmail.com?subject=Fair Use Claim for Annotation ${annotation.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-[hsl(var(--text-subtle))] hover:text-red-500 underline transition-colors"
            title="File a DMCA / Fair Use dispute for this content"
          >
            File a claim
          </a>

          <Link
            href={`${detailLink}#comments`}
            className="flex items-center gap-1.5 font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <MessageSquare size={14} />
            <span>Comments</span>
          </Link>
        </div>
      </div>"""

text = text.replace(old_footer, new_footer)

with open('components/AnnotationCard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
