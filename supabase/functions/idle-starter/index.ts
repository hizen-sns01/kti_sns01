import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// This is a placeholder for the actual Gemini API call
async function getIdleTopic(context: string): Promise<string> {
  console.log(`Generating idle topic for context: ${context}`);
  // In a real implementation, you would call the Gemini API here.
  const response = `Speaking of ${context}, what's everyone's favorite project they've worked on? Or, what's a recent challenge you've faced? Let's get the conversation going!`;
  return response;
}

Deno.serve(async (req) => {
  // This is needed if you're invoking the function via a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the appropriate credentials
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    );

    const aiUserId = '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';
    const IDLE_THRESHOLD_MINUTES = 60; // Set to 1 hour

    // 1. Find all chatrooms that have been idle for more than the threshold
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() - IDLE_THRESHOLD_MINUTES);

    const { data: idleChatrooms, error: chatroomsError } = await supabaseClient
      .from('chatrooms')
      .select('id, interest')
      .lt('last_message_at', threshold.toISOString());

    if (chatroomsError) {
      throw new Error(`Failed to fetch idle chatrooms: ${chatroomsError.message}`);
    }

    if (!idleChatrooms || idleChatrooms.length === 0) {
      console.log('No idle chatrooms to process.');
      return new Response(JSON.stringify({ message: 'No idle chatrooms to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${idleChatrooms.length} idle chatrooms.`);

    // 2. For each idle chatroom, generate a topic and insert a message
    const promises = idleChatrooms.map(async (room) => {
      const topicContext = room.interest || 'general discussion';
      
      const newTopic = await getIdleTopic(topicContext);

      const { error: insertError } = await supabaseClient.from('messages').insert({
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

    return new Response(JSON.stringify({ message: `Processed ${idleChatrooms.length} idle chatrooms.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in idle-starter handler:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
