'use client';
import { CommentReactionRow } from "./CommentReactionRow";
import { SpeechToTextButton } from "@/components/SpeechToTextButton";

import { useState, useEffect, useRef, useMemo } from "react";
import { Trash2, Reply, AtSign, Plus, X, Sparkles, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Tooltip } from "@/components/Tooltip";

const QUICK_EMOJIS = ["🔥", "🤔", "💡", "💯", "👎"];

interface AuthorProp {
  id?: string;
  username?: string;
  displayName?: string;
  avatar?: string | null;
}

interface ProfileItem {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  isAuthor?: boolean;
}

function renderCommentText(text: string) {
  if (!text) return null;
  const parts = text.split(/(@[\w.-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      return (
        <a
          key={i}
          href={`/u/${encodeURIComponent(username)}`}
          className="font-semibold text-[hsl(var(--accent))] hover:underline inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function CommentSection({
  annotationId,
  author,
}: {
  annotationId: string;
  author?: AuthorProp;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [newText, setNewText] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commentFactChecks, setCommentFactChecks] = useState<Record<string, { loading: boolean; data: any; open: boolean }>>({});

  useEffect(() => {
    if (annotationId && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`annotated_comment_factchecks_${annotationId}`);
        if (cached) {
          setCommentFactChecks(JSON.parse(cached));
        }
      } catch (e) {}
    }
  }, [annotationId]);

  const handleFactCheckComment = async (comment: any) => {
    const existing = commentFactChecks[comment.id];
    if (existing?.open) {
      setCommentFactChecks((prev) => {
        const next = {
          ...prev,
          [comment.id]: { ...prev[comment.id], open: false },
        };
        if (annotationId && typeof window !== "undefined") {
          try {
            localStorage.setItem(`annotated_comment_factchecks_${annotationId}`, JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
      return;
    }

    if (existing?.data) {
      setCommentFactChecks((prev) => {
        const next = {
          ...prev,
          [comment.id]: { ...prev[comment.id], open: true },
        };
        if (annotationId && typeof window !== "undefined") {
          try {
            localStorage.setItem(`annotated_comment_factchecks_${annotationId}`, JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
      return;
    }

    setCommentFactChecks((prev) => ({
      ...prev,
      [comment.id]: { loading: true, data: null, open: true },
    }));

    try {
      // Draw context from thread comments
      const threadContext = comments
        .filter((c) => c.id !== comment.id)
        .slice(-3)
        .map((c) => `${c.user_name || "User"}: "${c.text}"`)
        .join(" | ");

      const res = await fetch("/api/ai/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: comment.text,
          commentary: threadContext ? `Comment thread context: ${threadContext}` : "Comment on annotation",
          sourceUrl: typeof window !== "undefined" ? window.location.href : "",
          sourceTitle: `Discussion thread on Annotated (${author?.displayName || author?.username || "Annotation"})`,
        }),
      });
      const data = await res.json();
      setCommentFactChecks((prev) => {
        const next = {
          ...prev,
          [comment.id]: { loading: false, data, open: true },
        };
        if (annotationId && typeof window !== "undefined") {
          try {
            localStorage.setItem(`annotated_comment_factchecks_${annotationId}`, JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
    } catch (err: any) {
      setCommentFactChecks((prev) => ({
        ...prev,
        [comment.id]: { loading: false, data: { error: err.message }, open: true },
      }));
    }
  };

  // Multi-user reply recipients: array of { id, name, handle }
  const [replyRecipients, setReplyRecipients] = useState<ProfileItem[]>([]);
  const [showAddRecipientDropdown, setShowAddRecipientDropdown] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");

  // In-textarea mention autocomplete state
  const [allProfiles, setAllProfiles] = useState<ProfileItem[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addRecipientInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash && comments.length > 0) {
      const targetId = window.location.hash.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    }
  }, [comments]);

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
    loadProfiles();

    return () => subscription.unsubscribe();
  }, [annotationId]);

  const loadProfiles = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .limit(100);

      const items: ProfileItem[] = (data || []).map((p: any) => {
        const emailHandle = p.email ? p.email.split("@")[0] : "";
        const cleanName = p.full_name || emailHandle || "User";
        const handle = emailHandle || cleanName.replace(/[^a-zA-Z0-9_]/g, "");
        return {
          id: p.id,
          name: cleanName,
          handle: handle,
          avatarUrl: p.avatar_url,
          isAuthor: author?.id ? p.id === author.id : false,
        };
      });

      // Ensure original annotator is included if provided
      if (author && (author.username || author.displayName)) {
        const authorHandle = author.username || author.displayName?.replace(/[^a-zA-Z0-9_]/g, "") || "author";
        const authorName = author.displayName || author.username || "Author";
        const exists = items.some(
          (p) => (author.id && p.id === author.id) || p.handle.toLowerCase() === authorHandle.toLowerCase()
        );
        if (!exists) {
          items.unshift({
            id: author.id || "author",
            name: authorName,
            handle: authorHandle,
            avatarUrl: author.avatar,
            isAuthor: true,
          });
        }
      }

      setAllProfiles(items);
    } catch (_) {}
  };

  const insertEmoji = (emoji: string) => {
    setNewText((prev) => (prev ? `${prev} ${emoji}` : emoji));
  };

  const addRecipient = (profile: ProfileItem) => {
    setReplyRecipients((prev) => {
      if (prev.some((p) => p.handle.toLowerCase() === profile.handle.toLowerCase())) {
        return prev;
      }
      return [...prev, profile];
    });
    setShowAddRecipientDropdown(false);
    setRecipientSearchQuery("");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const removeRecipient = (handle: string) => {
    setReplyRecipients((prev) => prev.filter((p) => p.handle.toLowerCase() !== handle.toLowerCase()));
  };

  const tagAuthor = () => {
    if (!author) return;
    const authorHandle = author.username || author.displayName?.replace(/[^a-zA-Z0-9_]/g, "") || "author";
    const authorName = author.displayName || author.username || "Author";
    addRecipient({
      id: author.id || "author",
      name: authorName,
      handle: authorHandle,
      avatarUrl: author.avatar,
      isAuthor: true,
    });
  };

  const handleReply = (comment: any) => {
    const handle = (comment.user_name || "User").replace(/[^a-zA-Z0-9_]/g, "");
    addRecipient({
      id: comment.user_id || comment.id,
      name: comment.user_name || handle,
      handle: handle,
      avatarUrl: comment.user_avatar,
    });
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  // Detect mention typing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewText(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);

    if (match) {
      const query = match[1];
      const atIndex = textBeforeCursor.lastIndexOf("@");
      setMentionQuery(query);
      setMentionStartIndex(atIndex);
      setSelectedMentionIdx(0);
    } else {
      setMentionQuery(null);
      setMentionStartIndex(-1);
    }
  };

  // Filter mention suggestions for textarea typing
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const matches = allProfiles.filter(
      (p) =>
        p.handle.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
    );
    matches.sort((a, b) => {
      if (a.isAuthor) return -1;
      if (b.isAuthor) return 1;
      return 0;
    });
    return matches.slice(0, 6);
  }, [mentionQuery, allProfiles]);

  const selectMention = (profile: ProfileItem) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return;
    const before = newText.slice(0, mentionStartIndex);
    const after = newText.slice(textareaRef.current.selectionStart);
    const updated = `${before}@${profile.handle} ${after}`;
    setNewText(updated);
    setMentionQuery(null);
    setMentionStartIndex(-1);

    // Also track in replyRecipients if not already there
    if (!replyRecipients.some((r) => r.handle.toLowerCase() === profile.handle.toLowerCase())) {
      setReplyRecipients((prev) => [...prev, profile]);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        const nextPos = mentionStartIndex + profile.handle.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const chosen = mentionSuggestions[selectedMentionIdx];
        if (chosen) {
          selectMention(chosen);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
  };

  // Filter for adding recipient from the "+ Add @user" bar dropdown
  const filteredAddRecipients = useMemo(() => {
    const q = recipientSearchQuery.toLowerCase();
    const existingHandles = new Set(replyRecipients.map((r) => r.handle.toLowerCase()));
    return allProfiles
      .filter(
        (p) =>
          !existingHandles.has(p.handle.toLowerCase()) &&
          (p.handle.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [recipientSearchQuery, allProfiles, replyRecipients]);

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
        const rawComments = data || [];
        const userIds = Array.from(new Set(rawComments.map((c) => c.user_id).filter(Boolean)));

        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .in("id", userIds);
          if (pData) {
            pData.forEach((p) => {
              profilesMap[p.id] = p;
            });
          }
        }

        const enriched = rawComments.map((c) => {
          const p = profilesMap[c.user_id] || {};
          const email = p.email || "";
          const fallbackName = email.split("@")[0] || "User";
          return {
            ...c,
            user_name: p.full_name || fallbackName,
            user_avatar: p.avatar_url,
          };
        });

        setComments(enriched);
      }
    } catch (err: any) {
      console.error("[Comments] Exception:", err);
      setErrorMsg(err.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;

    const previousComments = [...comments];
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[Comments] Delete error:", error);
        setErrorMsg("Failed to delete comment: " + error.message);
        setComments(previousComments);
      }
    } catch (err: any) {
      console.error("[Comments] Delete exception:", err);
      setErrorMsg("Error deleting comment: " + (err.message || "Unknown error"));
      setComments(previousComments);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newText.trim()) return;

    let text = newText.trim();

    // Ensure all replyRecipients are tagged in the text if not already typed
    const missingMentions = replyRecipients
      .map((r) => `@${r.handle}`)
      .filter((tag) => !text.includes(tag));

    if (missingMentions.length > 0) {
      text = `${missingMentions.join(" ")} ${text}`;
    }

    // Snapshot recipients to notify from chips
    const recipientsToNotify = [...replyRecipients];

    // Also parse any @mentions directly typed in text and resolve from allProfiles
    const mentionMatches = text.match(/@([a-zA-Z0-9_.-]+)/g) || [];
    for (const rawTag of mentionMatches) {
      const handle = rawTag.slice(1).toLowerCase();
      const matchedProfile = allProfiles.find(
        (p) => p.handle.toLowerCase() === handle
      );
      if (
        matchedProfile &&
        !recipientsToNotify.some((r) => r.id === matchedProfile.id)
      ) {
        recipientsToNotify.push(matchedProfile);
      }
    }

    setNewText("");
    setReplyRecipients([]);
    setMentionQuery(null);
    setErrorMsg(null);

    const tempId = "temp-" + Date.now();
    const tempComment = {
      id: tempId,
      annotation_id: annotationId,
      user_id: user.id,
      text: text,
      created_at: new Date().toISOString(),
      user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
      user_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    };

    // Optimistic UI update
    setComments((prev) => [...prev, tempComment]);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          annotation_id: annotationId,
          user_id: user.id,
          text: text,
        })
        .select();

      if (error) {
        console.error("[Comments] Insert error:", error);
        setErrorMsg("Failed to post comment: " + error.message);
        setComments((prev) => prev.filter((c) => c.id !== tempId));
      } else if (data && data.length > 0) {
        const savedComment = data[0];
        setComments((prev) =>
          prev.map((c) =>
            c.id === tempId
              ? { ...c, ...savedComment, user_name: tempComment.user_name, user_avatar: tempComment.user_avatar }
              : c
          )
        );

        // ── Fire notifications for all @mentioned recipients ──────────
        // (Allows self-notifications so users can test on their own accounts)
        if (recipientsToNotify.length > 0) {
          const senderName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Someone";

          const notifRows = recipientsToNotify
            .filter((r) => r.id && r.id !== "author")
            .map((r) => ({
              recipient_id: r.id,
              sender_id: user.id,
              annotation_id: annotationId,
              comment_id: savedComment.id,
              message: `${senderName} mentioned you in a comment: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
              read: false,
            }));

          if (notifRows.length > 0) {
            const { error: notifErr } = await supabase.from("notifications").insert(notifRows);
            if (notifErr) {
              console.warn("[Notifications] Insert warning (table may not exist yet):", notifErr);
            }
          }
        }
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
      options: { redirectTo: window.location.href },
    });
  };

  return (
    <div id="comments" className="mt-12 border-t border-[hsl(var(--border))] pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>Discussion & Comments</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--text-muted))]">
              {comments.length}
            </span>
          </h3>
          <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
            Discussing this Annotation · Tag anyone with <code className="text-[hsl(var(--accent))]">@</code>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-100 border border-red-300 text-red-800 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {comments.map((comment) => (
          <div
            key={comment.id}
            id={`comment-${comment.id}`}
            className="bg-[hsl(var(--border))] p-4 rounded-lg shadow-sm transition-all target:ring-2 target:ring-[hsl(var(--accent))]"
          >
            <div className="flex items-center gap-2 mb-2">
              {comment.user_avatar ? (
                <img
                  src={comment.user_avatar}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full border border-[hsl(var(--border))] object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[hsl(var(--accent))] text-white text-xs flex items-center justify-center font-bold">
                  {comment.user_name ? comment.user_name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                {comment.user_name || "Community Member"}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] text-[hsl(var(--text-subtle))]">
                  {(() => {
                    if (!comment.created_at) return "";
                    const d = new Date(comment.created_at);
                    return isNaN(d.getTime()) ? "" : d.toLocaleString();
                  })()}
                </span>
                {user && comment.user_id === user.id && (
                  <Tooltip content="Delete comment" position="top">
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="p-1 text-[hsl(var(--text-muted))] hover:text-red-500 transition-colors cursor-pointer rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
            <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap pl-8">
              {renderCommentText(comment.text)}
            </p>
            <div className="flex items-center justify-between mt-2 pl-8 gap-2">
              <CommentReactionRow commentId={comment.id} />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Tooltip
                  content={
                    commentFactChecks[comment.id]?.open
                      ? "Hide fact check"
                      : "Fact check this comment with Gemini AI"
                  }
                  position="top"
                >
                  <button
                    type="button"
                    onClick={() => handleFactCheckComment(comment)}
                    className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10 transition-colors cursor-pointer"
                  >
                    <span className="text-xs leading-none">⚡</span>
                    <span className="hidden sm:inline">Fact Check</span>
                  </button>
                </Tooltip>
                {user && (
                  <Tooltip content={`Reply to ${comment.author?.name || "comment"}`} position="top">
                    <button
                      type="button"
                      onClick={() => handleReply(comment)}
                      className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors border border-[hsl(var(--border))] cursor-pointer"
                    >
                      <Reply size={13} className="text-[hsl(var(--accent))]" />
                      <span className="hidden sm:inline">Reply</span>
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Comment Fact Check Result Box */}
            {commentFactChecks[comment.id]?.open && (
              <div className="mt-3 ml-8 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-bold text-[hsl(var(--accent))] text-[11px] uppercase tracking-wide">
                    <Sparkles size={12} />
                    <span>Thread Fact Check</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {commentFactChecks[comment.id]?.data?.verdict && (
                      <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        commentFactChecks[comment.id].data.verdict === "VERIFIED"
                          ? "bg-green-500/10 text-green-600 border border-green-500/20"
                          : commentFactChecks[comment.id].data.verdict === "FALSE" || commentFactChecks[comment.id].data.verdict === "MISLEADING"
                          ? "bg-red-500/10 text-red-600 border border-red-500/20"
                          : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                      }`}>
                        {commentFactChecks[comment.id].data.verdict === "VERIFIED" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                        <span>{commentFactChecks[comment.id].data.verdict.replace("_", " ")}</span>
                      </span>
                    )}
                    <Tooltip content="Hide comment fact check" position="top">
                      <button
                        type="button"
                        onClick={() => handleFactCheckComment(comment)}
                        className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] text-xs font-semibold px-1.5 py-0.5 rounded hover:bg-[hsl(var(--border))] transition-colors cursor-pointer"
                      >
                        ✕ Hide
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {commentFactChecks[comment.id]?.loading ? (
                  <div className="py-1.5 text-[hsl(var(--text-muted))] italic flex items-center gap-2">
                    <span className="inline-block animate-spin">⚡</span>
                    <span>Evaluating comment in thread context with Gemini...</span>
                  </div>
                ) : commentFactChecks[comment.id]?.data ? (
                  <>
                    <p className="font-semibold text-[hsl(var(--foreground))] leading-snug">
                      {commentFactChecks[comment.id].data.headline}
                    </p>
                    <p className="text-[hsl(var(--text-muted))] text-[11px] leading-relaxed">
                      {commentFactChecks[comment.id].data.explanation}
                    </p>
                  </>
                ) : null}
              </div>
            )}
          </div>
        ))}

        {comments.length === 0 && !loading && (
          <p className="text-[hsl(var(--text-muted))] italic">
            No comments yet. Be the first to start the discussion!
          </p>
        )}
      </div>

      {user ? (
        <form onSubmit={submitComment} className="mt-6 relative">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--text-subtle))] font-medium">Quick React:</span>
              {QUICK_EMOJIS.map((emoji) => (
                <Tooltip key={emoji} content={`React with ${emoji}`} position="top">
                  <button
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-[hsl(var(--border))]"
                  >
                    {emoji}
                  </button>
                </Tooltip>
              ))}
            </div>

            {/* Simplified Reply button */}
            {author && (author.username || author.displayName) && (
              <Tooltip content="Reply to original author" position="top">
                <button
                  type="button"
                  onClick={tagAuthor}
                  className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors border border-[hsl(var(--border))] cursor-pointer"
                >
                  <Reply size={13} className="text-[hsl(var(--accent))]" />
                  <span className="hidden sm:inline">Reply</span>
                </button>
              </Tooltip>
            )}
          </div>

          {/* Interactive Multi-User "Replying to" Box */}
          {replyRecipients.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap bg-[hsl(var(--secondary))] px-3 py-2 rounded-md mb-2 text-xs border border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--text-muted))] font-medium mr-1">Replying to:</span>

              {replyRecipients.map((recip) => (
                <span
                  key={recip.handle}
                  className="inline-flex items-center gap-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-2 py-0.5 rounded-full font-semibold text-[hsl(var(--foreground))] text-[11px]"
                >
                  <span>@{recip.handle}</span>
                  <Tooltip content={`Remove @${recip.handle}`} position="top">
                    <button
                      type="button"
                      onClick={() => removeRecipient(recip.handle)}
                      className="text-[hsl(var(--text-muted))] hover:text-red-500 font-bold text-xs ml-0.5 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </Tooltip>
                </span>
              ))}

              {/* Add other usernames directly inside this box */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRecipientDropdown((prev) => !prev);
                    setTimeout(() => addRecipientInputRef.current?.focus(), 50);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--accent))] hover:bg-[hsl(var(--background))] border border-dashed border-[hsl(var(--accent))] px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                >
                  <Plus size={11} />
                  <span>Add @user</span>
                </button>

                {showAddRecipientDropdown && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                      <input
                        ref={addRecipientInputRef}
                        type="text"
                        value={recipientSearchQuery}
                        onChange={(e) => setRecipientSearchQuery(e.target.value)}
                        placeholder="Search user to add..."
                        className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2 py-1 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--accent))]"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {filteredAddRecipients.length === 0 ? (
                        <div className="p-2.5 text-center text-xs text-[hsl(var(--text-muted))] italic">
                          No users found
                        </div>
                      ) : (
                        filteredAddRecipients.map((item) => (
                          <button
                            key={item.id + item.handle}
                            type="button"
                            onClick={() => addRecipient(item)}
                            className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
                          >
                            {item.avatarUrl ? (
                              <img
                                src={item.avatarUrl}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-[hsl(var(--accent))] text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold truncate block">{item.name}</span>
                              <span className="text-[10px] text-[hsl(var(--text-muted))] truncate block">
                                @{item.handle}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear all recipients button */}
              <Tooltip content="Cancel reply" position="top">
                <button
                  type="button"
                  onClick={() => setReplyRecipients([])}
                  className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] text-xs font-bold cursor-pointer ml-auto pl-2"
                >
                  ✕
                </button>
              </Tooltip>
            </div>
          )}

          {/* Textarea mention autocomplete popup */}
          {mentionSuggestions.length > 0 && (
            <div className="absolute left-0 bottom-full mb-2 w-full sm:w-80 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--text-muted))] flex items-center justify-between">
                <span>Matching Users</span>
                <span className="text-[9px]">↑↓ to navigate · Enter to select</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {mentionSuggestions.map((item, idx) => (
                  <button
                    key={item.id + item.handle}
                    type="button"
                    onClick={() => selectMention(item)}
                    onMouseEnter={() => setSelectedMentionIdx(idx)}
                    className={`w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer ${
                      idx === selectedMentionIdx
                        ? "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                        : "hover:bg-[hsl(var(--secondary))]"
                    }`}
                  >
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[hsl(var(--accent))] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate">{item.name}</span>
                        {item.isAuthor && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/40">
                            Author
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[hsl(var(--text-muted))] truncate block">
                        @{item.handle}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={
                replyRecipients.length > 0
                  ? `Replying to ${replyRecipients.map((r) => "@" + r.handle).join(", ")}... Type @ to tag more`
                  : "Add your thoughts... Type @ to tag people"
              }
              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[6px] p-3 text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--accent))] resize-y min-h-[100px]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-[11px] text-[hsl(var(--text-subtle))] flex items-center gap-1">
              <AtSign size={12} />
              <span>Type @ to mention any user</span>
            </span>

            <div className="flex items-center gap-3">
              <SpeechToTextButton
                currentValue={newText}
                onTranscript={(transcription) => setNewText(transcription)}
                showLabel={true}
                label="Talk"
                size="md"
              />
              <button
                type="submit"
                disabled={!newText.trim()}
                className="px-4 py-2 rounded-[6px] text-sm font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer"
              >
                Post Comment
              </button>
            </div>
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
