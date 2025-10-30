import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
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
    fetchMessages();

    const messageSubscription = supabase
      .channel(`chatroom:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatroom_id=eq.${id}` },
        async (payload) => {
          const newMessage = payload.new as Message;
          // Fetch profile for the new message
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
    if (newMessage.trim() === '' || !currentUser) return;

    const { error } = await supabase.from('messages').insert([
      { chatroom_id: id, user_id: currentUser.id, content: newMessage.trim() },
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
    // Use h-full and flex-col to create a chat layout.
    // The height is calculated to fill the space below the main layout's header/nav.
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Message display area */}
      <div className="flex-grow overflow-y-auto p-2 md:p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.user_id === currentUser?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end max-w-xs md:max-w-md">
                  {!isCurrentUser && (
                     <div className="mr-2 text-xs text-gray-500 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 mb-1"></div>
                        {message.profiles?.nickname || '...'}
                     </div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
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
            placeholder="메시지를 입력하세요..."
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
