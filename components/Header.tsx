"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Sun, Moon, PencilLine, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "About", href: "/about" },
  { label: "Install", href: "/install" },
  { label: "Privacy", href: "/privacy" },
];

export function Header() {
  const pathname = usePathname();
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Check initial theme from document class
    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);

  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState({ followers: 0, following: 0, notes: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUserStats = async () => {
      try {
        const [fRes, flRes, nRes] = await Promise.all([
          supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
          supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id),
          supabase.from("annotations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        setUserStats({
          followers: fRes.count || 0,
          following: flRes.count || 0,
          notes: nRes.count || 0,
        });
      } catch (err) {
        console.error("Error fetching header user stats:", err);
      }
    };
    fetchUserStats();
  }, [user?.id]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setTheme(newTheme);
  };

  const username = user?.email ? user.email.split("@")[0] : "user";
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || username;
  const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`;

  return (
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] sticky top-0 z-40">
      <div className="editorial-container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="annotated." className="w-6 h-6 object-contain" />
          <span>annotated<span className="text-[hsl(var(--accent))] font-black">.</span></span>
        </Link>

        <nav className="hidden sm:flex gap-6 items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${
                pathname === item.href
                  ? "text-[hsl(var(--foreground))] font-medium"
                  : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button 
            onClick={toggleTheme}
            className="ml-4 text-sm w-8 h-8 flex items-center justify-center rounded-full hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="ml-2 pl-4 border-l border-[hsl(var(--border))] flex items-center">
            {user ? (
              <div 
                className="relative"
                onMouseEnter={() => {
                  if (menuTimeoutRef.current) {
                    clearTimeout(menuTimeoutRef.current);
                    menuTimeoutRef.current = null;
                  }
                  setMenuOpen(true);
                }}
                onMouseLeave={() => {
                  if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
                  menuTimeoutRef.current = setTimeout(() => {
                    setMenuOpen(false);
                  }, 240);
                }}
              >
                <Link
                  href={`/u/${username}`}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-full focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                >
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full border border-[hsl(var(--border))] hover:ring-2 hover:ring-[hsl(var(--accent))] transition-all object-cover"
                  />
                </Link>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-9 h-9 rounded-full border-2 border-[hsl(var(--accent))] object-cover flex-shrink-0"
                      />
                      <div className="overflow-hidden leading-tight">
                        <strong className="block text-sm font-bold text-[hsl(var(--foreground))] truncate">
                          {displayName}
                        </strong>
                        <span className="text-xs text-[hsl(var(--text-muted))] truncate block">
                          @{username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-[hsl(var(--border))] rounded-lg px-3 py-1.5 mb-2.5 text-xs">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-[hsl(var(--accent))]">{userStats.followers}</span>
                        <span className="text-[hsl(var(--text-muted))] text-[11px]">followers</span>
                      </div>
                      <span className="text-[hsl(var(--text-muted))] opacity-40">·</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-[hsl(var(--accent))]">{userStats.following}</span>
                        <span className="text-[hsl(var(--text-muted))] text-[11px]">following</span>
                      </div>
                      <span className="text-[hsl(var(--text-muted))] opacity-40">·</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-[hsl(var(--accent))]">{userStats.notes}</span>
                        <span className="text-[hsl(var(--text-muted))] text-[11px]">notes</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 pt-2 border-t border-[hsl(var(--border))] text-xs">
                      <Link
                        href={`/u/${username}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
                      >
                        <span>My profile</span>
                        <span className="text-[hsl(var(--accent))]">↗</span>
                      </Link>
                      <Link
                        href="/explore"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
                      >
                        <span>Explore annotations</span>
                        <span>→</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left w-full mt-0.5"
                      >
                        <span>Sign out</span>
                        <span>↪</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={handleLogin} title="Sign in with Google" className="w-8 h-8 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))] transition-all">
                <User size={18} />
              </button>
            )}
          </div>
        </nav>

        <div className="sm:hidden flex items-center gap-4">
          <button onClick={toggleTheme} className="text-sm">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))]">
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
