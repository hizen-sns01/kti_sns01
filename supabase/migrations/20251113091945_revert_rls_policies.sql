-- RLS Policies for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop all possible old policies to ensure a clean slate
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Allow users to insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to read messages in their chatrooms" ON public.messages; -- Add this line to drop the conflicting policy

-- Revert to secure SELECT policy
CREATE POLICY "Allow users to read messages in their chatrooms" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1 FROM participants WHERE chatroom_id = messages.chatroom_id AND user_id = auth.uid() ));

-- Revert to secure INSERT policy
CREATE POLICY "Allow users to insert their own messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);