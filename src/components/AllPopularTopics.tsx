import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Link from 'next/link';

// --- Interfaces ---
interface Comment {
  id: number;
  content: string;
  created_at: string;
  profiles: { nickname: string } | null;
}

interface Topic {
  id: number;
  topic: string;
  sources: string[];
  summary: string;
  type: 'weekly' | 'daily';
  chatroom_id?: string;
  message_id?: number;
}

import { useUserProfile } from '../hooks/useUserProfile';

// --- Interfaces ---
interface Comment {
...
// --- CommentList Component ---
const CommentList = ({ messageId }: { messageId: number }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUserProfile(); // 현재 사용자 정보를 가져오기 위해 훅 사용

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_comments')
      .select('id, content, created_at, profiles(nickname)')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else if (data) {
      const formattedComments = data.map(comment => ({
        ...comment,
        profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
      }));
      setComments(formattedComments as Comment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [messageId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('message_comments')
      .insert({
        message_id: messageId,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (error) {
      console.error('Error posting comment:', error);
      alert('댓글 등록에 실패했습니다.');
    } else {
      setNewComment('');
      await fetchComments(); // 댓글 등록 후 목록 새로고침
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="text-sm text-gray-500 p-2">댓글을 불러오는 중...</div>;

  return (
    <div className="mt-3 pt-3 border-t">
      {/* 댓글 목록 */}
      <div className="space-y-2">
        {comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="text-sm">
              <span className="font-semibold text-gray-700">{comment.profiles?.nickname || '익명'}</span>
              <p className="text-gray-600 ml-2">{comment.content}</p>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 p-2">아직 댓글이 없습니다.</div>
        )}
      </div>

      {/* 댓글 입력 폼 */}
      {user && (
        <form onSubmit={handleCommentSubmit} className="mt-4 flex items-center space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-grow border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="댓글을 입력하세요..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </form>
      )}
    </div>
  );
};

// --- TopicCard Component ---
const TopicCard = ({ topic, sources, summary, message_id }: Topic) => {
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);

  const handleToggleComments = () => {
    setIsCommentsVisible(prev => !prev);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="mb-2">
        <span className="text-lg font-bold text-gray-800">{topic}</span>
      </div>
      {sources && sources.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-gray-500">출처: {sources.join(', ')}</span>
        </div>
      )}
      <p className="text-gray-600 text-sm">{summary}</p>

      <div className="mt-4 flex justify-start">
        {message_id && (
          <button
            onClick={handleToggleComments}
            className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.606 1.123 2.987 2.675 3.124h14.15c1.552-.137 2.675-1.518 2.675-3.124s-1.123-2.987-2.675-3.124H4.925C3.373 9.773 2.25 11.154 2.25 12.76z" />
            </svg>
            {isCommentsVisible ? '댓글 숨기기' : '댓글 펼치기'}
          </button>
        )}
      </div>

      {isCommentsVisible && message_id && <CommentList messageId={message_id} />}
    </div>
  );
};

// --- AllPopularTopics Component ---
const AllPopularTopics: React.FC = () => {
  const [weeklyTopics, setWeeklyTopics] = useState<Topic[]>([]);
  const [dailyTopics, setDailyTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('popular_topics')
          .select('*, chatroom_id, message_id')
          .in('type', ['weekly', 'daily'])
          .order('score', { ascending: false });

        if (error) throw error;

        setWeeklyTopics(data.filter(t => t.type === 'weekly').slice(0, 3));
        setDailyTopics(data.filter(t => t.type === 'daily').slice(0, 5));

      } catch (err: any) {
        console.error('Error fetching popular topics:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">인기 토픽을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Weekly Popular Topics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">실시간 토픽</h2>
        <div className="space-y-4">
          {weeklyTopics.length > 0 ? (
            weeklyTopics.map((item) => (
              <TopicCard key={`weekly-${item.id}`} {...item} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">아직 집계된 주간 인기 토픽이 없습니다.</p>
          )}
        </div>
      </div>

      {/* Daily Popular Topics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">일일 인기 토픽</h2>
        <div className="space-y-4">
          {dailyTopics.length > 0 ? (
            dailyTopics.map((item) => (
              <TopicCard key={`daily-${item.id}`} {...item} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">아직 집계된 일일 인기 토픽이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllPopularTopics;