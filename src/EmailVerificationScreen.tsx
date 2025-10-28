import React, { useState } from 'react';
import { supabase } from './supabaseClient';

interface EmailVerificationScreenProps {
  onEmailVerified: (email: string) => void;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ onEmailVerified }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback', // Ensure this callback URL is configured in Supabase
        },
      });

      if (error) {
        setMessage(`Google 로그인 실패: ${error.message}`);
      } else if (data) {
        // Supabase redirects to the redirectTo URL after successful OAuth.
        // The session will be handled by the callback page.
        // For now, we can just indicate that the process has started.
        setMessage('Google 로그인 페이지로 리디렉션 중...');
      }
    } catch (error: any) {
      setMessage(`오류 발생: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Google 계정으로 로그인</h1>
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50"
        >
          {loading ? 'Google 로그인 중...' : 'Google로 로그인'}
        </button>
        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
      </div>
    </div>
  );
};

export default EmailVerificationScreen;
