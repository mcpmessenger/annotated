"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface ModerationVerdict {
  allowed: boolean;
  reason?: string;
  categories?: string[];
}

/** Screen text (and optionally an image/video URL) before publishing. Fails open on network errors. */
export async function moderateBeforePublish(text: string, mediaUrl?: string | null): Promise<ModerationVerdict> {
  try {
    const res = await fetch("/api/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mediaUrl: mediaUrl || undefined }),
    });
    if (!res.ok) return { allowed: true };
    const data = await res.json();
    return {
      allowed: data.allowed !== false,
      reason: data.reason,
      categories: data.categories,
    };
  } catch {
    return { allowed: true };
  }
}

export async function submitReport(params: {
  contentType: "annotation" | "comment" | "user";
  contentId: string;
  reportedUserId?: string | null;
  reason: string;
  details?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        reporterId: session?.user?.id,
        client: "web",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data?.error || "Could not submit report." };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not submit report." };
  }
}

// ─── Block list ───────────────────────────────────────────────────────────────

let blockedCache: Set<string> | null = null;
let blockedLoading: Promise<Set<string>> | null = null;
const listeners = new Set<() => void>();

async function loadBlocked(): Promise<Set<string>> {
  if (blockedCache) return blockedCache;
  if (blockedLoading) return blockedLoading;
  blockedLoading = (async () => {
    const set = new Set<string>();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", session.user.id);
        (data || []).forEach((r: any) => set.add(r.blocked_id));
      }
    } catch {
      /* table may not exist yet */
    }
    blockedCache = set;
    blockedLoading = null;
    return set;
  })();
  return blockedLoading;
}

export async function blockUser(blockedId: string): Promise<{ ok: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Sign in to block users." };
  const { error } = await supabase
    .from("user_blocks")
    .upsert({ blocker_id: session.user.id, blocked_id: blockedId });
  if (error) return { ok: false, error: error.message };
  const set = await loadBlocked();
  set.add(blockedId);
  listeners.forEach((l) => l());
  return { ok: true };
}

export function useBlockedUsers(): Set<string> {
  const [blocked, setBlocked] = useState<Set<string>>(blockedCache || new Set());
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      loadBlocked().then((s) => alive && setBlocked(new Set(s)));
    };
    refresh();
    listeners.add(refresh);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      blockedCache = null;
      refresh();
    });
    return () => {
      alive = false;
      listeners.delete(refresh);
      sub.subscription.unsubscribe();
    };
  }, []);
  return blocked;
}
