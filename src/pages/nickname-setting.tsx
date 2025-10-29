import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';

const NicknameSettingPage: React.FC = () => {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check if user is logged in, otherwise redirect to login
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      }
    };
    checkUser();
  }, [router]);

  const handleComplete = async () => {
    if (nickname.trim().length < 2 || nickname.trim().length > 15) {
      setMessage('닉네임은 2자 이상 15자 이하여야 합니다.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Update the profile with the nickname
      const { error } = await supabase.from('profiles').upsert({ 
        id: user.id,
        nickname: nickname.trim(),
      }, { onConflict: 'id' });

      if (error) {
        if (error.code === '23505') { // unique constraint violation
          setMessage('이미 사용 중인 닉네임입니다.');
        } else {
          throw error;
        }
      } else {
        // Redirect to the root page. The gatekeeper will handle the rest.
        router.push('/');
      }
    } catch (error: any) {
      console.error('Error setting nickname:', error);
      setMessage('닉네임 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">닉네임 설정</h1>
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <p className="text-gray-700 mb-4">마지막 단계입니다! 사용할 닉네임을 입력해주세요.</p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="사용할 닉네임을 입력하세요"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <button
          onClick={handleComplete}
          disabled={loading || nickname.trim().length === 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50"
        >
          {loading ? '설정 중...' : '완료하고 시작하기'}
        </button>
        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
      </div>
    </div>
  );
};

export default NicknameSettingPage;
