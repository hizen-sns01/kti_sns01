CREATE OR REPLACE FUNCTION public.soft_delete_message(p_message_id bigint)
RETURNS void AS $$
BEGIN
    UPDATE public.messages
    SET is_deleted = true, content = '삭제된 메시지입니다.'
    WHERE id = p_message_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.toggle_like_message(p_message_id bigint)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_like_exists boolean;
BEGIN
  -- Check if the user has already liked the message
  SELECT EXISTS (
    SELECT 1
    FROM public.message_likes
    WHERE message_id = p_message_id AND user_id = v_user_id
  ) INTO v_like_exists;

  IF v_like_exists THEN
    -- User has liked the message, so unlike it
    DELETE FROM public.message_likes
    WHERE message_id = p_message_id AND user_id = v_user_id;

    UPDATE public.messages
    SET like_count = like_count - 1
    WHERE id = p_message_id;
  ELSE
    -- User has not liked the message, so like it
    INSERT INTO public.message_likes (message_id, user_id)
    VALUES (p_message_id, v_user_id);

    UPDATE public.messages
    SET like_count = like_count + 1
    WHERE id = p_message_id;
  END IF;
END;
$$ LANGUAGE plpgsql;