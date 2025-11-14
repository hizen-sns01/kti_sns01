import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';

// Profile 타입을 types.ts에서 가져오거나 여기에 정의할 수 있습니다.
// 여기서는 간단하게 필요한 속성만 정의합니다.
export interface Profile {
  id: string;
  nickname: string | null;
  email: string | null;
  interest_tags: string[] | null;
  // ... 다른 프로필 속성들
}

export const useUserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      // 1. 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // 2. 사용자 ID를 기반으로 프로필 정보 가져오기
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // 'PGRST116'는 행이 없다는 오류 코드
          console.error('Error fetching profile:', error);
        }
        setProfile(data);
      }
      setLoading(false);
    };

    fetchUserAndProfile();

    // 인증 상태 변경 시 다시 프로필 정보 가져오기
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        // Refetch profile whenever auth state changes
        fetchUserAndProfile();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
};
