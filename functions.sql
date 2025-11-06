-- This function updates the user's profile information.
CREATE OR REPLACE FUNCTION public.update_my_profile(
    nickname_new TEXT,
    tags_new TEXT[],
    symptoms_new TEXT,
    height_new NUMERIC,
    weight_new NUMERIC,
    age_group_new TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    nickname = nickname_new,
    interest_tags = tags_new,
    status_symptoms = symptoms_new,
    height = height_new,
    weight = weight_new,
    age_group = age_group_new,
    updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This function adds a new text-based prescription for the user.
CREATE OR REPLACE FUNCTION public.add_prescription_text(content_new TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.prescriptions(user_id, content)
  VALUES (auth.uid(), content_new);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This function updates only the user's nickname.
CREATE OR REPLACE FUNCTION public.update_nickname(nickname_new TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    nickname = nickname_new,
    updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;