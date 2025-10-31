import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_KEY')!)

// Main function to handle the request
async function handler(_req: Request): Promise<Response> {
  try {
    // 1. Fetch recently active chatrooms
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: chatrooms, error: chatroomsError } = await supabase
      .from('messages')
      .select('chatroom_id')
      .gt('created_at', twentyFourHoursAgo)
    
    if (chatroomsError) throw chatroomsError

    const uniqueChatroomIds = Array.from(new Set(chatrooms.map(c => c.chatroom_id)))

    if (uniqueChatroomIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No active chatrooms to summarize.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. For each chatroom, fetch messages and generate a summary
    for (const chatroomId of uniqueChatroomIds) {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('content')
        .eq('chatroom_id', chatroomId)
        .gt('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error(`Error fetching messages for chatroom ${chatroomId}:`, messagesError)
        continue
      }

      if (messages.length < 10) {
        continue
      }

      // 3. Generate summary with Gemini using fetch
      const conversation = messages.map(m => m.content).join('\n')
      const prompt = `다음 대화 내용의 핵심 주제를 3~5개의 불렛 포인트로 요약해줘. 각 요약은 1-2문장으로 작성해줘. 이 요약은 '오늘의 대화 요약'이라는 제목으로 게시될거야.\n\n---\n${conversation}`
      
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        console.error(`Gemini API error for chatroom ${chatroomId}:`, errorBody);
        continue;
      }

      const geminiData = await geminiResponse.json();
      const summary = geminiData.candidates[0].content.parts[0].text;

      // 4. Insert the summary into a different table (e.g., 'summaries')
      // Avoid inserting back into messages to prevent loops and confusion
      const { error: insertError } = await supabase.from('feeds').insert({
        chatroom_id: chatroomId,
        title: '오늘의 대화 요약',
        content: summary,
      })

      if (insertError) {
        console.error(`Error inserting summary for chatroom ${chatroomId}:`, insertError)
      }
    }

    return new Response(JSON.stringify({ message: 'Summaries generated successfully.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('An unexpected error occurred:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

// Serve the function
serve(handler)
