with open('components/AnnotationCard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { Annotation } from "@/lib/types";', 'import { Annotation } from "@/lib/types";\nimport { ReactionRow } from "./ReactionRow";')

# Inject the ReactionRow at the bottom and intent at the top
header_replacement = """          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg group-hover:text-[hsl(var(--accent))] transition-colors line-clamp-1">
                <Link href={detailLink} className="before:absolute before:inset-0">
                  {annotation.title}
                </Link>
              </h3>
              {annotation.intent && (
                <span className="text-xl bg-[hsl(var(--border))] rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
                  {annotation.intent}
                </span>
              )}
            </div>"""

text = text.replace('          <div>\n            <h3 className="font-bold text-lg group-hover:text-[hsl(var(--accent))] transition-colors line-clamp-1">\n              <Link href={detailLink} className="before:absolute before:inset-0">\n                {annotation.title}\n              </Link>\n            </h3>', header_replacement)

bottom_replacement = """      <p className="text-base text-[hsl(var(--foreground))] line-clamp-2 mb-4 relative z-10">
        {annotation.commentary}
      </p>

      <ReactionRow annotationId={annotation.id} />

      <div className="flex items-center justify-between text-xs text-[hsl(var(--text-subtle))] relative z-10 mt-4 pt-4 border-t border-[hsl(var(--border))]">"""

text = text.replace("""      <p className="text-base text-[hsl(var(--foreground))] line-clamp-2 mb-4 relative z-10">
        {annotation.commentary}
      </p>

      <div className="flex items-center justify-between text-xs text-[hsl(var(--text-subtle))] relative z-10">""", bottom_replacement)

with open('components/AnnotationCard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
