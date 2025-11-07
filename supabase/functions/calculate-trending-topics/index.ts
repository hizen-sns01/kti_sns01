import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// --- Pre-defined dictionary for simplified NER ---
// In a real-world scenario, this would be replaced by a call to a proper NER model API.
const KEYWORD_DICTIONARY = [
  '비타민 C', '오메가3', '마그네슘', '코엔자임 Q10', '루테인', '프로바이오틱스',
  '당뇨', '고혈압', '콜레스테롤', '불면증', '두통', '역류성 식도염',
  '저탄고지', '간헐적 단식', '공복 유산소', 'BCAA',
];

// --- Simplified Entity Extraction ---
function extractNamedEntities(text: string): string[] {
  const foundEntities = new Set<string>();
  const lowerCaseText = text.toLowerCase();

  for (const entity of KEYWORD_DICTIONARY) {
    if (lowerCaseText.includes(entity.toLowerCase())) {
      foundEntities.add(entity);
    }
  }

  return Array.from(foundEntities);
}

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    // 1. Fetch recent messages (e.g., last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, created_at, chatroom_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (messagesError) throw messagesError;

    console.log(`Fetched ${messages.length} messages from the last 30 days.`);

    // 2. Process messages to extract entities and group them by day
    const dailyCounts: { [keyword: string]: { [day: string]: number } } = {};

    for (const message of messages) {
      const entities = extractNamedEntities(message.content);
      const day = new Date(message.created_at).toISOString().split('T')[0]; // YYYY-MM-DD

      for (const entity of entities) {
        if (!dailyCounts[entity]) {
          dailyCounts[entity] = {};
        }
        if (!dailyCounts[entity][day]) {
          dailyCounts[entity][day] = 0;
        }
        dailyCounts[entity][day]++;
      }
    }

    console.log(`Processed ${Object.keys(dailyCounts).length} unique entities.`);

    // 3. Analyze each entity for trends (Placeholder for statistical analysis)
    const trendingTopics = [];
    for (const keyword in dailyCounts) {
      const countsPerDay = dailyCounts[keyword];
      const daysWithMentions = Object.keys(countsPerDay).length;
      const totalMentions = Object.values(countsPerDay).reduce((a, b) => a + b, 0);

      // --- Placeholder for Standard Deviation Logic ---
      // This is where the moving average and standard deviation logic would go.
      // For now, we'll just identify topics with a high number of mentions as a placeholder.
      const MENTION_THRESHOLD = 10; // Example threshold
      if (totalMentions > MENTION_THRESHOLD && daysWithMentions > 1) {
        console.log(`Found potential trending topic: ${keyword} (Mentions: ${totalMentions})`);
        trendingTopics.push({
          topic: keyword,
          summary: `최근 ${keyword}에 대한 언급량이 급증했습니다. (총 ${totalMentions}회 언급)`,
          sources: [], // This would require joining with chatroom data
          type: 'weekly', // Placeholder type
          score: totalMentions, // Using total mentions as a placeholder score
          created_at: new Date().toISOString(),
        });
      }
    }

    // 4. Clear old topics and insert new ones
    if (trendingTopics.length > 0) {
      // Clear previous 'weekly' topics
      await supabase.from('popular_topics').delete().eq('type', 'weekly');
      
      // Insert new topics
      const { error: insertError } = await supabase.from('popular_topics').insert(trendingTopics);
      if (insertError) throw insertError;

      console.log(`Inserted ${trendingTopics.length} new trending topics.`);
    }

    return new Response(
      JSON.stringify({ message: `Topic analysis complete. Found ${trendingTopics.length} trending topics.` }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in trending topics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
