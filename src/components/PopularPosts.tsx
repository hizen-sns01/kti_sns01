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

const PopularPosts: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularFeeds = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('feeds')
          .select(`
            *,
            chatrooms ( name )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setFeedItems(data || []);

      } catch (error: any) {
        console.error('Error fetching popular feeds:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularFeeds();
  }, []);

  if (loading) {
    return <p>인기글을 불러오는 중...</p>;
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
        <p>아직 생성된 인기글이 없습니다.</p>
      )}
    </div>
  );
};

export default PopularPosts;
