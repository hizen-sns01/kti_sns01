import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// It's better to use environment variables for Supabase URL and key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const onLogin = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { user } = req.body;

  if (!user) {
    return res.status(400).json({ error: 'User not provided' });
  }

  try {
    // 1. Get user interests from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('interests')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // If profile doesn't exist, it's not an error in this context, just means onboarding is not complete.
      if (profileError.code === 'PGRST116') {
        return res.status(200).json({ message: 'Profile not yet created.' });
      }
      throw profileError;
    }

    const userInterests: string[] = profile?.interests || [];

    if (userInterests.length === 0) {
      return res.status(200).json({ message: 'User has no interests.' });
    }

    // 2. For each interest, find or create a chatroom
    for (const interest of userInterests) {
      let { data: chatroom } = await supabase
        .from('chatrooms')
        .select('id')
        .eq('interest', interest)
        .single();

      // If chatroom doesn't exist, create it
      if (!chatroom) {
        const { data: newChatroom, error: createError } = await supabase
          .from('chatrooms')
          .insert({ name: interest, description: `A chatroom for ${interest}`, interest: interest })
          .select('id')
          .single();
        
        if (createError) throw createError;
        chatroom = newChatroom;
      }

      // 3. Add user to the participants table
      if (chatroom) {
        await supabase
          .from('participants')
          .insert({ chatroom_id: chatroom.id, user_id: user.id }, { onConflict: 'chatroom_id, user_id' });
      }
    }

    res.status(200).json({ message: 'User successfully assigned to chatrooms.' });

  } catch (error: any) {
    console.error('Error in on-login webhook:', error);
    res.status(500).json({ error: error.message });
  }
};

export default onLogin;
