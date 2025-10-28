import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';
import StartScreen from '../StartScreen';
import EmailVerificationScreen from '../EmailVerificationScreen'; // Now acts as Google Sign-in
import InterestSelectionScreen from '../InterestSelectionScreen';
import NicknameSettingScreen from '../NicknameSettingScreen';

enum OnboardingStep {
  Loading,
  Start,
  EmailVerification, // Now Google Sign-in
  InterestSelection,
  NicknameSetting,
  Complete,
}

const Home: React.FC = () => {
  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.Loading);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        setStep(OnboardingStep.Start);
        return;
      }

      if (session) {
        setUserEmail(session.user.email || '');
        // Check if user has completed onboarding (profile exists)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname, interests')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching profile:', profileError);
          setStep(OnboardingStep.Start); // Fallback to start if profile fetch fails unexpectedly
          return;
        }

        if (profile && profile.nickname && profile.interests && profile.interests.length > 0) {
          // User fully onboarded
          router.push('/chat'); // Redirect to main app
        } else if (profile && profile.interests && profile.interests.length > 0) {
          // Interests selected, but nickname might be missing or profile incomplete
          setStep(OnboardingStep.NicknameSetting);
        } else {
          // User logged in but needs to select interests
          setStep(OnboardingStep.InterestSelection);
        }
      } else {
        // No session, start onboarding
        setStep(OnboardingStep.Start);
      }
    };

    checkUserSession();

    // Listen for auth state changes (e.g., after OAuth redirect)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserEmail(session.user.email || '');
        // If coming from OAuth, check profile completion
        const checkProfileCompletion = async () => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('nickname, interests')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile on auth state change:', profileError);
            setStep(OnboardingStep.InterestSelection); // Default to interest selection
            return;
          }

          if (profile && profile.nickname && profile.interests && profile.interests.length > 0) {
            router.push('/chat');
          } else if (profile && profile.interests && profile.interests.length > 0) {
            setStep(OnboardingStep.NicknameSetting);
          } else {
            setStep(OnboardingStep.InterestSelection);
          }
        };
        checkProfileCompletion();
      } else {
        setStep(OnboardingStep.Start);
      }
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, [router]);

  const handleStart = () => {
    setStep(OnboardingStep.EmailVerification);
  };

  const handleInterestsSelected = (interests: string[]) => {
    setUserInterests(interests);
    setStep(OnboardingStep.NicknameSetting);
  };

  const handleSignUpComplete = () => {
    setStep(OnboardingStep.Complete);
    router.push('/chat'); // Redirect to main chat screen
  };

  if (step === OnboardingStep.Loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>로딩 중...</p>
      </div>
    );
  }

  switch (step) {
    case OnboardingStep.Start:
      return <StartScreen onStart={handleStart} />;
    case OnboardingStep.EmailVerification:
      return <EmailVerificationScreen onEmailVerified={() => { /* Handled by OAuth callback */ }} />;
    case OnboardingStep.InterestSelection:
      return <InterestSelectionScreen onInterestsSelected={handleInterestsSelected} />;
    case OnboardingStep.NicknameSetting:
      return (
        <NicknameSettingScreen
          email={userEmail}
          interests={userInterests}
          onSignUpComplete={handleSignUpComplete}
        />
      );
    case OnboardingStep.Complete:
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
          <h1 className="text-4xl font-bold text-green-600 mb-4">회원가입 완료!</h1>
          <p className="text-lg text-gray-700">서비스를 시작해주세요.</p>
        </div>
      );
    default:
      return null;
  }
};

export default Home;