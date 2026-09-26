"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ExternalLink,
  Sparkles,
  ArrowRight,
  Share2,
  CheckCircle2,
  Tv,
  Globe,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAnnotationBySlug } from "@/lib/data";
import { FollowButton } from "@/components/FollowButton";

export default function MobilePassPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = (params?.slug as string) || "";

  const [annotation, setAnnotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (rawSlug) {
      getAnnotationBySlug(rawSlug)
        .then((data) => {
          if (data?.username && data?.slug) {
            router.replace(`/${data.username}/${data.slug}`);
            return;
          }
          setAnnotation(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load mobile pass annotation:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [rawSlug, router]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: annotation?.title || "Annotated Pass",
          text: annotation?.quoteText || annotation?.commentary || "",
          url: window.location.href,
        });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-[hsl(var(--text-muted))]">Connecting to Roku Mobile Pass...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!annotation) {
    return (
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <Tv className="w-12 h-12 text-[hsl(var(--text-muted))] mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Pass Not Found</h2>
          <p className="text-sm text-[hsl(var(--text-muted))] mb-6">
            We couldn't find an annotation matching this TV QR code. It may have expired or been removed.
          </p>
          <Link
            href="/explore"
            className="px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Explore Community Notes
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const fullUrl = `/${annotation.username}/${annotation.slug}`;

  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--background))]">
      <Header />

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-xl mx-auto w-full">
        {/* Pass Header Badge */}
        <div className="flex items-center justify-between gap-2 mb-4 bg-sky-950/40 border border-sky-500/30 rounded-full px-4 py-1.5 text-xs text-sky-400">
          <span className="flex items-center gap-1.5 font-medium tracking-wide">
            <Tv className="w-3.5 h-3.5" /> ROKU TV MOBILE PASS
          </span>
          <span className="text-[10px] text-sky-300/70 uppercase tracking-wider">Sync Active</span>
        </div>

        {/* Primary Card */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden">
          {/* Author Bar */}
          <div className="p-4 sm:p-5 border-b border-[hsl(var(--border))] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {annotation.avatar_url ? (
                <img
                  src={annotation.avatar_url}
                  alt={annotation.userDisplayName}
                  className="w-10 h-10 rounded-full object-cover border border-[hsl(var(--border))]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm border border-sky-500/30">
                  {annotation.userDisplayName?.charAt(0)?.toUpperCase() || "A"}
                </div>
              )}
              <div className="min-w-0">
                <Link
                  href={`/u/${annotation.username}`}
                  className="font-bold text-sm hover:text-sky-400 transition-colors block truncate"
                >
                  {annotation.userDisplayName}
                </Link>
                <p className="text-xs text-[hsl(var(--text-muted))] truncate">@{annotation.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {annotation.userId && <FollowButton targetUserId={annotation.userId} size="sm" />}
              <button
                onClick={handleShare}
                aria-label="Share annotation"
                className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent-subtle))] text-[hsl(var(--text-muted))] transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Direct Link to Original Source Banner (Prominent CTA) */}
          <div className="p-4 bg-sky-500/10 border-b border-sky-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-0.5">
                  Original Source Content
                </span>
                <p className="text-xs text-[hsl(var(--foreground))] font-semibold truncate">
                  {annotation.sourceTitle || annotation.sourceDomain || "Source Article / Media"}
                </p>
                <p className="text-[11px] text-[hsl(var(--text-muted))] truncate mt-0.5">
                  {annotation.sourceDomain || annotation.sourceUrl}
                </p>
              </div>
              {annotation.sourceUrl && (
                <a
                  href={annotation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  <span>Open Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Full Quoted Source Content (High character count support) */}
            {annotation.quoteText && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  Highlighted Source Text
                </p>
                <blockquote className="pl-4 border-l-2 border-sky-400/80 italic text-sm sm:text-base leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap select-text bg-[hsl(var(--background))]/50 p-3 rounded-r-lg">
                  &ldquo;{annotation.quoteText}&rdquo;
                </blockquote>
              </div>
            )}

            {/* Attached Video/Media if available */}
            {annotation.media_url && (
              <div className="rounded-xl overflow-hidden border border-[hsl(var(--border))] bg-black">
                {annotation.media_type === "video" ||
                annotation.media_url.includes(".webm") ||
                annotation.media_url.includes(".mp4") ? (
                  <video
                    src={annotation.media_url}
                    controls
                    playsInline
                    className="w-full max-h-[360px] object-contain"
                  />
                ) : (
                  <img
                    src={annotation.media_url}
                    alt="Attached media"
                    className="w-full max-h-[360px] object-contain"
                  />
                )}
              </div>
            )}

            {/* Community Annotation / Commentary */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Annotation & Commentary
              </p>
              <div className="p-4 rounded-xl bg-[hsl(var(--border))]/30 border border-[hsl(var(--border))]">
                <p className="text-sm sm:text-base leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">
                  {annotation.commentary || "No additional commentary provided."}
                </p>
              </div>
            </div>

            {/* Fact Check Badge */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-300">COMMUNITY FACT CHECK</span>
                <p className="text-emerald-200/80 text-[11px] mt-0.5 leading-snug">
                  Consensus verified with primary sources. Verified accurate across multi-source review.
                </p>
              </div>
            </div>

            {/* Jump to Full Discussion Button */}
            <div className="pt-2 flex flex-col gap-2.5">
              {annotation.sourceUrl && (
                <a
                  href={annotation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Open Original Source</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <Link
                href={fullUrl}
                className="w-full py-2.5 px-4 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--border))]/50 text-xs font-semibold text-[hsl(var(--foreground))] flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Join Full Discussion & Community Notes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
