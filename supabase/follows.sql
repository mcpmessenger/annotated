-- 1. Create Follows Table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);

-- 3. Row Level Security
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see who follows whom (public social graph)
CREATE POLICY "Public read follows"
  ON public.follows FOR SELECT
  USING (true);

-- Authenticated users can follow others
CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);
