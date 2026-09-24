"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAnnotationBySlug } from "@/lib/data";
import { CommentSection } from "@/components/CommentSection";
import { ReactionRow } from "@/components/ReactionRow";
import { FollowButton } from "@/components/FollowButton";
import { Tooltip } from "@/components/Tooltip";

export default function AnnotationPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = (params?.slug as string) || "";
  
  const [annotation, setAnnotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [factCheckData, setFactCheckData] = useState<any>(null);
  const [factCheckLoading, setFactCheckLoading] = useState(false);
  const [isFactCheckMinimized, setIsFactCheckMinimized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (rawSlug) {
      getAnnotationBySlug(rawSlug).then((data) => {
        setAnnotation(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [rawSlug]);

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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this annotation? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("annotations")
        .delete()
        .eq("id", annotation.id);

      if (error) throw error;

      router.push(`/u/${annotation.username}`);
    } catch (err: any) {
      console.error("Error deleting annotation:", err);
      alert("Failed to delete annotation: " + (err.message || "Unknown error"));
      setIsDeleting(false);
    }
  };

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

  useEffect(() => {
    if (annotation?.id && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`annotated_factcheck_${annotation.id}`);
        if (cached) {
          setFactCheckData(JSON.parse(cached));
          const minCached = localStorage.getItem(`annotated_factcheck_minimized_${annotation.id}`);
          if (minCached !== null) {
            setIsFactCheckMinimized(minCached === "true");
          }
        }
      } catch (e) {}
    }
  }, [annotation?.id]);

  const handleFactCheck = async () => {
    if (factCheckData) {
      setIsFactCheckMinimized((prev) => {
        const next = !prev;
        if (annotation?.id && typeof window !== "undefined") {
          try {
            localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, String(next));
          } catch (e) {}
        }
        return next;
      });
      return;
    }

    if (!annotation) return;

    setFactCheckLoading(true);
    setIsFactCheckMinimized(false);

    try {
      const res = await fetch("/api/ai/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: annotation.quoteText || "",
          commentary: annotation.commentary || "",
          sourceUrl: annotation.sourceUrl || "",
          sourceTitle: annotation.sourceTitle || "",
          mediaUrl: annotation.media_url || null,
        }),
      });

      const data = await res.json();
      setFactCheckData(data);
      if (typeof window !== "undefined" && annotation.id) {
        try {
          localStorage.setItem(`annotated_factcheck_${annotation.id}`, JSON.stringify(data));
          localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, "false");
        } catch (e) {}
      }
    } catch (err) {
      console.error("Fact-check request failed:", err);
    } finally {
      setFactCheckLoading(false);
    }
  };

  const toggleFactCheckMinimize = (minimized: boolean) => {
    setIsFactCheckMinimized(minimized);
    if (annotation?.id && typeof window !== "undefined") {
      try {
        localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, String(minimized));
      } catch (e) {}
    }
  };

  const createdDate = (() => {
    if (!annotation.createdAt) return null;
    const d = annotation.createdAt instanceof Date ? annotation.createdAt : new Date(annotation.createdAt);
    return isNaN(d.getTime()) ? null : d;
  })();

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
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    by{" "}
                    <Link
                      href={`/u/${annotation.username}`}
                      className="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--accent))]"
                    >
                      {annotation.userDisplayName}
                    </Link>
                  </p>
                  {annotation.userId && (
                    <FollowButton targetUserId={annotation.userId} size="sm" />
                  )}
                </div>
                {createdDate && (
                  <p className="text-xs text-[hsl(var(--text-subtle))] mt-1">
                    {createdDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
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
                {(() => {
                  const tweetMatch = annotation.sourceUrl?.match(/(?:x|twitter)\.com\/([^\/]+)\/status\/(\d+)/i);
                  if (tweetMatch) return `@${tweetMatch[1]} on x.com`;
                  return annotation.sourceDomain || annotation.sourceUrl;
                })()} →
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

          {/* Media */}
          {annotation.media_url && (
            <section className="mb-8">
              <div className="rounded-lg overflow-hidden border border-[hsl(var(--border))] bg-black relative shadow-sm">
                {(annotation.media_type === "video" || annotation.media_url.includes('.webm') || annotation.media_url.includes('.mp4')) ? (
                  <video src={annotation.media_url} controls playsInline className="w-full max-h-[600px] object-contain" />
                ) : (
                  <img src={annotation.media_url} alt="Attached media" className="w-full max-h-[600px] object-contain" />
                )}
              </div>
            </section>
          )}

          {/* Commentary */}
          <section className="mb-8">
            <p className="text-xs text-[hsl(var(--text-subtle))] uppercase tracking-wide mb-3 font-bold">
              Commentary
            </p>
            <div className="text-base leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">
              <p>{annotation.commentary}</p>
            </div>

            {annotation.audio_url && (
              <div className="mt-4 p-4 rounded bg-[hsl(var(--border))] border border-[hsl(var(--border))]">
                <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-subtle))] mb-2 flex items-center gap-1.5">
                  🎙️ Audio Commentary
                </p>
                <audio controls src={annotation.audio_url} className="w-full" />
              </div>
            )}
          </section>

          {/* Reactions and Quick Fact Check Trigger */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <ReactionRow annotationId={annotation.id} />
            <button
              onClick={handleFactCheck}
              disabled={factCheckLoading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Fact check this annotation with Gemini AI"
            >
              <Sparkles size={13} className="text-purple-400" />
              <span>
                {factCheckLoading
                  ? "Analyzing..."
                  : factCheckData
                  ? isFactCheckMinimized
                    ? "Show Fact Check"
                    : "Minimize Fact Check"
                  : "Fact Check"}
              </span>
            </button>
          </div>

          {/* Fact Check Section (Persistent & Minimizable) */}
          {(factCheckLoading || factCheckData) && (
            <div className="mb-8">
              {factCheckLoading ? (
                <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-xs">
                  <div className="flex items-center gap-2 text-[hsl(var(--text-muted))] italic">
                    <Sparkles size={14} className="text-purple-400 animate-spin" />
                    <span>Analyzing claims, quote, and video context with Google Gemini AI...</span>
                  </div>
                </div>
              ) : factCheckData && isFactCheckMinimized ? (
                /* Minimized state: sleek compact banner */
                <div
                  onClick={() => toggleFactCheckMinimize(false)}
                  className="p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))]/40 transition-colors flex items-center justify-between gap-3 cursor-pointer text-xs group"
                  title="Click to expand Gemini Fact Check"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles size={14} className="text-purple-400 shrink-0" />
                    <span className="font-bold text-[hsl(var(--accent))] text-[11px] uppercase tracking-wide shrink-0">
                      Gemini Fact Check:
                    </span>
                    {factCheckData?.verdict && (
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
                          factCheckData.verdict === "VERIFIED"
                            ? "bg-green-500/10 text-green-600 border border-green-500/20"
                            : factCheckData.verdict === "FALSE" || factCheckData.verdict === "MISLEADING"
                            ? "bg-red-500/10 text-red-600 border border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                        }`}
                      >
                        {factCheckData.verdict === "VERIFIED" ? (
                          <CheckCircle2 size={10} />
                        ) : factCheckData.verdict === "MISLEADING" ? (
                          <XCircle size={10} />
                        ) : (
                          <AlertTriangle size={10} />
                        )}
                        <span>{factCheckData.verdict.replace("_", " ")}</span>
                      </span>
                    )}
                    <span className="text-[hsl(var(--foreground))] truncate font-medium">
                      {factCheckData?.headline}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFactCheckMinimize(false);
                    }}
                    className="text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--foreground))] font-semibold px-2.5 py-1 rounded hover:bg-[hsl(var(--border))] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Expand</span>
                    <ChevronDown size={12} />
                  </button>
                </div>
              ) : factCheckData ? (
                /* Expanded state: full comprehensive card */
                <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-xs space-y-3 animate-in fade-in duration-150 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[hsl(var(--accent))] text-xs uppercase tracking-wide">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>Gemini Fact Check</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {factCheckData?.verdict && (
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                            factCheckData.verdict === "VERIFIED"
                              ? "bg-green-500/10 text-green-600 border border-green-500/20"
                              : factCheckData.verdict === "FALSE" || factCheckData.verdict === "MISLEADING"
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                          }`}
                        >
                          {factCheckData.verdict === "VERIFIED" ? (
                            <CheckCircle2 size={11} />
                          ) : factCheckData.verdict === "MISLEADING" ? (
                            <XCircle size={11} />
                          ) : (
                            <AlertTriangle size={11} />
                          )}
                          <span>{factCheckData.verdict.replace("_", " ")}</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleFactCheckMinimize(true)}
                        className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] text-xs font-semibold px-2.5 py-1 rounded hover:bg-[hsl(var(--border))] transition-colors cursor-pointer flex items-center gap-1"
                        title="Minimize Fact Check"
                      >
                        <span>Minimize</span>
                        <ChevronUp size={12} />
                      </button>
                    </div>
                  </div>

                  <p className="font-semibold text-sm text-[hsl(var(--foreground))] leading-snug">
                    {factCheckData.headline}
                  </p>
                  <p className="text-[hsl(var(--text-muted))] leading-relaxed text-xs">
                    {factCheckData.explanation}
                  </p>

                  {factCheckData.communityNote && (
                    <div className="p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-xs space-y-1">
                      <span className="font-bold text-[hsl(var(--foreground))] block">
                        𝕏 Community Note Format:
                      </span>
                      <p className="text-[hsl(var(--text-muted))] italic leading-relaxed">
                        {factCheckData.communityNote}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    {factCheckData.sources?.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--text-muted))]">
                        <span>Source:</span>
                        <a
                          href={factCheckData.sources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-[hsl(var(--accent))] truncate max-w-[200px]"
                        >
                          {factCheckData.sources[0].title || "Primary Source"}
                        </a>
                      </div>
                    )}
                    {factCheckData.tweetIntentUrl && (
                      <a
                        href={factCheckData.tweetIntentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-colors ml-auto shadow-sm"
                      >
                        <span>Post as 𝕏 Note</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Metadata and Actions */}
          <footer className="border-t border-[hsl(var(--border))] pt-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="text-sm text-[hsl(var(--text-subtle))]">
                <p>{annotation.views || 0} views</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                {currentUserId && annotation.userId === currentUserId && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded text-sm font-medium border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>{isDeleting ? "Deleting..." : "Delete Note"}</span>
                  </button>
                )}
                <button
                  onClick={handleFactCheck}
                  disabled={factCheckLoading}
                  className="px-4 py-2 rounded text-sm font-medium border border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10 transition-colors w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Fact check this annotation with Gemini AI"
                >
                  <Sparkles size={14} className="text-purple-400" />
                  <span>
                    {factCheckLoading
                      ? "Analyzing..."
                      : factCheckData
                      ? isFactCheckMinimized
                        ? "Show Fact Check"
                        : "Hide Fact Check"
                      : "Fact Check"}
                  </span>
                </button>
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

            <div className="mt-4 text-right">
              <Tooltip content="File a DMCA / Fair Use dispute for this content" position="top">
                <Link
                  href={`/dmca?annotation_id=${annotation.id}&url=${encodeURIComponent(annotation.url || "")}`}
                  className="text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors font-medium"
                >
                  File a claim (Dispute Fair Use)
                </Link>
              </Tooltip>
            </div>
          </footer>

          {/* Comment Section */}
          <CommentSection
            annotationId={annotation.id}
            author={{
              id: annotation.userId,
              username: annotation.username,
              displayName: annotation.userDisplayName,
              avatar: annotation.avatar_url
            }}
          />
        </article>
      </main>

      <Footer />
    </div>
  );
}
