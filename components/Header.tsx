"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, User, Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Tooltip } from "@/components/Tooltip";

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
    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);

  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState({ followers: 0, following: 0, notes: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Notifications ────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }, []);

  const markAllRead = useCallback(async (userId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", userId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch notifications when user logs in, poll every 60s
  useEffect(() => {
    if (!user?.id) { setNotifications([]); return; }
    fetchNotifications(user.id);
    const interval = setInterval(() => fetchNotifications(user.id), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications]);

  // Close notif dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // User stats (followers/following/notes)
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

  const handleLoginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLoginTwitter = async () => {
    // Stubbed for now
    alert("Sign in with 𝕏 is coming soon!");
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
          <Tooltip content={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} position="bottom">
            <button
              onClick={toggleTheme}
              className="ml-4 text-sm w-8 h-8 flex items-center justify-center rounded-full hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </Tooltip>

          <div className="ml-2 pl-4 border-l border-[hsl(var(--border))] flex items-center gap-2">
            {user ? (
              <>
                {/* ── Notification Bell ── */}
                <div ref={notifRef} className="relative">
                  <Tooltip content="Notifications" position="bottom">
                    <button
                      onClick={() => {
                        const opening = !notifOpen;
                        setNotifOpen(opening);
                        if (opening && unreadCount > 0) markAllRead(user.id);
                      }}
                      className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                    >
                      <Bell size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none pointer-events-none">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </Tooltip>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2.5 border-b border-[hsl(var(--border))] flex items-center justify-between">
                        <span className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wide">Notifications</span>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => markAllRead(user.id)}
                            className="text-[10px] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] font-medium transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-[hsl(var(--border))]">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-sm text-[hsl(var(--text-muted))] italic">
                            You're all caught up!
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              href={n.annotation_id ? `/annotations/${n.annotation_id}` : "/"}
                              onClick={() => setNotifOpen(false)}
                              className={`flex items-start gap-3 px-4 py-3 hover:bg-[hsl(var(--secondary))] transition-colors ${
                                !n.read ? "bg-[hsl(var(--secondary))]" : ""
                              }`}
                            >
                              {!n.read && (
                                <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-[hsl(var(--accent))]" />
                              )}
                              <span className={`text-xs text-[hsl(var(--foreground))] leading-relaxed ${!n.read ? "" : "ml-5"}`}>
                                {n.message}
                                <span className="block text-[10px] text-[hsl(var(--text-muted))] mt-0.5">
                                  {n.created_at
                                    ? new Date(n.created_at).toLocaleString()
                                    : ""}
                                </span>
                              </span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Avatar / Profile Menu ── */}
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
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Tooltip content="Sign in with Google" position="bottom">
                  <button onClick={handleLoginGoogle} className="h-8 px-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center justify-center gap-1.5 text-xs font-semibold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))] transition-all">
                    <User size={15} />
                    <span>Sign in</span>
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </nav>

        <div className="sm:hidden flex items-center gap-2.5">
          {user && (
            <Tooltip content="Notifications" position="bottom">
              <button
                onClick={() => {
                  const opening = !notifOpen;
                  setNotifOpen(opening);
                  if (opening && unreadCount > 0) markAllRead(user.id);
                  if (opening) setMobileMenuOpen(false);
                }}
                className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[15px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none pointer-events-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </Tooltip>
          )}
          <button onClick={toggleTheme} className="text-sm">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              if (notifOpen) setNotifOpen(false);
            }}
            className="text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))]"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/* Mobile Notification Dropdown Panel */}
      {notifOpen && (
        <div className="sm:hidden border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl absolute w-full left-0 top-full z-50 animate-in slide-in-from-top-2">
          <div className="px-4 py-2.5 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <span className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wide">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={() => markAllRead(user?.id)}
                className="text-[10px] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-[hsl(var(--border))]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[hsl(var(--text-muted))] italic">
                You're all caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.annotation_id ? `/annotations/${n.annotation_id}` : "/"}
                  onClick={() => setNotifOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-[hsl(var(--secondary))] transition-colors ${
                    !n.read ? "bg-[hsl(var(--secondary))]" : ""
                  }`}
                >
                  {!n.read && (
                    <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-[hsl(var(--accent))]" />
                  )}
                  <span className={`text-xs text-[hsl(var(--foreground))] leading-relaxed ${!n.read ? "" : "ml-5"}`}>
                    {n.message}
                    <span className="block text-[10px] text-[hsl(var(--text-muted))] mt-0.5">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-4 space-y-4 shadow-lg absolute w-full left-0 animate-in slide-in-from-top-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[hsl(var(--foreground))]"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-[hsl(var(--border))]">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border border-[hsl(var(--border))]" />
                  <div>
                    <strong className="block text-sm font-bold text-[hsl(var(--foreground))]">{displayName}</strong>
                    <span className="block text-xs text-[hsl(var(--text-muted))]">@{username}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <Link href={`/u/${username}`} onClick={() => setMobileMenuOpen(false)}>My profile</Link>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-red-500 text-left">Sign out</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button onClick={() => { handleLoginGoogle(); setMobileMenuOpen(false); }} className="w-full py-2 px-3 rounded-md bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-bold text-xs flex items-center justify-center gap-2">
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
