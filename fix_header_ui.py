with open('components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_replace = 'import { Sun, Moon, PencilLine, LogIn, LogOut } from "lucide-react";'
new_import = 'import { Sun, Moon, PencilLine, User } from "lucide-react";'
text = text.replace(import_replace, new_import)

old_nav = """          {user ? (
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-[hsl(var(--border))]">
              <img src={user.user_metadata?.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-[hsl(var(--border))]" />
              <button onClick={handleLogout} className="text-sm font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-1">
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="ml-2 px-4 py-1.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
              <LogIn size={16} /> Sign In
            </button>
          )}"""

new_nav = """          <div className="ml-2 pl-4 border-l border-[hsl(var(--border))] flex items-center">
            {user ? (
              <button onClick={handleLogout} title="Click to Logout" className="hover:opacity-80 transition-opacity">
                <img src={user.user_metadata?.avatar_url} alt="Logout" className="w-8 h-8 rounded-full border border-[hsl(var(--border))]" />
              </button>
            ) : (
              <button onClick={handleLogin} title="Sign in with Google" className="w-8 h-8 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))] transition-all">
                <User size={18} />
              </button>
            )}
          </div>"""

text = text.replace(old_nav, new_nav)

with open('components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
