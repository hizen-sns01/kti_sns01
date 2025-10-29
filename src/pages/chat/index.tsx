import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import Link from 'next/link';

interface Chatroom {
  id: string;
  name: string;
  description: string;
}

const ChatPage: React.FC = () => {
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        // Fetch user's profile to get interests
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setUserInterests(profile?.interests || []);

        // Fetch all chatrooms
        const { data: allChatrooms, error: chatroomsError } = await supabase
          .from('chatrooms')
          .select('*');

        if (chatroomsError) throw chatroomsError;
        setChatrooms(allChatrooms || []);

      } catch (error: any) {
        console.error('Error fetching data for chat page:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold">나의 관심사</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {userInterests.length > 0 ? (
            userInterests.map(interest => (
              <span key={interest} className="bg-blue-100 text-blue-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded">
                {interest}
              </span>
            ))
          ) : (
            <p>등록된 관심사가 없습니다.</p>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4">전체 채팅방 목록</h1>
      <div className="space-y-4">
        {chatrooms.map((chatroom) => (
          <Link key={chatroom.id} href={`/chat/${chatroom.id}`}>
            <div className="block p-4 border rounded-lg hover:bg-gray-100 cursor-pointer">
              <h2 className="text-xl font-semibold">{chatroom.name}</h2>
              <p className="text-gray-600">{chatroom.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChatPage;
