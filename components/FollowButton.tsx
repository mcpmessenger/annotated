"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface FollowButtonProps {
  targetUserId: string;
  initialFollowerCount?: number;
  onCountChange?: (newCount: number) => void;
  className?: string;
  size?: "sm" | "md";
  showSelfBadge?: boolean;
}

export function FollowButton({
  targetUserId,
  initialFollowerCount,
  onCountChange,
  className = "",
  size = "md",
  showSelfBadge = false,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount || 0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid && targetUserId && uid !== targetUserId) {
        checkFollowStatus(uid, targetUserId);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid && targetUserId && uid !== targetUserId) {
        checkFollowStatus(uid, targetUserId);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [targetUserId]);

  const checkFollowStatus = async (followerId: string, followingId: string) => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      if (!error && data) {
        setIsFollowing(true);
      } else {
        setIsFollowing(false);
      }
    } catch (_) {}
    setLoading(false);
  };

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.href }
      });
      return;
    }

    if (currentUserId === targetUserId) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    const nextState = !isFollowing;
    const nextCount = Math.max(0, followerCount + (nextState ? 1 : -1));

    // Optimistic update
    setIsFollowing(nextState);
    setFollowerCount(nextCount);
    if (onCountChange) onCountChange(nextCount);

    try {
      if (nextState) {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetUserId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Follow error:", err);
      // Revert optimistic update on failure
      setIsFollowing(!nextState);
      setFollowerCount(followerCount);
      if (onCountChange) onCountChange(followerCount);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!targetUserId) {
    return null;
  }

  // If viewing self
  if (currentUserId && currentUserId === targetUserId) {
    if (showSelfBadge) {
      return (
        <span
          className={`inline-flex items-center justify-center rounded-full font-medium bg-[hsl(var(--border))] text-[hsl(var(--text-muted))] ${
            size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3.5 py-1 text-xs"
          } ${className}`}
        >
          Your Profile
        </span>
      );
    }
    return null;
  }

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-[11px] font-medium"
      : "px-4 py-1.5 text-xs font-semibold";

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading || isSubmitting}
      className={`inline-flex items-center justify-center rounded-full transition-colors cursor-pointer ${sizeClasses} ${
        isFollowing
          ? "bg-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent"
          : "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90"
      } ${className}`}
    >
      {loading ? "..." : isFollowing ? "Following" : "+ Follow"}
    </button>
  );
}
