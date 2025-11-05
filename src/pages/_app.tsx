import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ChatroomAdminProvider } from '../context/ChatroomAdminContext'; // Import ChatroomAdminProvider

const publicRoutes = ['/login']; // Routes accessible without login

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRedirects = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // If user is not logged in and not on a public route, redirect to login
      if (!session && !publicRoutes.includes(router.pathname)) {
        router.replace('/login');
        return;
      }

      // If user is logged in, check their onboarding status
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, interests')
          .eq('id', session.user.id)
          .single();
        
        const isOnboardingComplete = profile && profile.nickname && profile.interests?.length > 0;

        // If user is logged in and tries to access login, redirect to home
        if (router.pathname === '/login') {
          router.replace('/');
          return;
        }

        // If onboarding is not complete, redirect to the correct step
        if (!isOnboardingComplete) {
          if (router.pathname !== '/interest-selection' && router.pathname !== '/nickname-setting') {
            if (!profile || !profile.interests || profile.interests.length === 0) {
              router.replace('/interest-selection');
            } else if (!profile.nickname) {
              router.replace('/nickname-setting');
            }
          }
        }
      }
    };

    handleRedirects();

    // Listen for auth state changes to handle login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN') {
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };

  }, [router.pathname]); // Rerun on path change

  const noLayoutRoutes = ['/login', '/interest-selection', '/nickname-setting'];

  if (noLayoutRoutes.includes(router.pathname)) {
    return <Component {...pageProps} />;
  }

  return (
    <ChatroomAdminProvider> {/* Wrap Layout with ChatroomAdminProvider */}
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ChatroomAdminProvider>
  );
}

export default MyApp;