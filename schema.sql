CREATE TABLE IF NOT EXISTS public.chatroom_ad (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chatroom_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'RA'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chatroom_ad_pkey PRIMARY KEY (id),
  CONSTRAINT chatroom_ad_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id),
  CONSTRAINT chatroom_ad_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE IF NOT EXISTS public.chatrooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  interest text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_message_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  idle_threshold_minutes integer,
  news_share_interval_minutes integer,
  last_news_share_at timestamp with time zone,
  persona text,
  is_activate boolean,
  enable_article_summary boolean DEFAULT false,
  CONSTRAINT chatrooms_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.feeds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chatroom_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT feeds_pkey PRIMARY KEY (id),
  CONSTRAINT feeds_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id)
);
CREATE TABLE IF NOT EXISTS public.message_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id bigint,
  user_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_comments_pkey PRIMARY KEY (id),
  CONSTRAINT message_comments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id),
  CONSTRAINT message_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.message_dislikes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id bigint,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_dislikes_pkey PRIMARY KEY (id),
  CONSTRAINT message_dislikes_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id),
  CONSTRAINT message_dislikes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.message_likes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  message_id bigint NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT message_likes_pkey PRIMARY KEY (id),
  CONSTRAINT message_likes_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id),
  CONSTRAINT message_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  chatroom_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_ai_curator boolean NOT NULL DEFAULT false,
  curator_message_type text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE IF NOT EXISTS public.participants (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  chatroom_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_read_at timestamp with time zone,
  CONSTRAINT participants_pkey PRIMARY KEY (id),
  CONSTRAINT participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feeds(id),
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.post_dislikes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_dislikes_pkey PRIMARY KEY (id),
  CONSTRAINT post_dislikes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feeds(id),
  CONSTRAINT post_dislikes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feeds(id),
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  content text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prescriptions_pkey PRIMARY KEY (id),
  CONSTRAINT prescriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text UNIQUE,
  email text,
  is_ai_curator boolean DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  interest_tags TEXT[],
  status_symptoms TEXT,
  height NUMERIC,
  weight NUMERIC,
  age_group TEXT
);
CREATE TABLE IF NOT EXISTS public.user_activity_metrics (
  user_id uuid NOT NULL,
  total_activity_time_minutes bigint DEFAULT 0,
  total_messages integer DEFAULT 0,
  total_reactions_received integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  rooms_created integer DEFAULT 0,
  participants_in_rooms integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activity_metrics_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_activity_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.popular_topics (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  topic TEXT NOT NULL,
  summary TEXT,
  sources TEXT[],
  type VARCHAR(10) NOT NULL, -- 'daily' or 'weekly'
  score FLOAT8,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS for popular_topics (allow public read-only access)
ALTER TABLE public.popular_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read popular topics" ON public.popular_topics;
CREATE POLICY "Public can read popular topics" ON public.popular_topics FOR SELECT TO authenticated, anon USING (true);