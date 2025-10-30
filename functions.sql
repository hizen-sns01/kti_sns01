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
RETURNS TABLE (id uuid, name text, description text, interest text, created_at timestamptz, participant_count bigint, is_member boolean, last_message text, unread_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.interest,
    c.created_at,
    (SELECT count(*) FROM public.participants p WHERE p.chatroom_id = c.id) as participant_count,
    EXISTS(SELECT 1 FROM public.participants p WHERE p.chatroom_id = c.id AND p.user_id = auth.uid()) as is_member,
    (SELECT content FROM public.messages m WHERE m.chatroom_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
    (SELECT count(*) FROM public.messages m WHERE m.chatroom_id = c.id AND m.created_at > (SELECT p.last_read_at FROM public.participants p WHERE p.chatroom_id = c.id AND p.user_id = auth.uid())) as unread_count
  FROM
    public.chatrooms c;
END;
$$ LANGUAGE plpgsql;
