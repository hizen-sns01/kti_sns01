import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Supabase and Gemini clients
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Main function to handle the request
async function handler(req: Request): Promise<Response> {
  try {
    // 1. Fetch recently active chatrooms (e.g., messages in the last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: chatrooms, error: chatroomsError } = await supabase
      .from('messages')
      .select('chatroom_id')
      .gt('created_at', twentyFourHoursAgo)
    
    if (chatroomsError) throw chatroomsError

    // Get unique chatroom IDs
    const uniqueChatroomIds = [...new Set(chatrooms.map(c => c.chatroom_id))]

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
        continue // Skip to the next chatroom
      }

      if (messages.length < 10) { // Don't summarize very short conversations
        continue
      }

      // 3. Generate summary with Gemini
      const conversation = messages.map(m => m.content).join('\n')
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
      const prompt = `다음 대화 내용의 핵심 주제를 3~5개의 불렛 포인트로 요약해줘. 각 요약은 1-2문장으로 작성해줘. 이 요약은 '오늘의 대화 요약'이라는 제목으로 게시될거야.

---
${conversation}`

      const result = await model.generateContent(prompt)
      const summary = await result.response.text()

      // 4. Insert the summary into the feeds table
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
