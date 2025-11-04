import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CommentsModal from './CommentsModal';

interface FeedItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  chatrooms: {
    name: string;
  } | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  user_has_liked: boolean;
  user_has_disliked: boolean;
}

const SubscribedPosts: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

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
            chatrooms ( name ),
            post_likes ( count ),
            post_dislikes ( count ),
            post_comments ( count )
          `)
          .in('chatroom_id', subscribedChatroomIds)
          .order('created_at', { ascending: false });

        if (feedError) throw feedError;

        const feedItemsWithLikes = await Promise.all(feedData.map(async (item) => {
          const { data: likeData } = await supabase
            .from('post_likes')
            .select('*')
            .eq('post_id', item.id)
            .eq('user_id', user?.id)
            .single();

          const { data: dislikeData } = await supabase
            .from('post_dislikes')
            .select('*')
            .eq('post_id', item.id)
            .eq('user_id', user?.id)
            .single();

          return {
            ...item,
            like_count: item.post_likes[0]?.count || 0,
            dislike_count: item.post_dislikes[0]?.count || 0,
            comment_count: item.post_comments[0]?.count || 0,
            user_has_liked: !!likeData,
            user_has_disliked: !!dislikeData,
          };
        }));

        setFeedItems(feedItemsWithLikes || []);

      } catch (error: any) {
        console.error('Error fetching subscribed feeds:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribedFeeds();
  }, []);

  const handleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const item = feedItems.find(i => i.id === postId);
    if (!item) return;

    const newFeedItems = feedItems.map(i => {
      if (i.id === postId) {
        const user_has_disliked = i.user_has_disliked;
        return {
          ...i,
          like_count: i.user_has_liked ? i.like_count - 1 : i.like_count + 1,
          user_has_liked: !i.user_has_liked,
          dislike_count: user_has_disliked ? i.dislike_count - 1 : i.dislike_count,
          user_has_disliked: false,
        };
      }
      return i;
    });
    setFeedItems(newFeedItems);

    if (item.user_has_liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (item.user_has_disliked) {
        await supabase.from('post_dislikes').delete().eq('post_id', postId).eq('user_id', user.id);
      }
    }
  };

  const handleDislike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const item = feedItems.find(i => i.id === postId);
    if (!item) return;

    const newFeedItems = feedItems.map(i => {
      if (i.id === postId) {
        const user_has_liked = i.user_has_liked;
        return {
          ...i,
          dislike_count: i.user_has_disliked ? i.dislike_count - 1 : i.dislike_count + 1,
          user_has_disliked: !i.user_has_disliked,
          like_count: user_has_liked ? i.like_count - 1 : i.like_count,
          user_has_liked: false,
        };
      }
      return i;
    });
    setFeedItems(newFeedItems);

    if (item.user_has_disliked) {
      await supabase.from('post_dislikes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_dislikes').insert({ post_id: postId, user_id: user.id });
      if (item.user_has_liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      }
    }
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostId(postId);
    setShowCommentsModal(true);
  };

  const handleCloseCommentsModal = () => {
    setSelectedPostId(null);
    setShowCommentsModal(false);
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url)
      .then(() => alert('게시물 링크가 클립보드에 복사되었습니다.'))
      .catch(err => console.error('클립보드 복사 실패:', err));
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => alert('클립보드에 복사되었습니다.'))
      .catch(err => console.error('클립보드 복사 실패:', err));
  };

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
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-end space-x-4">
              <button onClick={() => handleLike(item.id)} className={`flex items-center space-x-1 ${item.user_has_liked ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.787l.25.125a2 2 0 002.29-1.787V12.5a2 2 0 012-2h3.362a2 2 0 001.788-1.106l.25-.5a2 2 0 00-1.788-2.894H14.5a2 2 0 00-2 2v1.333H6z" />
                </svg>
                <span>{item.like_count}</span>
              </button>
              <button onClick={() => handleDislike(item.id)} className={`flex items-center space-x-1 ${item.user_has_disliked ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V4.237a2 2 0 00-1.106-1.787l-.25-.125a2 2 0 00-2.29 1.787V7.5a2 2 0 01-2 2H5.138a2 2 0 00-1.788 1.106l-.25.5a2 2 0 001.788 2.894H7.5a2 2 0 002-2V9.667H14z" />
                </svg>
                <span>{item.dislike_count}</span>
              </button>
              <button onClick={() => handleCommentClick(item.id)} className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
                <span>{item.comment_count}</span>
              </button>
              <button onClick={() => handleShare(item.id)} className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                <span>공유</span>
              </button>
              <button onClick={() => handleCopy(item.content)} className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                </svg>
                <span>복사</span>
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>구독 중인 채팅방의 요약글이 아직 없습니다.</p>
      )}
      {showCommentsModal && selectedPostId && (
        <CommentsModal postId={selectedPostId} onClose={handleCloseCommentsModal} />
      )}
    </div>
  );
};

export default SubscribedPosts;