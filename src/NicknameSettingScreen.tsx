import React, { useState } from 'react';
import { supabase } from './supabaseClient';

interface NicknameSettingScreenProps {
  email: string;
  interests: string[];
  onSignUpComplete: () => void;
}

const NicknameSettingScreen: React.FC<NicknameSettingScreenProps> = ({ email, interests, onSignUpComplete }) => {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    setMessage('');

    // Client-side validation for nickname
    if (nickname.trim().length < 2 || nickname.trim().length > 15) {
      setMessage('닉네임은 2자 이상 15자 이하여야 합니다.');
      setLoading(false);
      return;
    }
    // Add more validation rules as needed (e.g., no special characters, profanity check)

    try {
      // Supabase sign-up with email and additional user metadata
      // For simplicity, we're assuming the email is already verified via OTP/magic link
      // and we're just updating user metadata or creating a profile entry.
      
      // First, ensure the user is authenticated (e.g., from a magic link click or OTP session)
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage(`사용자 인증 실패: ${userError?.message || '로그인 상태를 확인할 수 없습니다.'}`);
        setLoading(false);
        return;
      }

      // Update user metadata or create a public profile entry
      const { error: updateError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          nickname: nickname.trim(),
          interests: interests,
          email: email, // Store email in profile for easier access if needed
        },
        { onConflict: 'id' }
      );

      if (updateError) {
        // Check for nickname uniqueness error specifically if Supabase is configured for it
        if (updateError.code === '23505') { // Example unique constraint violation code
          setMessage('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
        } else {
          setMessage(`회원가입 실패: ${updateError.message}`);
        }
      } else {
        setMessage('회원가입 및 프로필 설정 완료!');
        onSignUpComplete();
      }
    } catch (error: any) {
      setMessage(`오류 발생: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">닉네임 설정</h1>
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <p className="text-gray-700 mb-4">닉네임 :</p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="사용할 닉네임을 입력하세요"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <button
          onClick={handleSignUp}
          disabled={loading || nickname.trim().length === 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50"
        >
          {loading ? '등록 중...' : '다음'}
        </button>
        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
      </div>
    </div>
  );
};

export default NicknameSettingScreen;
