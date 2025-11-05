CREATE TABLE public.chatroom_ad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chatroom_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'RA'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chatroom_ad_pkey PRIMARY KEY (id),
    CONSTRAINT chatroom_ad_chatroom_id_user_id_key UNIQUE (chatroom_id, user_id)
);
ALTER TABLE public.chatroom_ad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.chatroom_ad FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.chatroom_ad FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for room admins" ON public.chatroom_ad FOR UPDATE USING (auth.uid() = user_id AND role = 'RA') WITH CHECK (auth.uid() = user_id AND role = 'RA');
CREATE POLICY "Enable delete for room admins" ON public.chatroom_ad FOR DELETE USING (auth.uid() = user_id AND role = 'RA');

ALTER TABLE public.chatroom_ad ADD CONSTRAINT chatroom_ad_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE CASCADE;
ALTER TABLE public.chatroom_ad ADD CONSTRAINT chatroom_ad_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Set up trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.chatroom_ad
FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');