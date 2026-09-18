with open('app/[username]/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_page_footer = """                <a
                  href={annotation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity text-center w-full sm:w-auto"
                >
                  Read Source
                </a>
              </div>
            </div>
          </footer>"""

new_page_footer = """                <a
                  href={annotation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity text-center w-full sm:w-auto"
                >
                  Read Source
                </a>
              </div>
            </div>

            <div className="mt-4 text-right">
              <a
                href={`mailto:magnetarsenti@gmail.com?subject=Fair Use Claim for Annotation ${annotation.id}`}
                className="text-xs text-[hsl(var(--text-subtle))] hover:text-red-500 underline transition-colors"
                title="File a DMCA / Fair Use dispute for this content"
              >
                File a claim (Dispute Fair Use)
              </a>
            </div>
          </footer>"""

text = text.replace(old_page_footer, new_page_footer)

with open('app/[username]/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
