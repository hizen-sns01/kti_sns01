import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Placeholder for a real search API call
async function findLatestArticle(interest: string): Promise<{ title: string; url: string } | null> {
  console.log(`Searching for articles about: ${interest}`);
  // Mock result for simulation
  return {
    title: `The Future of ${interest}: A 2025 Perspective`,
    url: `https://example.com/news/${interest}-2025`
  };
}

// Placeholder for the actual Gemini API call
async function summarizeAndPrompt(articleTitle: string, articleUrl: string, context: string): Promise<string> {
  console.log(`Summarizing article for context: ${context}`);
  const response = `**Interesting article on ${context}!**\n\n*${articleTitle}*\n\nI found this piece on the web. It seems to suggest... (AI-generated summary would go here). What does everyone think about this? Does it align with your experiences?\n\nRead more: ${articleUrl}`;
  return response;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    );

    const aiUserId = '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';

    const { data: interestsData, error: interestsError } = await supabaseClient
      .from('chatrooms')
      .select('interest');

    if (interestsError) throw new Error(interestsError.message);

    const uniqueInterests = [...new Set(interestsData?.map(i => i.interest).filter(Boolean))];

    console.log(`Found ${uniqueInterests.length} unique interests to search for.`);

    for (const interest of uniqueInterests) {
      const topResult = await findLatestArticle(interest);

      if (!topResult) {
        console.log(`No articles found for interest: ${interest}`);
        continue;
      }

      const messageContent = await summarizeAndPrompt(topResult.title, topResult.url, interest);

      const { data: roomsToPost, error: roomsError } = await supabaseClient
        .from('chatrooms')
        .select('id')
        .eq('interest', interest);

      if (roomsError) throw roomsError;

      const messagesToInsert = roomsToPost.map(room => ({
        chatroom_id: room.id,
        user_id: aiUserId,
        content: messageContent,
        is_ai_curator: true,
      }));

      if (messagesToInsert.length > 0) {
        await supabaseClient.from('messages').insert(messagesToInsert);
        console.log(`Posted article about ${interest} to ${roomsToPost.length} rooms.`);
      }
    }

    return new Response(JSON.stringify({ message: `News sharing cycle complete.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) { 
    console.error('Error in news-sharer handler:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
