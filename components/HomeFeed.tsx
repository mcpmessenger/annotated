"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Annotation } from "@/lib/types";
import { AnnotationCard } from "@/components/AnnotationCard";

interface HomeFeedProps {
  initialAnnotations: Annotation[];
}

export function HomeFeed({ initialAnnotations }: HomeFeedProps) {
  const [displayedCount, setDisplayedCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Scrolling Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight">Recent Annotations</h2>
            <span className="text-xs font-medium text-[hsl(var(--text-muted))] bg-[hsl(var(--border))] px-2.5 py-1 rounded-full">
              {initialAnnotations.length} shared
            </span>
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
            </div>
          )}
        </div>

        {/* Sticky Sidebar: Relocated Footer & Info Details */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          {/* How It Works Card */}
          <div className="border border-[hsl(var(--border))] rounded-xl p-5 bg-[hsl(var(--background))] shadow-sm">
            <div className="flex items-center gap-2 mb-2 font-bold text-base">
              <span className="text-[hsl(var(--accent))]">📖</span>
              <span>How It Works</span>
            </div>
            <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed mb-4">
              Highlight text on any webpage with the Annotated extension to record commentary, attach intent, and preserve context.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/install"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity text-center"
              >
                <span>Install Extension</span>
                <span>↗</span>
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors text-center"
              >
                <span>Search & Explore</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* About Network Card */}
          <div className="border border-[hsl(var(--border))] rounded-xl p-5 bg-[hsl(var(--background))] shadow-sm">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm">
              <span className="text-[hsl(var(--accent))]">🌐</span>
              <span>Editorial Network</span>
            </div>
            <p className="text-xs text-[hsl(var(--text-muted))] leading-relaxed">
              Every annotation is indexed to its original source URL and permalinked for durable citations across research, social commentary, and journalism.
            </p>
          </div>

          {/* Relocated Footer Links */}
          <div className="px-2 pt-2 text-xs text-[hsl(var(--text-subtle))] space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-medium">
              <Link href="/about" className="hover:text-[hsl(var(--foreground))] transition-colors">
                About
              </Link>
              <span className="opacity-40">·</span>
              <Link href="/privacy" className="hover:text-[hsl(var(--foreground))] transition-colors">
                Privacy
              </Link>
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
        </aside>
      </div>
    </div>
  );
}
