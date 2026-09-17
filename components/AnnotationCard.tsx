"use client";

import { useState } from "react";
import Link from "next/link";
import { Annotation } from "@/lib/types";
import { ReactionRow } from "./ReactionRow";

export function AnnotationCard({ annotation }: { annotation: Annotation }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const detailLink = `/${annotation.username}/${annotation.slug}`;

  const isLongQuote = annotation.quoteText.length > 150;
  const isLongCommentary = annotation.commentary.length > 150;
  const showToggle = isLongQuote || isLongCommentary;

  return (
    <article className="annotation-card group hover:-translate-y-1 transition-transform relative">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 flex items-center gap-3">
          {annotation.avatar_url ? (
            <img src={annotation.avatar_url} alt={annotation.userDisplayName} className="w-10 h-10 rounded-full" />
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
            <p className="text-sm text-[hsl(var(--text-subtle))] mt-1">
              by{" "}
              <Link href={`/u/${annotation.username}`} className="font-medium text-[hsl(var(--foreground))] hover:underline relative z-10">
                {annotation.userDisplayName}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Quoted Box */}
      <div className="p-4 rounded my-4 border-l-4 border-[hsl(var(--accent))] bg-[hsl(var(--border))] relative z-20">
        <p className={`text-sm italic text-[hsl(var(--text-muted))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
          &ldquo;{annotation.quoteText}&rdquo;
        </p>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(var(--border))]/50">
          <p className="text-xs text-[hsl(var(--text-subtle))]">
            from{" "}
            <a href={annotation.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--accent))] hover:underline font-medium relative z-30">
              {annotation.sourceTitle}
            </a>
          </p>

          {showToggle && (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="text-[hsl(var(--accent))] text-xs font-semibold hover:underline relative z-30 ml-auto"
            >
              {isExpanded ? "See less" : "See more"}
            </button>
          )}
        </div>
      </div>
      
      {annotation.media_url && (
        <div className="my-4 rounded overflow-hidden border border-[hsl(var(--border))] bg-black relative z-10">
          {annotation.media_type === "video" ? (
            <video src={annotation.media_url} controls className="w-full max-h-64 object-contain" />
          ) : (
            <img src={annotation.media_url} alt="Attached media" className="w-full max-h-64 object-contain" />
          )}
        </div>
      )}

      {/* Commentary */}
      <div className="relative z-10 mb-4">
        <p className={`text-base text-[hsl(var(--foreground))] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
          {annotation.commentary}
        </p>
      </div>

      <ReactionRow annotationId={annotation.id} />

      <div className="flex items-center justify-between text-xs text-[hsl(var(--text-subtle))] relative z-10 mt-4 pt-4 border-t border-[hsl(var(--border))]">
        <span>
          {annotation.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </article>
  );
}
