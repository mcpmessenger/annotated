'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
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
} from 'lucide-react';

function ShareContent() {
  const searchParams = useSearchParams();
  const rawUrl = searchParams.get('url') || '';
  const rawTitle = searchParams.get('title') || '';
  const rawText = searchParams.get('text') || '';

  const [copied, setCopied] = useState(false);
  const [factCheckData, setFactCheckData] = useState<any>(null);
  const [factCheckLoading, setFactCheckLoading] = useState(false);

  const displayTitle = rawTitle || (rawUrl ? new URL(rawUrl).hostname : 'Shared Content');
  const quoteText = rawText || rawTitle;

  const handleCopy = () => {
    if (rawUrl) {
      navigator.clipboard.writeText(rawUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFactCheck = async () => {
    if (!quoteText && !rawUrl) return;
    setFactCheckLoading(true);

    try {
      const res = await fetch('/api/ai/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: quoteText || 'Content from ' + rawUrl,
          sourceUrl: rawUrl,
          sourceTitle: rawTitle,
          hostname: rawUrl ? new URL(rawUrl).hostname : '',
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
          <p className="text-xs text-slate-400">Public Web Annotation & Verification</p>
        </div>
      </div>

      {/* Shared Target Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur mb-6 shadow-xl">
        {rawUrl && (
          <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-3 break-all">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <a href={rawUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {rawUrl}
            </a>
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-200 mb-3">{displayTitle}</h2>

        {quoteText && (
          <div className="relative pl-4 border-l-2 border-blue-500/40 my-4 text-slate-300 italic text-sm leading-relaxed">
            <Quote className="w-3.5 h-3.5 text-blue-400 absolute -left-1.5 -top-1 bg-slate-900" />
            "{quoteText}"
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={handleFactCheck}
            disabled={factCheckLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {factCheckLoading ? 'Verifying with Gemini...' : 'Fact Check with AI'}
          </button>

          {rawUrl && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Link Copied' : 'Copy Link'}
            </button>
          )}

          {rawUrl && (
            <a
              href={rawUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Visit Source
            </a>
          )}
        </div>
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
