"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Trash2 } from "lucide-react";
import { useEffect } from "react";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
                <Link href={detailLink} className="before:absolute before:inset-0">
                  {annotation.title}
                </Link>
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
          {annotation.media_type === "video" ? (
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

      <div className="flex items-center justify-between text-xs text-[hsl(var(--text-subtle))] relative z-20 mt-4 pt-4 border-t border-[hsl(var(--border))]">
        <span>
          {annotation.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>

        <div className="flex items-center gap-4 relative z-20">
          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] transition-colors font-medium cursor-pointer disabled:opacity-50"
              title="Delete your annotation"
            >
              <Trash2 size={12} />
              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
            </button>
          )}
          <Tooltip content="File a DMCA / Fair Use dispute for this content" position="top">
            <Link
              href={`/dmca?annotation_id=${annotation.id}&url=${encodeURIComponent(annotation.url || "")}`}
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
          </Link>
        </div>
      </div>
    </article>
  );
}
