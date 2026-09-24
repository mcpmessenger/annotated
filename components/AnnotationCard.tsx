"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Trash2, Sparkles, Share2, CheckCircle2, AlertTriangle, XCircle, Info, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Annotation } from "@/lib/types";
import { ReactionRow } from "./ReactionRow";
import { FollowButton } from "./FollowButton";
import { Tooltip } from "@/components/Tooltip";

export function AnnotationCard({
  annotation,
  onDelete,
}: {
  annotation: Annotation;
  onDelete?: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [showFactCheck, setShowFactCheck] = useState(false);
  const [factCheckLoading, setFactCheckLoading] = useState(false);
  const [factCheckData, setFactCheckData] = useState<any>(null);
  const [isFactCheckMinimized, setIsFactCheckMinimized] = useState(false);

  useEffect(() => {
    if (annotation?.id && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`annotated_factcheck_${annotation.id}`);
        if (cached) {
          setFactCheckData(JSON.parse(cached));
          const minCached = localStorage.getItem(`annotated_factcheck_minimized_${annotation.id}`);
          setIsFactCheckMinimized(minCached === "true");
          setShowFactCheck(true);
        }
      } catch (e) {}
    }
  }, [annotation?.id]);

  const handleFactCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (factCheckData) {
      if (!showFactCheck) {
        setShowFactCheck(true);
        setIsFactCheckMinimized(false);
      } else {
        setIsFactCheckMinimized((prev) => {
          const next = !prev;
          if (typeof window !== "undefined" && annotation.id) {
            try {
              localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, String(next));
            } catch (err) {}
          }
          return next;
        });
      }
      return;
    }

    setShowFactCheck(true);
    setIsFactCheckMinimized(false);
    setFactCheckLoading(true);

    try {
      const res = await fetch("/api/ai/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: annotation.quoteText,
          commentary: annotation.commentary,
          sourceUrl: annotation.sourceUrl,
          sourceTitle: annotation.sourceTitle,
          mediaUrl: annotation.media_url,
        }),
      });
      const data = await res.json();
      setFactCheckData(data);
      if (typeof window !== "undefined" && annotation.id) {
        try {
          localStorage.setItem(`annotated_factcheck_${annotation.id}`, JSON.stringify(data));
          localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, "false");
        } catch (err) {}
      }
    } catch (err) {
      console.error("Fact-check request failed:", err);
    } finally {
      setFactCheckLoading(false);
    }
  };

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
    if (!annotation?.id) return;
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("annotation_id", annotation.id)
      .then(({ count, error }) => {
        if (!error && count !== null) {
          setCommentCount(count);
        }
      });
  }, [annotation?.id]);

  const isOwner = !!(currentUserId && annotation.userId === currentUserId);

  if (isDeleted) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

      setIsDeleted(true);
      if (onDelete) onDelete(annotation.id);
    } catch (err: any) {
      console.error("Error deleting annotation:", err);
      alert("Failed to delete annotation: " + (err.message || "Unknown error"));
      setIsDeleting(false);
    }
  };

  const detailLink = `/${annotation.username}/${annotation.slug}`;

  // Only show "See more" if the quote or commentary is genuinely long (> 240 chars)
  const isLongQuote = annotation.quoteText.length > 240;
  const isLongCommentary = annotation.commentary.length > 240;
  const showToggle = isLongQuote || isLongCommentary;

  return (
    <article className="annotation-card group hover:-translate-y-1 transition-transform relative border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--background))] shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 flex items-center gap-3">
          {annotation.avatar_url ? (
            <img src={annotation.avatar_url} alt={annotation.userDisplayName} className="w-10 h-10 rounded-full border border-[hsl(var(--border))]" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--border))] flex items-center justify-center font-bold text-[hsl(var(--text-muted))]">
              {annotation.userDisplayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg group-hover:text-[hsl(var(--accent))] transition-colors line-clamp-1">
                <a
                  href={annotation.sourceUrl || detailLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="before:absolute before:inset-0"
                >
                  {annotation.title}
                </a>
              </h3>
              {annotation.intent && (
                <span className="text-xl bg-[hsl(var(--border))] rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
                  {annotation.intent}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-[hsl(var(--text-subtle))]">
                by{" "}
                <Link href={`/u/${annotation.username}`} className="font-medium text-[hsl(var(--foreground))] hover:underline relative z-20">
                  {annotation.userDisplayName}
                </Link>
              </p>
              {annotation.userId && (
                <div className="relative z-20 inline-flex items-center">
                  <FollowButton targetUserId={annotation.userId} size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quoted Box */}
      <div className="p-4 rounded my-4 border-l-4 border-[hsl(var(--accent))] bg-[hsl(var(--border))]">
        <p className={`text-sm italic text-[hsl(var(--text-muted))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
          &ldquo;{annotation.quoteText}&rdquo;
        </p>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(var(--border))]/50">
          <p className="text-xs text-[hsl(var(--text-subtle))] flex items-center gap-1 max-w-[70%]">
            <span>from</span>
            <Tooltip content={annotation.sourceTitle || annotation.sourceUrl} position="top" className="truncate max-w-[260px] align-bottom">
              <a 
                href={annotation.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-[hsl(var(--accent))] hover:underline font-medium relative z-20 truncate inline-block"
              >
                {(() => {
                  if (!annotation.sourceUrl) return annotation.sourceDomain || annotation.sourceTitle || "source";
                  const tweetMatch = annotation.sourceUrl.match(/(?:x|twitter)\.com\/([^\/]+)\/status\/(\d+)/i);
                  if (tweetMatch) {
                    return `@${tweetMatch[1]} on x.com`;
                  }
                  return annotation.sourceDomain || (annotation.sourceTitle.length > 45 ? annotation.sourceTitle.slice(0, 45) + '...' : annotation.sourceTitle);
                })()}
              </a>
            </Tooltip>
          </p>

          {showToggle && (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="text-[hsl(var(--accent))] text-xs font-semibold hover:underline relative z-20 ml-auto"
            >
              {isExpanded ? "See less" : "See more"}
            </button>
          )}
        </div>
      </div>
      
      {annotation.media_url && (
        <div className="my-4 rounded overflow-hidden border border-[hsl(var(--border))] bg-black relative z-20">
          {(annotation.media_type === "video" || annotation.media_url.includes('.webm') || annotation.media_url.includes('.mp4')) ? (
            <video src={annotation.media_url} controls className="w-full max-h-64 object-contain" />
          ) : (
            <img src={annotation.media_url} alt="Attached media" className="w-full max-h-64 object-contain" />
          )}
        </div>
      )}

      {/* Commentary */}
      <div className="mb-4">
        <p className={`text-base text-[hsl(var(--foreground))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
          {annotation.commentary}
        </p>

        {annotation.audio_url && (
          <div className="mt-3 p-2 rounded bg-[hsl(var(--border))] border border-[hsl(var(--border))] relative z-20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--text-subtle))] mb-1">🎙️ Audio Commentary</p>
            <audio controls src={annotation.audio_url} className="w-full h-8" />
          </div>
        )}
      </div>

      <ReactionRow annotationId={annotation.id} />

      {/* Fact Check Result Box */}
      {showFactCheck && (
        <div className="mt-3">
          {factCheckLoading ? (
            <div className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-xs">
              <div className="py-1 text-[hsl(var(--text-muted))] italic flex items-center gap-2">
                <span className="inline-block animate-spin">⚡</span>
                <span>Analyzing claims and context with Gemini...</span>
              </div>
            </div>
          ) : factCheckData && isFactCheckMinimized ? (
            /* Minimized state: compact single-line bar */
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsFactCheckMinimized(false);
                if (typeof window !== "undefined" && annotation.id) {
                  try {
                    localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, "false");
                  } catch (err) {}
                }
              }}
              className="p-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))]/40 transition-colors flex items-center justify-between gap-2 cursor-pointer text-xs group"
              title="Click to expand Gemini Fact Check"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={12} className="text-purple-400 shrink-0" />
                <span className="font-bold text-[hsl(var(--accent))] text-[10px] uppercase tracking-wide shrink-0">
                  Gemini Fact Check:
                </span>
                {factCheckData?.verdict && (
                  <span
                    className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-full text-[9px] shrink-0 ${
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
                <span className="text-[hsl(var(--foreground))] truncate text-[11px] font-medium">
                  {factCheckData?.headline}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFactCheckMinimized(false);
                  if (typeof window !== "undefined" && annotation.id) {
                    try {
                      localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, "false");
                    } catch (err) {}
                  }
                }}
                className="text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--foreground))] font-semibold px-2 py-0.5 rounded hover:bg-[hsl(var(--border))] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Expand</span>
                <ChevronDown size={11} />
              </button>
            </div>
          ) : factCheckData ? (
            /* Expanded state: full comprehensive card */
            <div className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-bold text-[hsl(var(--accent))] text-[11px] uppercase tracking-wide">
                  <Sparkles size={13} />
                  <span>Gemini Fact Check</span>
                </span>
                <div className="flex items-center gap-2">
                  {factCheckData?.verdict && (
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFactCheckMinimized(true);
                      if (typeof window !== "undefined" && annotation.id) {
                        try {
                          localStorage.setItem(`annotated_factcheck_minimized_${annotation.id}`, "true");
                        } catch (err) {}
                      }
                    }}
                    className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] text-xs font-semibold px-2 py-0.5 rounded hover:bg-[hsl(var(--border))] transition-colors cursor-pointer flex items-center gap-1"
                    title="Minimize Fact Check"
                  >
                    <span>Minimize</span>
                    <ChevronUp size={11} />
                  </button>
                </div>
              </div>

              <p className="font-semibold text-[hsl(var(--foreground))] leading-snug">
                {factCheckData.headline}
              </p>
              <p className="text-[hsl(var(--text-muted))] leading-relaxed text-[11px]">
                {factCheckData.explanation}
              </p>
              {factCheckData.communityNote && (
                <div className="p-2.5 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[11px] space-y-1">
                  <span className="font-bold text-[hsl(var(--foreground))] block">𝕏 Community Note Format:</span>
                  <p className="text-[hsl(var(--text-muted))] italic">{factCheckData.communityNote}</p>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                {factCheckData.sources?.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--text-muted))]">
                    <span>Source:</span>
                    <a
                      href={factCheckData.sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[hsl(var(--accent))] truncate max-w-[150px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {factCheckData.sources[0].title || "Web Link"}
                    </a>
                  </div>
                )}
                {factCheckData.tweetIntentUrl && (
                  <a
                    href={factCheckData.tweetIntentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black text-white hover:bg-neutral-800 text-[11px] font-bold transition-colors ml-auto"
                  >
                    <span>Post as 𝕏 Note</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-[hsl(var(--text-subtle))] relative z-20 mt-4 pt-4 border-t border-[hsl(var(--border))]">
        <span>
          {annotation.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>

        <div className="flex items-center gap-4 relative z-20">
          {/* Fact Check Toggle */}
          <button
            onClick={handleFactCheck}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10 transition-colors cursor-pointer"
            title="Ask Gemini AI to verify claims"
          >
            <Sparkles size={11} />
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

          {/* Twitter / X Share Button */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Interesting annotation on "${annotation.sourceTitle}":\n"${annotation.quoteText?.slice(0, 100)}..."\n`)}&url=${encodeURIComponent(`https://annotated-repo.vercel.app/annotations/${annotation.id}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors font-medium"
            title="Share to X"
          >
            <span className="font-bold">𝕏</span>
            <span>Share</span>
          </a>

          {isOwner && (
            <Tooltip content="Delete your annotation" position="top">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors font-medium cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={12} />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            </Tooltip>
          )}
          <Tooltip content="File a DMCA / Fair Use dispute for this content" position="top">
            <Link
              href={`/dmca?annotation_id=${annotation.id}&url=${encodeURIComponent(annotation.sourceUrl || "")}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors font-medium"
            >
              File a claim
            </Link>
          </Tooltip>

          <Link
            href={`${detailLink}#comments`}
            className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <MessageSquare size={14} />
            <span>Comments</span>
            {commentCount !== null && (
              <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] leading-none">
                {commentCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </article>
  );
}
