import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';

const IndexPage = () => {
  const router = useRouter();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // If no user session, redirect to login page
      if (!session) {
        router.replace('/login');
        return;
      }

      // If user session exists, check profile status
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nickname, interests')
        .eq('id', session.user.id)
        .single();

      // Handle potential error (excluding 'no rows found' which is a valid case)
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        // Redirect to login on error, as we can't determine user state
        router.replace('/login');
        return;
      }

      // Redirect based on profile status
      if (!profile || !profile.interests || profile.interests.length === 0) {
        router.replace('/interest-selection');
      } else if (!profile.nickname) {
        router.replace('/nickname-setting');
      } else {
        // User is fully onboarded, trigger chatroom assignment and redirect to chat
        // We still call the on-login API here to ensure chatrooms are assigned on every login
        await fetch('/api/auth/on-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: session.user }),
        });
        router.replace('/chat');
      }
    };

    checkUserAndRedirect();
  }, [router]);

  // This page will show a loading indicator while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <p>로딩 중...</p>
    </div>
  );
};

export default IndexPage;