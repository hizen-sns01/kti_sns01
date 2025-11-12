-- Step 1: Add the new column to the messages table for replies
ALTER TABLE public.messages
ADD COLUMN replying_to_message_id BIGINT;

-- Step 2: Add the self-referencing foreign key constraint
ALTER TABLE public.messages
ADD CONSTRAINT fk_replying_to_message
FOREIGN KEY (replying_to_message_id)
REFERENCES public.messages(id)
ON DELETE SET NULL; -- If the parent message is deleted, just nullify the reply link

-- Step 3: Drop the now obsolete message_comments table and its related objects.
-- The foreign key from message_comments to profiles must be dropped first.
ALTER TABLE public.message_comments DROP CONSTRAINT IF EXISTS fk_user_id;
DROP TABLE IF EXISTS public.message_comments;
