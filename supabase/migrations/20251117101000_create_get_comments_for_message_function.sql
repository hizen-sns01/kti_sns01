create or replace function get_comments_for_message(root_id bigint)
returns table (
  id bigint,
  created_at timestamptz,
  content text,
  user_id uuid,
  nickname text,
  replying_to_message_id bigint,
  is_deleted boolean,
  path bigint[]
) as $$
begin
  return query
  with recursive message_tree as (
    -- Non-recursive term: top-level comments
    select
      m.id,
      m.created_at,
      m.content,
      m.user_id,
      p.nickname,
      m.replying_to_message_id,
      m.is_deleted,
      array[m.id] as path
    from
      messages m
      left join profiles p on m.user_id = p.id
    where
      m.replying_to_message_id = root_id

    union all

    -- Recursive term: replies to comments
    select
      m.id,
      m.created_at,
      m.content,
      m.user_id,
      p.nickname,
      m.replying_to_message_id,
      m.is_deleted,
      mt.path || m.id
    from
      messages m
      left join profiles p on m.user_id = p.id
      join message_tree mt on m.replying_to_message_id = mt.id
  )
  select * from message_tree order by path;
end;
$$ language plpgsql;
