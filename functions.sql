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
