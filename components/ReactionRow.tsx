"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const EMOJIS = ['🔥', '🤔', '💡', '💯', '👎'];

export function ReactionRow({ annotationId }: { annotationId: string }) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchReactions(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchReactions(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [annotationId]);

  const fetchReactions = async (userId?: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('annotation_reactions')
      .select('*')
      .eq('annotation_id', annotationId);
      
    if (data) {
      const counts: Record<string, number> = {};
      const userReacted = new Set<string>();
      
      data.forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        if (userId && r.user_id === userId) {
          userReacted.add(r.emoji);
        }
      });
      
      setReactions(counts);
      setUserReactions(userReacted);
    }
    setLoading(false);
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) {
      alert("Please sign in to react!");
      return;
    }

    // Optimistic UI update
    const isReacted = userReactions.has(emoji);
    const newCounts = { ...reactions };
    const newUserReacted = new Set(userReactions);
    
    if (isReacted) {
      newCounts[emoji] = (newCounts[emoji] || 1) - 1;
      newUserReacted.delete(emoji);
      setReactions(newCounts);
      setUserReactions(newUserReacted);
      
      await supabase
        .from('annotation_reactions')
        .delete()
        .match({ annotation_id: annotationId, user_id: user.id, emoji });
    } else {
      newCounts[emoji] = (newCounts[emoji] || 0) + 1;
      newUserReacted.add(emoji);
      setReactions(newCounts);
      setUserReactions(newUserReacted);
      
      await supabase
        .from('annotation_reactions')
        .insert({ annotation_id: annotationId, user_id: user.id, emoji });
    }
  };

  if (loading) return <div className="h-8"></div>;

  return (
    <div className="flex items-center gap-2 mt-4 relative z-20 flex-wrap">
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleReaction(emoji);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 min-h-[32px] rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation cursor-pointer ${
            userReactions.has(emoji) 
              ? 'bg-[hsl(var(--accent))] text-white border border-[hsl(var(--accent))] font-bold shadow-sm' 
              : 'bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]'
          }`}
        >
          <span className="leading-none">{emoji}</span>
          <span className="font-semibold">{reactions[emoji] || 0}</span>
        </button>
      ))}
    </div>
  );
}
