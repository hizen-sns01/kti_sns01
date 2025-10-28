import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabaseClient';

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

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile or profile does not exist.');
    }

    const userInterests: string[] = profile.interests || [];

    if (userInterests.length === 0) {
      return res.status(200).json({ message: 'User has no interests to assign chatrooms.' });
    }

    for (const interest of userInterests) {
      // 2. Find chatroom that matches user interest
      let { data: chatroom, error: chatroomError } = await supabase
        .from('chatrooms')
        .select('id')
        .eq('interest', interest)
        .single();

      if (chatroomError && chatroomError.code !== 'PGRST116') { // PGRST116: no rows found
        throw new Error(`Failed to fetch chatroom for interest: ${interest}`);
      }

      // 3. If chatroom does not exist, create it
      if (!chatroom) {
        const { data: newChatroom, error: createError } = await supabase
          .from('chatrooms')
          .insert({ name: interest, description: `A chatroom for ${interest}`, interest: interest })
          .select('id')
          .single();
        
        if (createError || !newChatroom) {
          throw new Error(`Failed to create chatroom for interest: ${interest}`);
        }
        chatroom = newChatroom;
      }

      // 4. Add user to the participants table for the chatroom
      const { error: insertError } = await supabase
        .from('participants')
        .insert({ chatroom_id: chatroom.id, user_id: user.id }, { onConflict: 'chatroom_id, user_id' });

      if (insertError) {
        console.error(`Failed to add user to chatroom for interest ${interest}:`, insertError.message);
        // Decide if you want to throw an error and stop the whole process or just log it and continue
      }
    }

    res.status(200).json({ message: 'User successfully assigned to chatrooms.' });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export default onLogin;
