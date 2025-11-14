-- RLS Policies for Interactions

-- Enable RLS and define policies for message_likes
ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.message_likes;
CREATE POLICY "Allow read access to all authenticated users" ON public.message_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own likes" ON public.message_likes;
CREATE POLICY "Allow users to insert their own likes" ON public.message_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own likes" ON public.message_likes;
CREATE POLICY "Allow users to delete their own likes" ON public.message_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable RLS and define policies for message_dislikes
ALTER TABLE public.message_dislikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.message_dislikes;
CREATE POLICY "Allow read access to all authenticated users" ON public.message_dislikes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own dislikes" ON public.message_dislikes;
CREATE POLICY "Allow users to insert their own dislikes" ON public.message_dislikes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own dislikes" ON public.message_dislikes;
CREATE POLICY "Allow users to delete their own dislikes" ON public.message_dislikes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable RLS and define policies for message_comments
ALTER TABLE public.message_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.message_comments;
CREATE POLICY "Allow read access to all authenticated users" ON public.message_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own comments" ON public.message_comments;
CREATE POLICY "Allow users to insert their own comments" ON public.message_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.message_comments;
CREATE POLICY "Allow users to delete their own comments" ON public.message_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable RLS and define policies for chatroom_ad
ALTER TABLE public.chatroom_ad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.chatroom_ad;
CREATE POLICY "Allow read access to all authenticated users" ON public.chatroom_ad
  FOR SELECT TO authenticated USING (true);

-- Enable RLS and define policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.messages;
CREATE POLICY "Allow read access to all authenticated users" ON public.messages
  FOR SELECT TO authenticated USING (true);
