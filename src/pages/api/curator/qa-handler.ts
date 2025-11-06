import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function getRealGeminiResponse(question: string, systemInstruction: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: systemInstruction,
  });

  const result = await model.generateContent(question);
  const response = await result.response;
  return response.text();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { question, chatroomId } = req.body;
  const aiUserId = '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';

  if (!question || !chatroomId) {
    return res.status(400).json({ error: 'Question and chatroomId are required.' });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    const { data: chatroomData, error: chatroomError } = await supabaseAdmin
      .from('chatrooms')
      .select('interest, persona')
      .eq('id', chatroomId)
      .single();

    if (chatroomError || !chatroomData) {
      throw new Error(chatroomError?.message || 'Chatroom not found.');
    }

    const topicContext = chatroomData.interest || 'general';
    const persona = chatroomData.persona;

    const systemInstruction = persona
      ? persona
      : `당신은 ${topicContext} 주제의 채팅방을 담당하는 전문 AI 큐레이터입니다. 사용자의 질문에 대해 명확하고 간결하게 한국어로 답변해주세요.`;

    const aiResponse = await getRealGeminiResponse(question, systemInstruction);

    const { error: insertError } = await supabaseAdmin.from('messages').insert({
      chatroom_id: chatroomId,
      user_id: aiUserId,
      content: aiResponse,
      is_ai_curator: true,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    res.status(200).json({ message: 'AI response sent successfully.' });

  } catch (error: any) {
    console.error('Error in QA handler:', error);
    res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
