with open('components/CommentSection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add EMOJIS array
text = text.replace(
    'export function CommentSection({ annotationId }: { annotationId: string }) {',
    'const QUICK_EMOJIS = ["🔥", "🤔", "💡", "💯", "👎"];\n\nexport function CommentSection({ annotationId }: { annotationId: string }) {'
)

# Add insertEmoji helper inside component
helper_code = """  const insertEmoji = (emoji: string) => {
    setNewText((prev) => (prev ? `${prev} ${emoji}` : emoji));
  };

  const fetchComments = async () => {"""

text = text.replace('  const fetchComments = async () => {', helper_code)

# Replace the form layout to include quick emoji bar and updated button style
old_form = """      {user ? (
        <form onSubmit={submitComment} className="mt-6">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add your thoughts..."
            className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-3 text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--accent))] resize-y min-h-[100px]"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!newText.trim()}
              className="px-6 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-bold rounded-full disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
            >
              Post Comment
            </button>
          </div>
        </form>
      ) : ("""

new_form = """      {user ? (
        <form onSubmit={submitComment} className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[hsl(var(--text-subtle))] font-medium">Quick React:</span>
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-[hsl(var(--border))]"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add your thoughts..."
            className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[6px] p-3 text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--accent))] resize-y min-h-[100px]"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!newText.trim()}
              className="px-4 py-2 rounded-[6px] text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer"
            >
              Post Comment
            </button>
          </div>
        </form>
      ) : ("""

text = text.replace(old_form, new_form)

# Also update the "Sign In to Comment" button style
text = text.replace(
    'className="px-6 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-bold rounded-full hover:opacity-90 transition-opacity"',
    'className="px-4 py-2 rounded-[6px] text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity cursor-pointer"'
)

with open('components/CommentSection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
