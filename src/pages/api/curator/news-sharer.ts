import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabaseClient';

// Placeholder for a real search API call
async function findLatestArticle(interest: string): Promise<{ title: string; url: string } | null> {
  console.log(`Searching for articles about: ${interest}`);
  // In a real implementation, you would use a news/search API here.
  // For example, using the 'google-search-results-nodejs' package or a dedicated News API.
  
  // Returning a mock result for simulation purposes.
  return {
    title: `The Future of ${interest}: A 2025 Perspective`,
    url: `https://example.com/news/${interest}-2025`
  };
}

// This is a placeholder for the actual Gemini API call
async function summarizeAndPrompt(articleTitle: string, articleUrl: string, context: string): Promise<string> {
  console.log(`Summarizing article for context: ${context}`);
  const response = `**Interesting article on ${context}!**\n\n*${articleTitle}*\n\nI found this piece on the web. It seems to suggest... (AI-generated summary would go here). What does everyone think about this? Does it align with your experiences?\n\nRead more: ${articleUrl}`;
  return response;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Secure the endpoint
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecret = req.headers['x-vercel-cron-secret'];

  if (!cronSecret || vercelCronSecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const aiUserId = '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';

  try {
    // 1. Get all unique interests from chatrooms
    const { data: interestsData, error: interestsError } = await supabase
      .from('chatrooms')
      .select('interest');

    if (interestsError) throw new Error(interestsError.message);

    const uniqueInterests = [...new Set(interestsData?.map(i => i.interest).filter(Boolean))];

    console.log(`Found ${uniqueInterests.length} unique interests to search for.`);

    // 2. For each interest, find an article and post it to relevant rooms
    for (const interest of uniqueInterests) {
      // 2a. Find a relevant news article
      const topResult = await findLatestArticle(interest);

      if (!topResult) {
        console.log(`No articles found for interest: ${interest}`);
        continue;
      }

      // 2b. Generate the summary and prompt
      const messageContent = await summarizeAndPrompt(topResult.title, topResult.url, interest);

      // 2c. Find all chatrooms with this interest
      const { data: roomsToPost, error: roomsError } = await supabase
        .from('chatrooms')
        .select('id')
        .eq('interest', interest);

      if (roomsError) throw roomsError;

      // 2d. Insert the message into all relevant chatrooms
      const messagesToInsert = roomsToPost.map(room => ({
        chatroom_id: room.id,
        user_id: aiUserId,
        content: messageContent,
        is_ai_curator: true,
      }));

      if (messagesToInsert.length > 0) {
        await supabase.from('messages').insert(messagesToInsert);
        console.log(`Posted article about ${interest} to ${roomsToPost.length} rooms.`);
      }
    }

    res.status(200).json({ message: `News sharing cycle complete.` });

  } catch (error: any) {
    console.error('Error in news-sharer handler:', error);
    res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
