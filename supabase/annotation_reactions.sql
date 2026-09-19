-- Create Annotation Reactions Table in public schema
CREATE TABLE IF NOT EXISTS public.annotation_reactions (
    annotation_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN (E'\U0001F525', E'\U0001F914', E'\U0001F4A1', E'\U0001F4AF', E'\U0001F44E')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (annotation_id, user_id, emoji)
);

ALTER TABLE public.annotation_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Annotation reactions visible to everyone" 
ON public.annotation_reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert own annotation reactions" 
ON public.annotation_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotation reactions" 
ON public.annotation_reactions FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.annotation_reactions TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
