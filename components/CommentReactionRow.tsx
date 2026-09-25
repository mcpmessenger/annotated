"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const EMOJIS = ['🔥', '🤔', '💡', '💯', '👎'];

export function CommentReactionRow({ commentId }: { commentId: string }) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

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
  }, [commentId]);

  const fetchReactions = async (userId?: string) => {
    try {
      const { data, error } = await supabase
        .from('comment_reactions')
        .select('*')
        .eq('comment_id', commentId);
        
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
    } catch (err) {
      console.error("[CommentReactions] fetch error:", err);
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) {
      alert("Please sign in to react to comments!");
      return;
    }

    const isReacted = userReactions.has(emoji);
    const newCounts = { ...reactions };
    const newUserReacted = new Set(userReactions);
    
    if (isReacted) {
      newCounts[emoji] = Math.max(0, (newCounts[emoji] || 1) - 1);
      newUserReacted.delete(emoji);
      setReactions(newCounts);
      setUserReactions(newUserReacted);
      
      await supabase
        .from('comment_reactions')
        .delete()
        .match({ comment_id: commentId, user_id: user.id, emoji });
    } else {
      newCounts[emoji] = (newCounts[emoji] || 0) + 1;
      newUserReacted.add(emoji);
      setReactions(newCounts);
      setUserReactions(newUserReacted);
      
      await supabase
        .from('comment_reactions')
        .insert({ comment_id: commentId, user_id: user.id, emoji });
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => toggleReaction(emoji)}
          className={`flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-full text-xs font-medium transition-all touch-manipulation cursor-pointer ${
            userReactions.has(emoji) 
              ? 'bg-[hsl(var(--accent))] text-white border border-[hsl(var(--accent))] font-bold shadow-sm' 
              : 'bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]'
          }`}
        >
          <span className="leading-none">{emoji}</span>
          <span className="text-[10px] font-semibold">{reactions[emoji] || 0}</span>
        </button>
      ))}
    </div>
  );
}
