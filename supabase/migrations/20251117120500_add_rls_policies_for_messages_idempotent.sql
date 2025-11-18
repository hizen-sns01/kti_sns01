-- Add or update INSERT, UPDATE, DELETE policies for the messages table

-- 1. Allow users to insert their own messages
DROP POLICY IF EXISTS "Allow users to insert their own messages" ON public.messages;
CREATE POLICY "Allow users to insert their own messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. Allow users to update their own messages
DROP POLICY IF EXISTS "Allow users to update their own messages" ON public.messages;
CREATE POLICY "Allow users to update their own messages" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to delete their own messages
DROP POLICY IF EXISTS "Allow users to delete their own messages" ON public.messages;
CREATE POLICY "Allow users to delete their own messages" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
