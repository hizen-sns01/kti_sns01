import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

interface Profile {
  nickname: string;
  interests: string[];
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('nickname, interests')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(profileData);
        }
      } else {
        router.replace('/login'); // Redirect if not logged in
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="p-2 md:p-4">
      <div className="w-full max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          {/* Avatar Placeholder */}
          <div className="w-24 h-24 bg-gray-300 rounded-full mb-4"></div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {profile?.nickname || '사용자'}
          </h1>
          <p className="text-gray-500 mt-1">{user?.email}</p>
        </div>

        <div className="mt-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3">나의 관심사</h2>
          <div className="flex flex-wrap gap-2">
            {profile?.interests && profile.interests.length > 0 ? (
              profile.interests.map(interest => (
                <span key={interest} className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full">
                  {interest}
                </span>
              ))
            ) : (
              <p className="text-gray-500">등록된 관심사가 없습니다.</p>
            )}
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
