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
    const NOW = new Date();
    const thirtyDaysAgo = new Date(NOW);
    thirtyDaysAgo.setDate(NOW.getDate() - 30);
    const twentyFourHoursAgo = new Date(NOW);
    twentyFourHoursAgo.setHours(NOW.getHours() - 24);

    // --- Weekly Topics Calculation (Keyword-based) ---
    // 1. Fetch recent messages (e.g., last 30 days) for keyword analysis
    const { data: keywordMessages, error: keywordMessagesError } = await supabase
      .from('messages')
      .select('content, created_at, chatroom_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (keywordMessagesError) throw keywordMessagesError;

    console.log(`Fetched ${keywordMessages.length} messages for keyword analysis from the last 30 days.`);

    // 2. Process messages to extract entities and group them by day
    const dailyCounts: { [keyword: string]: { [day: string]: number } } = {};

    for (const message of keywordMessages) {
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

    console.log(`Processed ${Object.keys(dailyCounts).length} unique entities for weekly topics.`);

    // 3. Analyze each entity for trends
    const weeklyTrendingTopics = [];
    for (const keyword in dailyCounts) {
      const countsPerDay = dailyCounts[keyword];
      const daysWithMentions = Object.keys(countsPerDay).length;
      const totalMentions = Object.values(countsPerDay).reduce((a, b) => a + b, 0);

      const MENTION_THRESHOLD = 10;
      if (totalMentions > MENTION_THRESHOLD && daysWithMentions > 1) {
        console.log(`Found potential weekly trending topic: ${keyword} (Mentions: ${totalMentions})`);
        weeklyTrendingTopics.push({
          topic: keyword,
          summary: `최근 ${keyword}에 대한 언급량이 급증했습니다. (총 ${totalMentions}회 언급)`,
          sources: [],
          type: 'weekly',
          score: totalMentions,
          created_at: NOW.toISOString(),
        });
      }
    }

    // 4. Clear old weekly topics and insert new ones
    if (weeklyTrendingTopics.length > 0) {
      await supabase.from('popular_topics').delete().eq('type', 'weekly');
      const { error: insertError } = await supabase.from('popular_topics').insert(weeklyTrendingTopics);
      if (insertError) throw insertError;
      console.log(`Inserted ${weeklyTrendingTopics.length} new weekly trending topics.`);
    }


    // --- Daily Popular Topics Calculation (Message-based) ---
    // 1. Fetch recent messages (last 24 hours) with likes and comment counts
    const { data: dailyMessages, error: dailyMessagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        chatroom_id,
        created_at,
        message_likes(id),
        message_comments(id)
      `)
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (dailyMessagesError) throw dailyMessagesError;

    console.log(`Fetched ${dailyMessages.length} messages from the last 24 hours for daily topics.`);

    const dailyPopularTopics = [];
    for (const message of dailyMessages) {
      const likes = message.message_likes.length || 0;
      const comments = message.message_comments.length || 0;
      const calculatedScore = (likes * 1) + (comments * 3);

      if (calculatedScore > 0) { // Only consider messages with a score
        // Generate summary (e.g., first 100 characters of content)
        const summary = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');

        // Fetch chatroom name for the topic
        let chatroomName = '알 수 없는 채팅방';
        const { data: chatroomData, error: chatroomError } = await supabase
          .from('chatrooms')
          .select('name')
          .eq('id', message.chatroom_id)
          .single();
        
        if (chatroomError) {
          console.error(`Error fetching chatroom name for message ${message.id}:`, chatroomError.message);
        } else if (chatroomData) {
          chatroomName = chatroomData.name;
        }

        dailyPopularTopics.push({
          topic: chatroomName, // Use chatroom name as topic for daily
          summary: summary,
          sources: [], // No specific sources needed for message-based topic
          type: 'daily',
          score: calculatedScore,
          created_at: NOW.toISOString(),
          chatroom_id: message.chatroom_id,
          message_id: message.id,
        });
      }
    }

    // Sort daily topics by score and take top N (e.g., 5)
    dailyPopularTopics.sort((a, b) => b.score - a.score);
    const topDailyPopularTopics = dailyPopularTopics.slice(0, 5);

    // 2. Clear old daily topics and insert new ones
    if (topDailyPopularTopics.length > 0) {
      await supabase.from('popular_topics').delete().eq('type', 'daily');
      const { error: insertError } = await supabase.from('popular_topics').insert(topDailyPopularTopics);
      if (insertError) throw insertError;
      console.log(`Inserted ${topDailyPopularTopics.length} new daily popular topics.`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Topic analysis complete. Found ${weeklyTrendingTopics.length} weekly trending topics and ${topDailyPopularTopics.length} daily popular topics.`,
      }),
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
