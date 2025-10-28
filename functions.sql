create or replace function get_user_chatrooms()
returns table (id uuid, name text, description text, last_message text, unread_count integer) as $$
begin
  return query
  select
    c.id,
    c.name,
    c.description,
    (select content from messages where chatroom_id = c.id order by created_at desc limit 1) as last_message,
    (select count(*) from messages where chatroom_id = c.id and created_at > (select last_read_at from participants where chatroom_id = c.id and user_id = auth.uid()))::integer as unread_count
  from
    chatrooms c
  join
    participants p on c.id = p.chatroom_id
  where
    p.user_id = auth.uid();
end; 
$$ language plpgsql;

-- To track last read messages, we need to add a last_read_at column to the participants table.
-- We also need a function to update this timestamp.

alter table participants add column last_read_at timestamp with time zone;

create or replace function update_last_read_at(chatroom_id_param uuid)
returns void as $$
begin
  update participants
  set last_read_at = now()
  where chatroom_id = chatroom_id_param and user_id = auth.uid();
end;
$$ language plpgsql;
