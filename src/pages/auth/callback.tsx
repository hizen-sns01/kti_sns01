import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabaseClient';

const AuthCallback = () => {
  const router = useRouter();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Supabase automatically handles the session after the redirect
      // We just need to check if a user is logged in
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        // User is logged in, now check if they have a profile (nickname, interests)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname, interests')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching profile:', profileError);
          // Handle error, maybe redirect to an error page
          router.push('/'); // Redirect to home or error page
          return;
        }

        if (profile && profile.nickname && profile.interests && profile.interests.length > 0) {
          // User has completed onboarding, redirect to main app
          router.push('/chat'); // Assuming a /chat page exists for the main app
        } else {
          // User is logged in but needs to complete onboarding (interests/nickname)
          // We need to pass the email to the next step, but for OAuth, the email is in session.user.email
          // For simplicity, we'll redirect to interest selection, which will then lead to nickname setting
          router.push('/interest-selection'); // Redirect to interest selection
        }
      } else if (error) {
        console.error('Auth callback error:', error);
        router.push('/'); // Redirect to home on error
      } else {
        // No session and no error, might be an intermediate state or direct access
        router.push('/'); // Redirect to home
      }
    };

    handleOAuthCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <p>로그인 처리 중...</p>
    </div>
  );
};

export default AuthCallback;
