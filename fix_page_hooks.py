with open('app/[username]/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write('''"use client";

import { useState, useEffect, use } } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAnnotationBySlug } from "@/lib/data";
import { CommentSection } from "@/components/CommentSection";
import { ReactionRow } from "@/components/ReactionRow";

export default function AnnotationPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }> | { username: string; slug: string };
}) {
  const unwrappedParams = (params instanceof Promise) ? use(params) : params;
  const [annotation, setAnnotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (unwrappedParams?.slug) {
      getAnnotationBySlug(unwrappedParams.slug).then((data) => {
        setAnnotation(data);
        setLoading(false);
      });
    }
  }, [unwrappedParams?.slug]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center p-12 text-center text-[hsl(var(--text-muted))]">
          Loading annotation...
        </main>
        <Footer />
      </div>
    );
  }

  if (!annotation) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center p-12 text-center text-[hsl(var(--text-muted))]">
          Annotation not found
        </main>
        <Footer />
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-3xl">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm">
            <Link href="/explore" className="text-[hsl(var(--accent))] hover:underline">
              Explore
            </Link>
            <span className="text-[hsl(var(--text-subtle))]"> / </span>
            <Link
              href={`/u/${annotation.username}`}
              className="text-[hsl(var(--accent))] hover:underline"
            >
              {annotation.userDisplayName}
            </Link>
            <span className="text-[hsl(var(--text-subtle))]"> / </span>
            <span className="text-[hsl(var(--foreground))]">{annotation.title}</span>
          </div>

          {/* Header */}
          <header className="mb-8 pb-6 border-b border-[hsl(var(--border))]">
            <h1 className="editorial-heading mb-4">{annotation.title}</h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--text-muted))]">
                  by{" "}
                  <Link
                    href={`/u/${annotation.username}`}
                    className="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--accent))]"
                  >
                    {annotation.userDisplayName}
                  </Link>
                </p>
                <p className="text-xs text-[hsl(var(--text-subtle))] mt-1">
                  {annotation.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {annotation.intent && (
                <span className="text-2xl bg-[hsl(var(--border))] rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                  {annotation.intent}
                </span>
              )}
            </div>
          </header>

          {/* Source Context */}
          <section className="mb-8 p-6 bg-[hsl(var(--border))] rounded border-l-4 border-[hsl(var(--accent))]">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-2 font-bold">
              Annotating
            </p>
            <h3 className="font-bold text-lg mb-2">{annotation.sourceTitle}</h3>
            <p className="text-sm text-[hsl(var(--text-muted))]">
              <a
                href={annotation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--accent))] hover:underline font-medium"
              >
                {annotation.sourceDomain || annotation.sourceUrl} →
              </a>
            </p>
          </section>

          {/* Quote */}
          <section className="mb-8">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-3 font-bold">
              Quoted text
            </p>
            <blockquote className="pl-6 border-l-2 border-[hsl(var(--accent))] italic text-lg text-[hsl(var(--foreground))]">
              &ldquo;{annotation.quoteText}&rdquo;
            </blockquote>
          </section>

          {/* Commentary */}
          <section className="mb-8">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-3 font-bold">
              Commentary
            </p>
            <div className="text-base leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">
              <p>{annotation.commentary}</p>
            </div>
          </section>

          {/* Reactions */}
          <div className="mb-8">
            <ReactionRow annotationId={annotation.id} />
          </div>

          {/* Metadata and Actions */}
          <footer className="border-t border-[hsl(var(--border))] pt-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="text-sm text-[hsl(var(--text-subtle))]">
                <p>{annotation.views || 0} views</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors w-full sm:w-auto ${
                    copied
                      ? "bg-green-100 text-green-900"
                      : "border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]"
                  }`}
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a
                  href={annotation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity text-center w-full sm:w-auto"
                >
                  Read Source
                </a>
              </div>
            </div>
          </footer>

          {/* Comment Section */}
          <CommentSection annotationId={annotation.id} />
        </article>
      </main>

      <Footer />
    </div>
  );
}
''')
