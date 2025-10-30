import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface FeedItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  chatrooms: {
    name: string;
  } | null;
}

const SubscribedPosts: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscribedFeeds = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        // 1. Get the chatroom IDs the user is subscribed to
        const { data: participantData, error: participantError } = await supabase
          .from('participants')
          .select('chatroom_id')
          .eq('user_id', user.id);

        if (participantError) throw participantError;

        const subscribedChatroomIds = participantData.map(p => p.chatroom_id);

        if (subscribedChatroomIds.length === 0) {
          setFeedItems([]);
          return;
        }

        // 2. Fetch feeds from those chatrooms
        const { data: feedData, error: feedError } = await supabase
          .from('feeds')
          .select(`
            *,
            chatrooms ( name )
          `)
          .in('chatroom_id', subscribedChatroomIds)
          .order('created_at', { ascending: false });

        if (feedError) throw feedError;

        setFeedItems(feedData || []);

      } catch (error: any) {
        console.error('Error fetching subscribed feeds:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribedFeeds();
  }, []);

  if (loading) {
    return <p>구독글을 불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      {feedItems.length > 0 ? (
        feedItems.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-2">
              <span className="font-semibold text-sm text-gray-600">{item.chatrooms?.name || '알 수 없는 채팅방'}</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
            <div className="text-xs text-gray-400 mt-4">
              {new Date(item.created_at).toLocaleString()}
            </div>
          </div>
        ))
      ) : (
        <p>구독 중인 채팅방의 요약글이 아직 없습니다.</p>
      )}
    </div>
  );
};

export default SubscribedPosts;
