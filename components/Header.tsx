"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "About", href: "/about" },
  { label: "Install", href: "/install" },
  { label: "Privacy", href: "/privacy" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[hsl(var(--border))] bg-white sticky top-0 z-40">
      <div className="editorial-container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-[hsl(var(--text-muted))] transition-colors">
          <img src="/logo.png" alt="Annotated Logo" className="w-8 h-8 rounded" />
          Annotated
        </Link>

        <nav className="hidden sm:flex gap-6">
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
        </nav>

        <div className="sm:hidden">
          <button className="text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))]">
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
