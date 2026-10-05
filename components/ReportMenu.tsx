"use client";

import { useState } from "react";
import { Flag, ShieldOff, X } from "lucide-react";
import { submitReport, blockUser } from "@/lib/moderationClient";

const REASONS: { value: string; label: string }[] = [
  { value: "sexual", label: "Sexual or explicit content" },
  { value: "minors", label: "Involves minors / child safety" },
  { value: "violence", label: "Graphic violence or gore" },
  { value: "hate", label: "Hate speech" },
  { value: "harassment", label: "Harassment or threats" },
  { value: "self_harm", label: "Self-harm" },
  { value: "illegal", label: "Illegal activity" },
  { value: "spam", label: "Spam or scam" },
  { value: "misinformation", label: "Harmful misinformation" },
  { value: "other", label: "Something else" },
];

interface ReportMenuProps {
  contentType: "annotation" | "comment";
  contentId: string;
  authorId?: string | null;
  currentUserId?: string | null;
  /** Called after the content is reported. */
  onReported?: () => void;
  /** Called after the author is blocked so the parent can hide their content. */
  onBlocked?: () => void;
  /** Compact icon-only trigger (used in comment rows). */
  compact?: boolean;
}

export function ReportMenu({ contentType, contentId, authorId, currentUserId, onReported, onBlocked, compact }: ReportMenuProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canBlock = !!authorId && !!currentUserId && authorId !== currentUserId;
  const isOwn = !!authorId && authorId === currentUserId;
  if (isOwn) return null;

  const close = () => {
    setOpen(false);
    setReason("");
    setDetails("");
    setError(null);
    setDone(null);
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!reason) {
      setError("Please choose a reason.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await submitReport({ contentType, contentId, reportedUserId: authorId, reason, details });
    setBusy(false);
    if (res.ok) {
      setDone("Thanks — our team will review this report. Content that violates our guidelines is removed within 24 hours.");
      onReported?.();
    } else {
      setError(res.error || "Could not submit report.");
    }
  };

  const handleBlock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authorId) return;
    setBusy(true);
    const res = await blockUser(authorId);
    setBusy(false);
    if (res.ok) {
      close();
      onBlocked?.();
    } else {
      setError(res.error || "Could not block user.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="Report or block"
        aria-label="Report or block"
        className={
          compact
            ? "relative z-20 inline-flex items-center gap-1 text-[11px] text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors cursor-pointer"
            : "relative z-20 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-red-500 hover:bg-[hsl(var(--border))]/50 transition-colors cursor-pointer"
        }
      >
        <Flag size={compact ? 11 : 12} />
        <span className={compact ? "" : "hidden sm:inline"}>Report</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 shadow-xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-base flex items-center gap-2">
                <Flag size={16} className="text-red-500" /> Report {contentType}
              </h4>
              <button type="button" onClick={close} aria-label="Close" className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {done ? (
              <div className="space-y-4">
                <p className="text-sm text-[hsl(var(--text-subtle))]">{done}</p>
                <button type="button" onClick={close} className="w-full rounded-md bg-[#FFD21A] text-black font-bold text-sm py-2 cursor-pointer">
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[hsl(var(--text-muted))]">Why are you reporting this?</p>
                <div className="grid gap-1.5 max-h-56 overflow-y-auto">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border cursor-pointer ${
                        reason === r.value
                          ? "border-[#FFD21A] bg-[#FFD21A]/10"
                          : "border-[hsl(var(--border))] hover:bg-[hsl(var(--border))]/40"
                      }`}
                    >
                      <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                  placeholder="Add details (optional)"
                  className="w-full text-sm rounded-md border border-[hsl(var(--border))] bg-transparent p-2 h-16 resize-none"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy}
                  className="w-full rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2 disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "Submitting…" : "Submit report"}
                </button>
                {canBlock && (
                  <button
                    type="button"
                    onClick={handleBlock}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 rounded-md border border-[hsl(var(--border))] text-sm py-2 hover:bg-[hsl(var(--border))]/40 disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldOff size={14} /> Block this user
                  </button>
                )}
                <p className="text-[11px] text-[hsl(var(--text-muted))]">
                  See our <a href="/terms#community-guidelines" className="underline">Community Guidelines</a>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
