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

    // 2. Find chatrooms that match user interests
    const { data: chatrooms, error: chatroomsError } = await supabase
      .from('chatrooms')
      .select('id, interest')
      .in('interest', userInterests);

    if (chatroomsError) {
      throw new Error('Failed to fetch chatrooms.');
    }

    if (!chatrooms || chatrooms.length === 0) {
      return res.status(200).json({ message: 'No chatrooms found for the user interests.' });
    }

    // 3. Add user to the participants table for each matched chatroom
    const participantRecords = chatrooms.map(chatroom => ({
      chatroom_id: chatroom.id,
      user_id: user.id,
    }));

    const { error: insertError } = await supabase
      .from('participants')
      .insert(participantRecords, { onConflict: 'chatroom_id, user_id' });

    if (insertError) {
      throw new Error('Failed to add user to chatrooms.');
    }

    res.status(200).json({ message: 'User successfully assigned to chatrooms.' });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export default onLogin;
