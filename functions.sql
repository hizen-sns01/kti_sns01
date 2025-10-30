DROP FUNCTION IF EXISTS public.get_user_chatrooms();
CREATE OR REPLACE FUNCTION public.get_user_chatrooms()
RETURNS TABLE (id uuid, name text, description text, last_message text, unread_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    (SELECT content FROM public.messages WHERE chatroom_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
    (SELECT count(*) FROM public.messages WHERE chatroom_id = c.id AND created_at > (SELECT last_read_at FROM public.participants WHERE chatroom_id = c.id AND user_id = auth.uid()))
  FROM
    public.chatrooms c
  JOIN
    public.participants p ON c.id = p.chatroom_id
  WHERE
    p.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.update_last_read_at(uuid);
CREATE OR REPLACE FUNCTION public.update_last_read_at(chatroom_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.participants
  SET last_read_at = now()
  WHERE chatroom_id = chatroom_id_param AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Function to get all chatrooms with participant count and user membership
DROP FUNCTION IF EXISTS public.get_all_chatrooms_with_details();
CREATE OR REPLACE FUNCTION public.get_all_chatrooms_with_details()
RETURNS TABLE (id uuid, name text, description text, interest text, created_at timestamptz, participant_count bigint, is_member boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.interest,
    c.created_at,
    (SELECT count(*) FROM public.participants p WHERE p.chatroom_id = c.id) as participant_count,
    EXISTS(SELECT 1 FROM public.participants p WHERE p.chatroom_id = c.id AND p.user_id = auth.uid()) as is_member
  FROM
    public.chatrooms c;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- AI Curator Functions (Added based on PRD)
-- =================================================================

-- This script is idempotent and can be run multiple times.

-- 1. Add is_ai_curator column to messages table
-- Identifies if a message is from the AI curator. Defaults to false.
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_ai_curator boolean NOT NULL DEFAULT false;

-- 2. Add last_message_at column to chatrooms table
-- Records the timestamp of the last message in a chatroom for detecting idle state.
ALTER TABLE public.chatrooms
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

-- 3. Create a function and trigger to automatically update last_message_at

-- Create the function first
CREATE OR REPLACE FUNCTION public.update_chatroom_last_message_at()
RETURNS trigger AS $$
BEGIN
  UPDATE public.chatrooms
  SET last_message_at = timezone('utc'::text, now())
  WHERE id = NEW.chatroom_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Then, create the trigger to execute the function after each new message is inserted.
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_chatroom_last_message_at();