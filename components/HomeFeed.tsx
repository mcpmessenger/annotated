"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Annotation } from "@/lib/types";
import { AnnotationCard } from "@/components/AnnotationCard";
import { PanelRightClose, PanelRightOpen, Info, X } from "lucide-react";

interface HomeFeedProps {
  initialAnnotations: Annotation[];
}

function SidebarContent({
  onClose,
  isDrawer = false,
}: {
  onClose?: () => void;
  isDrawer?: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Mobile Drawer Header */}
      {isDrawer && (
        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <span className="text-[hsl(var(--accent))]">📖</span>
            <span className="font-bold text-base tracking-tight">Guide &amp; Links</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* How It Works Card */}
      <div className="border border-[hsl(var(--border))] rounded-xl p-5 bg-[hsl(var(--background))] shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-bold text-base">
            {!isDrawer && <span className="text-[hsl(var(--accent))]">📖</span>}
            <span>How It Works</span>
          </div>
          {!isDrawer && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed mb-4">
          Highlight text on any webpage to drop your thoughts. Your notes become part of the public web—anyone else with the extension will instantly see your yellow highlights right where you left them.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/install"
            onClick={() => isDrawer && onClose?.()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity text-center shadow-xs"
          >
            <span>Install Extension</span>
            <span>↗</span>
          </Link>
          <Link
            href="/explore"
            onClick={() => isDrawer && onClose?.()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors text-center"
          >
            <span>Search &amp; Explore</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* About Network Card */}
      <div className="border border-[hsl(var(--border))] rounded-xl p-5 bg-[hsl(var(--background))] shadow-xs">
        <div className="flex items-center gap-2 mb-2 font-bold text-sm">
          <span className="text-[hsl(var(--accent))]">🌐</span>
          <span>The Multiplayer Web</span>
        </div>
        <p className="text-xs text-[hsl(var(--text-muted))] leading-relaxed">
          Every annotation is permanently tied to its source URL. When someone else visits a page you've annotated, they'll see your highlights, read your insights, and can reply directly in their browser to join the conversation.
        </p>
      </div>

      {/* Relocated Footer Links */}
      <div className="px-2 pt-2 text-xs text-[hsl(var(--text-subtle))] space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-medium">
          <Link
            href="/about"
            onClick={() => isDrawer && onClose?.()}
            className="hover:text-[hsl(var(--foreground))] transition-colors"
          >
            About
          </Link>
          <span className="opacity-40">·</span>
          <Link
            href="/privacy"
            onClick={() => isDrawer && onClose?.()}
            className="hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Privacy
          </Link>
          <span className="opacity-40">·</span>
          <a
            href="https://chromewebstore.google.com/detail/annotated/bnaejhcknifnikgiohecinndejbajfdo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Extension
          </a>
          <span className="opacity-40">·</span>
          <a
            href="https://github.com/mcpmessenger/annotated"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[hsl(var(--foreground))] transition-colors"
          >
            GitHub
          </a>
          <span className="opacity-40">·</span>
          <a
            href="mailto:magnetarsenti@gmail.com"
            className="hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Contact
          </a>
        </div>
        <p className="text-[11px] text-[hsl(var(--text-subtle))]">
          &copy; {new Date().getFullYear()} Annotated. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export function HomeFeed({ initialAnnotations }: HomeFeedProps) {
  const [displayedCount, setDisplayedCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const displayedAnnotations = initialAnnotations.slice(0, displayedCount);
  const hasMore = displayedCount < initialAnnotations.length;

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setDisplayedCount((prev) => Math.min(prev + 6, initialAnnotations.length));
            setIsLoadingMore(false);
          }, 250);
        }
      },
      { rootMargin: "300px" }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [hasMore, isLoadingMore, initialAnnotations.length]);

  // Lock body scroll and listen for escape key when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsMobileDrawerOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobileDrawerOpen]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div
        className={
          isDesktopSidebarOpen
            ? "grid grid-cols-1 lg:grid-cols-12 gap-10 items-start transition-all"
            : "max-w-3xl mx-auto transition-all"
        }
      >
        {/* Main Scrolling Feed */}
        <div className={isDesktopSidebarOpen ? "lg:col-span-8 space-y-6" : "space-y-6"}>
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight">Recent Annotations</h2>
              <span className="text-xs font-medium text-[hsl(var(--text-muted))] bg-[hsl(var(--border))] px-2.5 py-1 rounded-full">
                {initialAnnotations.length} shared
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Drawer Trigger Pill */}
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))] active:scale-95 transition-all shadow-2xs cursor-pointer"
                aria-label="Open guide and info panel"
              >
                <Info className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
                <span>Guide</span>
              </button>

              {/* Desktop Toggle Button: When Collapsed, Show 'Show Panel' */}
              {!isDesktopSidebarOpen && (
                <button
                  onClick={() => setIsDesktopSidebarOpen(true)}
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors shadow-2xs cursor-pointer"
                  aria-label="Show side panel"
                >
                  <PanelRightOpen className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
                  <span>Show Panel</span>
                </button>
              )}

              {/* Desktop Toggle Button: When Open, Quick Collapse Button */}
              {isDesktopSidebarOpen && (
                <button
                  onClick={() => setIsDesktopSidebarOpen(false)}
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] rounded-lg transition-colors cursor-pointer"
                  title="Collapse side panel"
                  aria-label="Collapse side panel"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                  <span>Hide Panel</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {displayedAnnotations.map((annotation) => (
              <AnnotationCard key={annotation.id} annotation={annotation} />
            ))}
          </div>

          {/* Sentinel & Scroll Loader */}
          {hasMore && (
            <div ref={sentinelRef} className="py-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-[hsl(var(--text-muted))]">
                <div className="w-4 h-4 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full animate-spin"></div>
                <span>Loading more annotations…</span>
              </div>
            </div>
          )}

          {/* End of Feed Message */}
          {!hasMore && initialAnnotations.length > 0 && (
            <div className="pt-8 pb-4 text-center border-t border-[hsl(var(--border))]">
              <p className="text-sm font-medium text-[hsl(var(--text-muted))] flex items-center justify-center gap-2">
                <span>You&apos;re all caught up</span>
                <span className="text-[hsl(var(--accent))]">✦</span>
              </p>
              <p className="text-xs text-[hsl(var(--text-subtle))] mt-1">
                Install the extension to annotate new passages and grow the network.
              </p>
              {/* Clean mobile-only bottom footer links */}
              <div className="lg:hidden flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-xs text-[hsl(var(--text-subtle))] mt-6 pt-4 border-t border-[hsl(var(--border))]/60">
                <Link href="/about" className="hover:text-[hsl(var(--foreground))]">About</Link>
                <span>·</span>
                <Link href="/privacy" className="hover:text-[hsl(var(--foreground))]">Privacy</Link>
                <span>·</span>
                <a href="https://github.com/mcpmessenger/annotated" target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--foreground))]">GitHub</a>
                <span>·</span>
                <a href="mailto:magnetarsenti@gmail.com" className="hover:text-[hsl(var(--foreground))]">Contact</a>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sticky Sidebar (Collapsible) */}
        {isDesktopSidebarOpen && (
          <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <SidebarContent onClose={() => setIsDesktopSidebarOpen(false)} />
          </aside>
        )}
      </div>

      {/* Mobile Floating Action Pill (Visible on mobile screens) */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed bottom-6 right-5 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold text-xs shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        aria-label="Open guide and info drawer"
      >
        <span className="text-[hsl(var(--accent))]">📖</span>
        <span>Guide &amp; Links</span>
      </button>

      {/* Mobile Slide-Over Drawer Sheet */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          isMobileDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMobileDrawerOpen}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        />

        {/* Slide-over Drawer Panel */}
        <div
          className={`absolute inset-y-0 right-0 w-[85vw] max-w-xs sm:max-w-sm bg-[hsl(var(--background))] border-l border-[hsl(var(--border))] shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 ease-out ${
            isMobileDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <SidebarContent
            onClose={() => setIsMobileDrawerOpen(false)}
            isDrawer={true}
          />
        </div>
      </div>
    </div>
  );
}
