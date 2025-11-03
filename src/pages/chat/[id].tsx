import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import botcall from '../../botcall.json';

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  chatroom_id: string;
  profiles: {
    nickname: string;
  } | null;
}

const ChatroomPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    setupUser();
  }, []);

  const fetchMessages = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles ( nickname )
        `)
        .eq('chatroom_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase.rpc('update_last_read_at', { chatroom_id_param: id });

    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    fetchMessages();

    const messageSubscription = supabase
      .channel(`chatroom:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatroom_id=eq.${id}` },
        async (payload) => {
          const newMessage = payload.new as Message;

          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', newMessage.user_id)
            .single();
          
          if (error) {
            console.error("Error fetching profile for new message:", error);
          } else {
            newMessage.profiles = profileData;
          }
          
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || !currentUser || !id) return;

    const keywords = botcall.keywords;
    let isBotCall = false;
    let question = '';

    for (const keyword of keywords) {
      if (trimmedMessage.startsWith(keyword)) {
        question = trimmedMessage.substring(keyword.length).trim();
        isBotCall = true;
        break;
      }
    }

    if (isBotCall) {
      if (question) {
        fetch('/api/curator/qa-handler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: question,
            chatroomId: id,
          }),
        }).catch(error => {
          console.error('Failed to call QA handler:', error);
        });
      }
      setNewMessage('');
      return;
    }

    const { error } = await supabase.from('messages').insert([
      { chatroom_id: id, user_id: currentUser.id, content: trimmedMessage },
    ]);

    if (error) {
      console.error('Error sending message:', error.message);
    } else {
      setNewMessage('');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Message display area */}
      <div className="flex-grow overflow-y-auto p-2 md:p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.user_id === currentUser?.id;
            const isAiCurator = message.user_id === '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';

            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser || isAiCurator ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end max-w-xs md:max-w-md">
                  {!isCurrentUser && !isAiCurator && (
                     <div className="mr-2 text-xs text-gray-500 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 mb-1"></div>
                        {message.profiles?.nickname || '...'}
                     </div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : isAiCurator
                        ? 'bg-green-500 text-white rounded-bl-none' // Different color for AI
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {isAiCurator && <strong className='block text-xs mb-1'>AI 큐레이터</strong>}
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Message input form */}
      <div className="p-2 md:p-4 bg-white border-t">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`메시지를 입력하세요... (${botcall.keywords.join(', ')}로 질문 가능)`}
          />
          <button
            type="submit"
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={!newMessage.trim()}
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatroomPage;
