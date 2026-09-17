'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const QUICK_EMOJIS = ["🔥", "🤔", "💡", "💯", "👎"];

export function CommentSection({ annotationId }: { annotationId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newText, setNewText] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    if (annotationId) {
      fetchComments();
    }

    return () => subscription.unsubscribe();
  }, [annotationId]);

  const insertEmoji = (emoji: string) => {
    setNewText((prev) => (prev ? `${prev} ${emoji}` : emoji));
  };

  const fetchComments = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("annotation_id", annotationId)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("[Comments] Fetch error:", error);
        setErrorMsg(error.message);
      } else {
        setComments(data || []);
      }
    } catch (err: any) {
      console.error("[Comments] Exception:", err);
      setErrorMsg(err.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newText.trim()) return;

    const text = newText.trim();
    setNewText("");
    setErrorMsg(null);

    const tempId = "temp-" + Date.now();
    const tempComment = {
      id: tempId,
      annotation_id: annotationId,
      user_id: user.id,
      text: text,
      created_at: new Date().toISOString(),
      user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
      user_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture
    };

    // Optimistic UI update
    setComments((prev) => [...prev, tempComment]);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          annotation_id: annotationId,
          user_id: user.id,
          text: text
        })
        .select();

      if (error) {
        console.error("[Comments] Insert error:", error);
        setErrorMsg("Failed to post comment: " + error.message);
        // Rollback optimistic update
        setComments((prev) => prev.filter((c) => c.id !== tempId));
      } else if (data && data.length > 0) {
        // Replace temp item with persisted database row
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? { ...c, ...data[0] } : c))
        );
      }
    } catch (err: any) {
      console.error("[Comments] Submit exception:", err);
      setErrorMsg("Error posting comment: " + err.message);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href }
    });
  };

  return (
    <div id="comments" className="mt-12 border-t border-[hsl(var(--border))] pt-8">
      <h3 className="text-xl font-bold mb-6">Comments ({comments.length})</h3>

      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-100 border border-red-300 text-red-800 text-sm">
          {errorMsg}
        </div>
      )}
      
      <div className="space-y-4 mb-8">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-[hsl(var(--border))] p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              {comment.user_avatar ? (
                <img src={comment.user_avatar} alt="Avatar" className="w-6 h-6 rounded-full border border-[hsl(var(--border))]" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[hsl(var(--accent))] text-white text-xs flex items-center justify-center font-bold">
                  {comment.user_name ? comment.user_name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                {comment.user_name || "Community Member"}
              </span>
              <span className="text-[10px] text-[hsl(var(--text-subtle))] ml-auto">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap pl-8">{comment.text}</p>
          </div>
        ))}

        {comments.length === 0 && !loading && (
          <p className="text-[hsl(var(--text-muted))] italic">No comments yet. Be the first to start the discussion!</p>
        )}
      </div>

      {user ? (
        <form onSubmit={submitComment} className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[hsl(var(--text-subtle))] font-medium">Quick React:</span>
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-[hsl(var(--border))]"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add your thoughts..."
            className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[6px] p-3 text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--accent))] resize-y min-h-[100px]"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!newText.trim()}
              className="px-4 py-2 rounded-[6px] text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer"
            >
              Post Comment
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-[hsl(var(--border))] p-6 rounded-lg text-center">
          <p className="text-[hsl(var(--text-muted))] mb-4">You must be logged in to leave a comment.</p>
          <button
            onClick={handleLogin}
            className="px-4 py-2 rounded-[6px] text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Sign In to Comment
          </button>
        </div>
      )}
    </div>
  );
}
