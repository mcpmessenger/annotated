'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/lib/supabaseClient';
import {
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Copy,
  Check,
  Send,
  LogIn,
  Film,
} from 'lucide-react';
import { VideoClipTrimmer } from '@/components/VideoClipTrimmer';
import { Tooltip } from '@/components/Tooltip';

const SIGNATURE_EMOJIS = ['🔥', '🤔', '💡', '💯', '👎'];

function ShareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawUrl = searchParams.get('url') || searchParams.get('link') || searchParams.get('source') || '';
  const rawTitle = searchParams.get('title') || searchParams.get('page_title') || '';
  const rawText = searchParams.get('text') || searchParams.get('quote') || searchParams.get('quote_text') || searchParams.get('q') || searchParams.get('description') || '';

  // Extract link if text contains a URL (typical of Android YouTube/Twitter sharing)
  let targetUrl = rawUrl;
  let quoteCandidate = rawText;

  if (!targetUrl && rawText) {
    const match = rawText.match(/https?:\/\/[^\s]+/i);
    if (match) {
      targetUrl = match[0];
      quoteCandidate = rawText.replace(match[0], '').trim();
    }
  }

  let hostname = '';
  try {
    if (targetUrl) hostname = new URL(targetUrl).hostname;
  } catch (_) {}

  // Detect video content (YouTube or direct video file)
  const ytMatch = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  const youtubeVideoId = ytMatch ? ytMatch[1] : null;
  const isVideoUrl = !!youtubeVideoId || /\.(mp4|webm|mov)(\?|$)/i.test(targetUrl);

  const displayTitle = rawTitle || hostname || 'Shared Web Content';
  const quoteText = quoteCandidate || rawTitle;

  const [copied, setCopied] = useState(false);
  const [comment, setComment] = useState('');
  const [intent, setIntent] = useState('💡');
  const [session, setSession] = useState<any>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const [showVideoTrimmer, setShowVideoTrimmer] = useState(isVideoUrl);
  const [clipRange, setClipRange] = useState<{ start: number; end: number; formatted: string } | null>(null);

  const [factCheckData, setFactCheckData] = useState<any>(null);
  const [factCheckLoading, setFactCheckLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleCopy = () => {
    if (targetUrl) {
      navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePublish = async () => {
    if (!comment.trim() && !quoteText && !clipRange) return;
    setPublishing(true);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        // Sign in with Google
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.href }
        });
        return;
      }

      const finalComment = (showVideoTrimmer && clipRange)
        ? `${clipRange.formatted} ${comment.trim()}`
        : (comment.trim() || 'Shared via Mobile');

      const finalQuote = (showVideoTrimmer && clipRange)
        ? (quoteText ? `${quoteText} ${clipRange.formatted}` : `🎬 Video Clip (${displayTitle}) ${clipRange.formatted}`)
        : (quoteText || displayTitle);

      const finalUrl = (youtubeVideoId && clipRange && showVideoTrimmer)
        ? (targetUrl.includes('?') ? `${targetUrl}&t=${clipRange.start}s` : `${targetUrl}?t=${clipRange.start}s`)
        : (targetUrl || window.location.href);

      const row = {
        url: finalUrl,
        page_title: displayTitle,
        hostname: hostname || 'web',
        quote: finalQuote,
        comment: finalComment,
        intent: intent,
        user_id: currentSession.user.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('annotations').insert(row).select().single();
      if (error) throw error;

      setPublishedSlug(data?.slug || data?.id);
    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Could not publish annotation: ' + (err.message || 'Unknown error'));
    } finally {
      setPublishing(false);
    }
  };

  const handleFactCheck = async () => {
    if (!quoteText && !targetUrl) return;
    setFactCheckLoading(true);

    try {
      const res = await fetch('/api/ai/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: quoteText || 'Content from ' + targetUrl,
          sourceUrl: targetUrl,
          sourceTitle: rawTitle,
          hostname: hostname,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFactCheckData(data);
      }
    } catch (err) {
      console.error('Fact check failed:', err);
    } finally {
      setFactCheckLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Signature Header — Canonical Logo */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Annotated Logo" className="w-7 h-7 object-contain" />
          <span className="font-extrabold text-2xl tracking-tight text-[hsl(var(--foreground))] select-none">
            annotated<span className="text-[#FFD21A]">.</span>
          </span>
        </div>

        {targetUrl && (
          <Tooltip content="Copy URL" position="top">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--border))]/40 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </Tooltip>
        )}
      </div>

      {/* Main Composer Box — Harmonious with Extension & Header */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 shadow-sm space-y-4">
        {/* Source Link Chip */}
        {targetUrl && (
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))]">
            <Globe className="w-3.5 h-3.5 text-[#FFD21A] shrink-0" />
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:underline truncate text-[hsl(var(--foreground))] font-medium"
            >
              {displayTitle}
            </a>
          </div>
        )}

        {/* Quoted Text Box — Extension Signature Styling */}
        {quoteText && (
          <div className="pl-3.5 border-l-4 border-[#FFD21A] bg-[hsl(var(--border))]/25 py-2.5 pr-3 rounded-r-lg italic text-[hsl(var(--foreground))] text-sm leading-relaxed font-serif">
            &ldquo;{quoteText}&rdquo;
          </div>
        )}

        {/* 90s Video Clip Trimmer */}
        {(isVideoUrl || targetUrl) && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowVideoTrimmer(!showVideoTrimmer)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                  showVideoTrimmer
                    ? 'bg-[#FFD21A] text-black border-[#FFD21A] shadow-sm font-bold'
                    : 'bg-[hsl(var(--border))]/20 border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]/40'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{showVideoTrimmer ? 'Hide 90s Trimmer' : '✂️ Trim 90s Video Clip'}</span>
              </button>
              {clipRange && showVideoTrimmer && (
                <span className="text-xs font-mono text-[hsl(var(--text-muted))] font-bold">
                  {clipRange.formatted}
                </span>
              )}
            </div>

            {showVideoTrimmer && (
              <VideoClipTrimmer
                videoUrl={targetUrl}
                youtubeId={youtubeVideoId}
                onClipChange={setClipRange}
              />
            )}
          </div>
        )}

        {/* Inline Annotation Composer */}
        {publishedSlug ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-3">
            <span>🎉 Annotation published successfully!</span>
            <button
              onClick={() => router.push(`/explore`)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
            >
              View in Feed
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Signature Emoji Bar — Exact match to extension widget */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[hsl(var(--text-muted))]">Quick React:</span>
              <div className="flex items-center gap-1.5">
                {SIGNATURE_EMOJIS.map((emoji) => (
                  <Tooltip key={emoji} content={`React with ${emoji}`} position="top">
                    <button
                      type="button"
                      onClick={() => setIntent(intent === emoji ? '' : emoji)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-transform active:scale-95 cursor-pointer ${
                        intent === emoji
                          ? 'bg-[#FFD21A] text-black shadow-sm ring-2 ring-[#FFD21A]'
                          : 'bg-[hsl(var(--border))]/30 hover:bg-[hsl(var(--border))]/60 text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                      }`}
                    >
                      {emoji}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Commentary Input */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Drop your thoughts, context, or question on this..."
              rows={3}
              className="w-full rounded-lg bg-[hsl(var(--border))]/15 border border-[hsl(var(--border))] p-3 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--text-muted))] focus:outline-none focus:border-[#FFD21A] transition resize-none leading-relaxed"
            />

            {/* Action Bar — Signature extension-styled Publish button */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-2.5 px-4 rounded-lg bg-[#000] text-white hover:bg-black/90 font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <span>{publishing ? 'Publishing...' : session ? 'Publish' : 'Sign in to Publish'}</span>
                <span className="text-[#FFD21A] font-extrabold text-base">→</span>
              </button>

              <div className="flex items-center justify-end">
                <Tooltip content={factCheckLoading ? "Analyzing claim with Gemini AI..." : "Fact check text with Gemini AI"} position="top">
                  <button
                    type="button"
                    onClick={handleFactCheck}
                    disabled={factCheckLoading}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] text-[hsl(var(--foreground))] text-xs font-semibold border border-[hsl(var(--border))] transition disabled:opacity-50 cursor-pointer touch-manipulation min-h-[32px]"
                  >
                    <span className="text-xs leading-none">⚡</span>
                    <span>{factCheckLoading ? 'Verifying...' : 'Fact Check with Gemini'}</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fact Check Results Card — Matching AnnotationCard Nordic Styling */}
      {factCheckData && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--border))]/15 p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-bold text-[#FFD21A] dark:text-[#FFD21A] text-xs uppercase tracking-wide">
                <span className="leading-none">⚡</span>
                <span>Gemini Fact Check</span>
              </span>
              {factCheckData.verdict && (
                <span
                  className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    factCheckData.verdict === 'VERIFIED'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                      : factCheckData.verdict === 'FALSE'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                  }`}
                >
                  {factCheckData.verdict === 'VERIFIED' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : factCheckData.verdict === 'FALSE' ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  <span>{factCheckData.verdict.replace('_', ' ')}</span>
                </span>
              )}
            </div>
          </div>

          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] leading-snug">
            {factCheckData.headline}
          </h3>

          <p className="text-xs text-[hsl(var(--text-muted))] leading-relaxed">
            {factCheckData.explanation}
          </p>

          {factCheckData.sources?.length > 0 && (
            <div className="border-t border-[hsl(var(--border))] pt-3">
              <span className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider block mb-2">
                Primary Sources
              </span>
              <div className="space-y-1.5">
                {factCheckData.sources.map((s: any, idx: number) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))] hover:text-[#FFD21A] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0 text-[#FFD21A]" />
                    <span className="truncate">{s.title || s.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SharePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-[hsl(var(--text-muted))]">
              Loading shared content...
            </div>
          }
        >
          <ShareContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
