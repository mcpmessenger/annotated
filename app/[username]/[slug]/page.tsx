"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAnnotationBySlug } from "@/lib/data";
import { CommentSection } from "@/components/CommentSection";
import { ReactionRow } from "@/components/ReactionRow";

const intentLabels: Record<string, string> = {
  highlight: "Highlight",
  question: "Question",
  critique: "Critique",
  expand: "Expansion",
};

const intentColors: Record<string, string> = {
  highlight: "bg-yellow-100 text-yellow-900",
  question: "bg-blue-100 text-blue-900",
  critique: "bg-red-100 text-red-900",
  expand: "bg-green-100 text-green-900",
};

export default function AnnotationPage({
  params,
}: {
  params: { username: string; slug: string };
}) {
  const [annotation, setAnnotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  import("react").then((React) => {
    React.useEffect(() => {
      getAnnotationBySlug(params.slug).then((data) => {
        setAnnotation(data);
        setLoading(false);
      });
    }, [params.slug]);
  });

  if (loading) {
    return <div className="p-12 text-center">Loading...</div>;
  }

  if (!annotation) {
    return <div className="p-12 text-center">Annotation not found</div>;
  }

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${params.username}/${params.slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[v0] Failed to copy:", err);
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
          <header className="mb-12 pb-8 border-b border-[hsl(var(--border))]">
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
          <section className="mb-12 p-6 bg-gray-50 rounded border-l-4 border-[hsl(var(--accent))]">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-2">
              Annotating
            </p>
            <h3 className="font-bold mb-2">{annotation.sourceTitle}</h3>
            <p className="text-sm text-[hsl(var(--text-muted))] mb-3">
              <a
                href={annotation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--accent))] hover:underline"
              >
                {annotation.sourceDomain} →
              </a>
            </p>
          </section>

          {/* Quote */}
          <section className="mb-12">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-3">
              Quoted text
            </p>
            <blockquote className="pl-6 border-l-2 border-[hsl(var(--accent))] italic text-lg">
              &ldquo;{annotation.quoteText}&rdquo;
            </blockquote>
          </section>

          {/* Commentary */}
          <div className="mb-8">
            <ReactionRow annotationId={annotation.id} />
          </div>
          <section className="mb-12">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-3">
              Commentary
            </p>
            <div className="prose prose-sm max-w-none text-base leading-relaxed">
              <p>{annotation.commentary}</p>
            </div>
          </section>

          {/* Metadata and Actions */}
          <footer className="border-t border-[hsl(var(--border))] pt-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="text-sm text-[hsl(var(--text-subtle))]">
                <p>{annotation.views} views · {annotation.shares} shares</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors w-full sm:w-auto ${
                    copied
                      ? "bg-green-100 text-green-900"
                      : "border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-gray-50"
                  }`}
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a
                  href={annotation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded text-sm font-medium bg-[hsl(var(--foreground))] text-white hover:shadow-md transition-shadow text-center w-full sm:w-auto"
                >
                  Read Source
                </a>
              </div>
            </div>
          </footer>
          <CommentSection annotationId={annotation.id} />
        </article>
      </main>

      <Footer />
    </div>
  );
}
