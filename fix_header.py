with open('components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { Sun, Moon, PencilLine } from "lucide-react";', 'import { Sun, Moon, PencilLine, LogIn, LogOut } from "lucide-react";\nimport { supabase } from "@/lib/supabaseClient";')

auth_logic = """  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };"""

text = text.replace('  const toggleTheme = () => {', auth_logic + '\n\n  const toggleTheme = () => {')

nav_end = """          </button>
          
          {user ? (
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
          )}
        </nav>"""

text = text.replace('          </button>\n        </nav>', nav_end)

with open('components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
