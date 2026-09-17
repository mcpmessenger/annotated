-- 1. Create Comments Table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are visible to everyone"
ON comments FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments"
ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE USING (auth.uid() = user_id);


-- 2. Create Reactions Table
CREATE TABLE annotation_reactions (
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '🤔', '💡', '💯', '👎')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (annotation_id, user_id, emoji) -- A user can only leave one of each specific emoji per annotation
);

-- Turn on RLS for reactions
ALTER TABLE annotation_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are visible to everyone"
ON annotation_reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reactions"
ON annotation_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON annotation_reactions FOR DELETE USING (auth.uid() = user_id);


-- 3. Enforce Emoji constraint on annotations intent
ALTER TABLE annotations DROP CONSTRAINT IF EXISTS annotations_intent_check;
ALTER TABLE annotations ADD CONSTRAINT annotations_intent_check CHECK (intent IN ('🔥', '🤔', '💡', '💯', '👎') OR intent IS NULL);
