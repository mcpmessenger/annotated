"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Sun, Moon, PencilLine } from "lucide-react";

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

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setTheme(newTheme);
  };

  return (
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] sticky top-0 z-40">
      <div className="editorial-container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-[hsl(var(--text-muted))] transition-colors">
          <PencilLine size={24} strokeWidth={2.5} className="text-[hsl(var(--accent))]" />
          Annotated
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
