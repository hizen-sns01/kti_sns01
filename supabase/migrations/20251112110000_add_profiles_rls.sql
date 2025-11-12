-- RLS Policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
