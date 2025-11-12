import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';

const InterestSelectionPage: React.FC = () => {
  const router = useRouter();
  const [predefinedInterests, setPredefinedInterests] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data, error } = await supabase
        .from('common_code')
        .select('value')
        .eq('category', 'INTERESTS');

      if (error) {
        console.error('Error fetching interests:', error);
        setMessage('관심사 목록을 불러오는데 실패했습니다.');
      } else {
        setPredefinedInterests(data.map(item => item.value));
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        fetchInterests();
      }
    };
    checkUser();
  }, [router]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    } else if (selectedInterests.includes(customInterest.trim())) {
      setMessage('이미 추가된 관심사입니다.');
    }
  };

  const handleNext = async () => {
    if (selectedInterests.length === 0) {
      setMessage('최소 하나 이상의 관심사를 선택해주세요.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Save interests to the profile
      const { error } = await supabase.from('profiles').upsert({ 
        id: user.id,
        interest_tags: selectedInterests,
        email: user.email
      }, { onConflict: 'id' });

      if (error) throw error;

      router.push('/nickname-setting');
    } catch (error: any) {
      console.error('Error saving interests:', error);
      setMessage('관심사 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-2 sm:p-4">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">관심사 선택</h1>
      <div className="w-full max-w-2xl bg-white p-6 md:p-8 rounded-lg shadow-md">
        <p className="text-gray-700 mb-4">관심사를 선택하거나 직접 입력해주세요:</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {predefinedInterests.map(interest => (
            <span
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`cursor-pointer px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm font-medium
                ${selectedInterests.includes(interest) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              {interest}
            </span>
          ))}
        </div>

        <div className="flex mb-6">
          <input
            type="text"
            value={customInterest}
            onChange={(e) => {
              setCustomInterest(e.target.value);
              setMessage('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
            placeholder="새로운 관심사 입력 (선택 사항)"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addCustomInterest}
            className="px-4 py-2 bg-gray-700 text-white rounded-r-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-75"
          >
            추가
          </button>
        </div>

        {selectedInterests.length > 0 && (
          <div className="mb-6">
            <p className="text-gray-700 mb-2">선택된 관심사:</p>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map(interest => (
                <span key={interest} className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 flex items-center">
                  {interest}
                  <button onClick={() => toggleInterest(interest)} className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none">&times;</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}

        <button
          onClick={handleNext}
          disabled={loading || selectedInterests.length === 0}
          className="w-full px-4 py-2 md:py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '다음'}
        </button>
      </div>
    </div>
  );
};

export default InterestSelectionPage;
