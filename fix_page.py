with open('app/[username]/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { getAnnotationBySlug } from "@/lib/data";', 'import { getAnnotationBySlug } from "@/lib/data";\nimport { CommentSection } from "@/components/CommentSection";\nimport { ReactionRow } from "@/components/ReactionRow";')

# Now insert them below the commentary and above the date
target = """          <div className="mt-8 text-lg text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
            {annotation.commentary}
          </div>

          <div className="mt-8 pt-6 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--text-muted))] flex items-center justify-between">"""

replacement = """          <div className="mt-8 text-lg text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
            {annotation.commentary}
          </div>

          <div className="mt-4">
            <ReactionRow annotationId={annotation.id} />
          </div>

          <div className="mt-8 pt-6 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--text-muted))] flex items-center justify-between">"""

text = text.replace(target, replacement)

# Now insert CommentSection right before the </article> tag
target_end = """          </div>
        </article>
      </main>"""

replacement_end = """          </div>
          <CommentSection annotationId={annotation.id} />
        </article>
      </main>"""

text = text.replace(target_end, replacement_end)

with open('app/[username]/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
