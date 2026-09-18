with open('app/[username]/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_page_commentary = """          {/* Commentary */}
          <section className="mb-8">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-3 font-bold">
              Commentary
            </p>
            <div className="text-base leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">
              <p>{annotation.commentary}</p>
            </div>
          </section>"""

new_page_commentary = """          {/* Commentary */}
          <section className="mb-8">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-3 font-bold">
              Commentary
            </p>
            <div className="text-base leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">
              <p>{annotation.commentary}</p>
            </div>

            {annotation.audio_url && (
              <div className="mt-4 p-4 rounded bg-[hsl(var(--border))] border border-[hsl(var(--border))]">
                <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-subtle))] mb-2 flex items-center gap-1.5">
                  🎙️ Audio Commentary
                </p>
                <audio controls src={annotation.audio_url} className="w-full" />
              </div>
            )}
          </section>"""

text = text.replace(old_page_commentary, new_page_commentary)

with open('app/[username]/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
