import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadImage = async (file: File, userId: string) => {
  const filePath = `public/${userId}/${Date.now()}_${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from('chat_images')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('chat_images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
