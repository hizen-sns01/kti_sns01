import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabaseClient';

// This is a placeholder for the actual Gemini API call
async function getIdleTopic(context: string): Promise<string> {
  console.log(`Generating idle topic for context: ${context}`);
  // The prompt strategy from the PRD would be applied here.
  const response = `Speaking of ${context}, what's everyone's favorite project they've worked on? Or, what's a recent challenge you've faced? Let's get the conversation going!`;
  return response;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Secure the endpoint with Vercel's recommended cron secret check
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecret = req.headers['x-vercel-cron-secret'];

  if (!cronSecret || vercelCronSecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const aiUserId = '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';
  const IDLE_THRESHOLD_MINUTES = 1440; // 24 hours

  try {
    // 1. Find all chatrooms that have been idle for more than the threshold
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() - IDLE_THRESHOLD_MINUTES);

    const { data: idleChatrooms, error: chatroomsError } = await supabase
      .from('chatrooms')
      .select('id, interest')
      .lt('last_message_at', threshold.toISOString());

    if (chatroomsError) {
      throw new Error(`Failed to fetch idle chatrooms: ${chatroomsError.message}`);
    }

    if (!idleChatrooms || idleChatrooms.length === 0) {
      return res.status(200).json({ message: 'No idle chatrooms to process.' });
    }

    console.log(`Found ${idleChatrooms.length} idle chatrooms.`);

    // 2. For each idle chatroom, generate a topic and insert a message
    const promises = idleChatrooms.map(async (room) => {
      const topicContext = room.interest || 'general discussion';
      
      // Using a placeholder for Gemini response
      const newTopic = await getIdleTopic(topicContext);

      const { error: insertError } = await supabase.from('messages').insert({
        chatroom_id: room.id,
        user_id: aiUserId,
        content: newTopic,
        is_ai_curator: true,
      });

      if (insertError) {
        console.error(`Failed to insert message for room ${room.id}:`, insertError);
      }
    });

    await Promise.all(promises);

    res.status(200).json({ message: `Processed ${idleChatrooms.length} idle chatrooms.` });

  } catch (error: any) {
    console.error('Error in idle-starter handler:', error);
    res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
