CREATE TABLE public.function_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    message TEXT,
    interest_tag TEXT,
    chatroom_id UUID
);

ALTER TABLE public.function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.function_logs
FOR SELECT USING (true);
