-- Step 1: Add a unique constraint to the participants table to prevent duplicate entries.
-- This ensures a user can only be in a chatroom once.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'participants_user_id_chatroom_id_key'
    ) THEN
        ALTER TABLE public.participants
        ADD CONSTRAINT participants_user_id_chatroom_id_key UNIQUE (user_id, chatroom_id);
    END IF;
END
$$ LANGUAGE plpgsql;

-- Step 2: Create the function that will handle the logic.
CREATE OR REPLACE FUNCTION public.assign_chatrooms_on_interest_update()
RETURNS TRIGGER AS $$
DECLARE
    interest_tag TEXT;
    v_chatroom_id UUID;
BEGIN
    INSERT INTO public.function_logs (message, interest_tag, chatroom_id)
    VALUES ('Trigger operation type', TG_OP, NULL); -- Log TG_OP

            -- Proceed if the operation is an INSERT, or an UPDATE where the interest_tags column has changed.
            IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.interest_tags IS DISTINCT FROM OLD.interest_tags) THEN        
        -- Loop through each tag in the new interest_tags array.
        FOREACH interest_tag IN ARRAY NEW.interest_tags
        LOOP
            INSERT INTO public.function_logs (message, interest_tag, chatroom_id)
            VALUES ('Processing interest_tag', interest_tag, NULL); -- Log processing start

            -- Find the chatroom ID for the current interest tag.
            SELECT id INTO v_chatroom_id FROM public.chatrooms WHERE interest = interest_tag;

            INSERT INTO public.function_logs (message, interest_tag, chatroom_id)
            VALUES ('Found chatroom_id', interest_tag, v_chatroom_id); -- Log result

            -- If a matching chatroom is found, insert the user into the participants table.
            -- ON CONFLICT DO NOTHING prevents errors if the user is already a participant.
            IF v_chatroom_id IS NOT NULL THEN
                INSERT INTO public.participants (user_id, chatroom_id)
                VALUES (NEW.id, v_chatroom_id)
                ON CONFLICT (user_id, chatroom_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger that executes the function after an update on the profiles table.
DROP TRIGGER IF EXISTS on_profile_interest_update ON public.profiles;

CREATE TRIGGER on_profile_interest_update
AFTER INSERT OR UPDATE OF interest_tags ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_chatrooms_on_interest_update();
