import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import MessageCommentsModal from './MessageCommentsModal'; // Import MessageCommentsModal
import Link from 'next/link'; // Import Link for navigation

interface Topic {
  id: number;
  topic: string;
  sources: string[];
  summary: string;
  type: 'weekly' | 'daily';
  chatroom_id?: string; // Add chatroom_id
  message_id?: number; // Add message_id
}

const TopicCard = ({ topic, sources, summary, chatroom_id, message_id }: Topic) => {
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="mb-2 flex justify-between items-center">
        <span className="text-lg font-bold text-gray-800">{topic}</span>
        {chatroom_id && message_id && (
          <button
            onClick={() => setShowCommentsModal(true)}
            className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.606 1.123 2.987 2.675 3.124o14.95 0c1.552-.137 2.675-1.518 2.675-3.124s-1.123-2.987-2.675-3.124H4.925C3.373 9.773 2.25 11.154 2.25 12.76z" />
            </svg>
            댓글
          </button>
        )}
      </div>
      {sources && sources.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-gray-500">출처: {sources.join(', ')}</span>
        </div>
      )}
      <p className="text-gray-600 text-sm">{summary}</p>

      {chatroom_id && (
        <Link href={`/chat/${chatroom_id}?message=${message_id}`} className="text-blue-500 hover:underline text-sm mt-2 block">
          채팅방으로 이동
        </Link>
      )}

      {showCommentsModal && message_id && (
        <MessageCommentsModal
          messageId={message_id.toString()} // message_id는 number 타입이므로 string으로 변환
          onClose={() => setShowCommentsModal(false)}
          onCommentAdded={() => {}} // 댓글 추가 후 처리 로직 (필요시 구현)
        />
      )}
    </div>
  );
};

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
          .select('*, chatroom_id, message_id') // chatroom_id와 message_id도 함께 가져옵니다.
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