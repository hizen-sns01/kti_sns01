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
  
  // For suggestions feature
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
        .select(`*, profiles(nickname)`)
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

    const channel = supabase.channel(`chatroom:${id}`);
    const messageSubscription = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatroom_id=eq.${id}` }, async (payload) => {
      const newMessagePayload = payload.new as Message;
      const { data: profileData, error } = await supabase.from('profiles').select('nickname').eq('id', newMessagePayload.user_id).single();
      if (error) console.error("Error fetching profile:", error);
      else newMessagePayload.profiles = profileData;
      setMessages((prev) => [...prev, newMessagePayload]);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value.startsWith('/')) {
      const search = value.substring(1).toLowerCase();
      const filteredSuggestions = botcall.keywords.filter(keyword => keyword.substring(1).toLowerCase().startsWith(search));
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(`${suggestion} `);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || !currentUser || !id) return;

    // 1. Always insert the user's own message to the DB first.
    const { error } = await supabase.from('messages').insert([{ chatroom_id: id, user_id: currentUser.id, content: trimmedMessage }]);
    
    if (error) {
      console.error('Error sending message:', error.message);
      return;
    }

    // 2. Clear input and suggestions immediately for better UX.
    setNewMessage('');
    setShowSuggestions(false);

    // 3. Check if it was a bot call and trigger the API in the background.
    for (const keyword of botcall.keywords) {
      if (trimmedMessage.startsWith(keyword)) {
        const question = trimmedMessage.substring(keyword.length).trim();
        if (question) {
          fetch('/api/curator/qa-handler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, chatroomId: id }),
          }).catch(err => console.error('QA handler call failed:', err));
        }
        break;
      }
    }
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="flex-grow overflow-y-auto p-2 md:p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.user_id === currentUser?.id;
            const isAiCurator = message.user_id === '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';
            const isCommand = !isAiCurator && botcall.keywords.some(keyword => message.content.startsWith(keyword));

            return (
              <div key={message.id} className={`flex w-full items-end ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end max-w-xs md:max-w-md ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar Area */}
                  <div className="mx-2 flex shrink-0 flex-col items-center self-center text-xs text-gray-500">
                    {!isCurrentUser && (
                      <>
                        {isAiCurator ? (
                          <div className="relative h-8 w-8 rounded-full bg-green-200">
                            <svg className="h-full w-full p-1.5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300"></div>
                        )}
                        <div className="mt-1 w-12 truncate">{message.profiles?.nickname || (isAiCurator ? 'AI' : '...')}</div>
                      </>
                    )}
                  </div>

                  {/* Bubble Area */}
                  <div>
                    {isCommand ? (
                      <div className="bg-gray-700 text-gray-100 px-4 py-3 rounded-lg shadow-md flex items-center font-mono">
                        <svg className="w-5 h-5 mr-3 text-yellow-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M9 3v4M7 5h4m5 3v4m-2-2h4m-7 7v4m-2-2h4" />
                        </svg>
                        <span>{message.content}</span>
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-lg ${isCurrentUser ? 'bg-blue-500 text-white rounded-br-none' : isAiCurator ? 'bg-green-500 text-white rounded-bl-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                        {isAiCurator && <strong className='block text-xs mb-1'>AI 큐레이터</strong>}
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 md:p-4 bg-white border-t relative">
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 p-2 bg-white border rounded-lg shadow-lg">
            <p className="text-xs text-gray-500 mb-1 px-2">명령어 제안</p>
            {suggestions.map(suggestion => (
              <div key={suggestion} onClick={() => handleSuggestionClick(suggestion)} className="p-2 hover:bg-gray-100 rounded cursor-pointer font-mono">
                {suggestion}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            className="flex-grow border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`메시지를 입력하세요... (${botcall.keywords.join(', ')}로 질문 가능)`}
          />
          <button type="submit" className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={!newMessage.trim()}>
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatroomPage;
