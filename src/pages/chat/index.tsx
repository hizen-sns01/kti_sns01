import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import Link from 'next/link';

interface Chatroom {
  id: string;
  name: string;
  description: string;
  last_message: string;
  unread_count: number;
}

const ChatPage: React.FC = () => {
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatrooms = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_user_chatrooms');

        if (error) {
          throw error;
        }

        setChatrooms(data || []);
      } catch (error: any) {
        console.error('Error fetching chatrooms:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChatrooms();
  }, []);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">채팅방 목록</h1>
      <div className="space-y-4">
        {chatrooms.map((chatroom) => (
          <Link key={chatroom.id} href={`/chat/${chatroom.id}`}>
            <a className="block p-4 border rounded-lg hover:bg-gray-100">
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">{chatroom.name}</h2>
                {chatroom.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {chatroom.unread_count}
                  </span>
                )}
              </div>
              <p className="text-gray-600">{chatroom.description}</p>
              <p className="text-sm text-gray-500 mt-2">{chatroom.last_message}</p>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChatPage;
