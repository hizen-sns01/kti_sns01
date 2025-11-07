import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Topic {
  id: number;
  topic: string;
  sources: string[];
  summary: string;
  type: 'weekly' | 'daily';
}

const TopicCard = ({ topic, sources, summary }: { topic: string; sources: string[]; summary: string; }) => (
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
  </div>
);

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
          .select('*')
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
        <h2 className="text-xl font-bold text-gray-900 mb-4">주간 인기 토픽</h2>
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