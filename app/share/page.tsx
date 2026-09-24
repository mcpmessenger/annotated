'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/lib/supabaseClient';
import {
  Share2,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Quote,
  Copy,
  Check,
  Send,
  LogIn,
} from 'lucide-react';

function ShareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawUrl = searchParams.get('url') || '';
  const rawTitle = searchParams.get('title') || '';
  const rawText = searchParams.get('text') || '';

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

  const displayTitle = rawTitle || hostname || 'Shared Web Content';
  const quoteText = quoteCandidate || rawTitle;

  const [copied, setCopied] = useState(false);
  const [comment, setComment] = useState('');
  const [intent, setIntent] = useState('💡');
  const [session, setSession] = useState<any>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

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
    if (!comment.trim() && !quoteText) return;
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

      const row = {
        url: targetUrl || window.location.href,
        page_title: displayTitle,
        hostname: hostname || 'web',
        quote: quoteText || displayTitle,
        comment: comment.trim() || 'Shared via Mobile',
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Mobile Card Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Share2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Share to Annotated</h1>
          <p className="text-xs text-slate-400">Annotate, Fact-Check & Share from Android</p>
        </div>
      </div>

      {/* Shared Target Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur mb-6 shadow-xl space-y-4">
        {targetUrl && (
          <div className="flex items-center gap-2 text-xs text-blue-400 font-mono break-all">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <a href={targetUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {targetUrl}
            </a>
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-200 leading-snug">{displayTitle}</h2>

        {quoteText && (
          <div className="relative pl-4 border-l-2 border-blue-500/40 my-3 text-slate-300 italic text-sm leading-relaxed">
            <Quote className="w-3.5 h-3.5 text-blue-400 absolute -left-1.5 -top-1 bg-slate-900" />
            "{quoteText}"
          </div>
        )}

        {/* Inline Mobile Annotation Composer */}
        {publishedSlug ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between gap-3">
            <span>🎉 Annotation published successfully!</span>
            <button
              onClick={() => router.push(`/explore`)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition"
            >
              View in Feed
            </button>
          </div>
        ) : (
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Intent:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { emoji: '💡', label: 'Insight' },
                  { emoji: '🤔', label: 'Question' },
                  { emoji: '🔥', label: 'Hot Take' },
                  { emoji: '💯', label: 'Agree' },
                ].map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => setIntent(item.emoji)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                      intent === item.emoji
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{item.emoji} {item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Drop your thoughts, context, or question on this..."
              rows={3}
              className="w-full rounded-xl bg-slate-800/50 border border-slate-700/80 p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
            />

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition disabled:opacity-50"
              >
                {session ? <Send className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                {publishing ? 'Publishing...' : session ? 'Publish Annotation' : 'Sign in to Annotate'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFactCheck}
                  disabled={factCheckLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  {factCheckLoading ? 'Verifying...' : 'Fact Check'}
                </button>

                {targetUrl && (
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fact Check Results Card */}
      {factCheckData && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              {factCheckData.verdict === 'VERIFIED' && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                </span>
              )}
              {factCheckData.verdict === 'FALSE' && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                  <XCircle className="w-3.5 h-3.5" /> FALSE
                </span>
              )}
              {(factCheckData.verdict === 'MISLEADING' ||
                factCheckData.verdict === 'CONTEXT_NEEDED') && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> {factCheckData.verdict.replace('_', ' ')}
                </span>
              )}
              <span className="text-[11px] text-slate-400">Gemini AI Analysis</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-slate-100 mb-2 leading-snug">
            {factCheckData.headline}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {factCheckData.explanation}
          </p>

          {factCheckData.communityNote && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3 text-xs text-blue-200/90 leading-relaxed mb-4">
              <span className="font-semibold text-blue-400">Readers added context: </span>
              {factCheckData.communityNote.replace(/^Readers added context:\s*/i, '')}
            </div>
          )}

          {factCheckData.sources?.length > 0 && (
            <div className="border-t border-slate-800/80 pt-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Primary Sources
              </span>
              <div className="space-y-1.5">
                {factCheckData.sources.map((s: any, idx: number) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span>{s.title || s.url}</span>
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
    <div className="flex flex-col min-h-screen bg-[#0B0F19] text-slate-100">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-slate-400">
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
