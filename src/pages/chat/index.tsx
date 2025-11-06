import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import Link from 'next/link';

interface Chatroom {
  id: string;
  name: string;
  description: string;
  participant_count: number;
  is_member: boolean;
}

const ChatPage: React.FC = () => {
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('interest_tags')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setUserInterests(profile?.interest_tags || []);

        const { data: allChatrooms, error: chatroomsError } = await supabase
          .rpc('get_all_chatrooms_with_details');

        if (chatroomsError) throw chatroomsError;

        const allChatroomsData: Chatroom[] = allChatrooms || [];
        setChatrooms(allChatroomsData);

      } catch (error: any) {
        console.error('Error fetching data for chat page:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  // Separate chatrooms into joined and other for rendering
  const joinedChatrooms = chatrooms.filter(c => c.is_member);
  const otherChatrooms = chatrooms.filter(c => !c.is_member);

  return (
    <div className="p-2 md:p-4">
      <div className="mb-8 p-3 md:p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg md:text-xl font-semibold">나의 관심사</h2>
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

      {/* Joined Chatrooms Section */}
      <div className="mb-12">
        <h1 className="text-xl md:text-2xl font-bold mb-4">참여 중인 채팅방</h1>
        <div className="space-y-3 md:space-y-4">
          {joinedChatrooms.length > 0 ? (
            joinedChatrooms.map((chatroom) => (
              <Link key={chatroom.id} href={`/chat/${chatroom.id}`}>
                <div className="block p-3 md:p-4 border rounded-lg hover:bg-gray-200 cursor-pointer bg-blue-50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <h2 className="text-lg md:text-xl font-semibold">{chatroom.name}</h2>
                      <span className="ml-3 inline-block bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        참여 중
                      </span>
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0115 11a5 5 0 011 9.9M9 12a5 5 0 00-5 5v1h10v-1a5 5 0 00-5-5z" />
                      </svg>
                      <span>{chatroom.participant_count}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-1 text-sm md:text-base">{chatroom.description}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-gray-500">참여 중인 채팅방이 없습니다.</p>
          )}
        </div>
      </div>

      {/* Other Chatrooms Section */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-4">다른 채팅방</h1>
        <div className="space-y-3 md:space-y-4">
          {otherChatrooms.map((chatroom) => (
            <Link key={chatroom.id} href={`/chat/${chatroom.id}`}>
              <div className="block p-3 md:p-4 border rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg md:text-xl font-semibold">{chatroom.name}</h2>
                  <div className="flex items-center text-gray-500 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0115 11a5 5 0 011 9.9M9 12a5 5 0 00-5 5v1h10v-1a5 5 0 00-5-5z" />
                    </svg>
                    <span>{chatroom.participant_count}</span>
                  </div>
                </div>
                <p className="text-gray-600 mt-1 text-sm md:text-base">{chatroom.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;