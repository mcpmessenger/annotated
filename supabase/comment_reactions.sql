-- Create Comment Reactions Table in public schema
CREATE TABLE IF NOT EXISTS public.comment_reactions (
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '🤔', '💡', '💯', '👎')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Comment reactions are visible to everyone" 
ON public.comment_reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comment reactions" 
ON public.comment_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment reactions" 
ON public.comment_reactions FOR DELETE USING (auth.uid() = user_id);

-- Grants
GRANT ALL ON TABLE public.comment_reactions TO anon, authenticated, service_role;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
