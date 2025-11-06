import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

interface Prescription {
    id: number;
    content: string;
    created_at: string;
}

interface ActivityMetrics {
    total_activity_time_minutes: number;
    total_messages: number;
    total_reactions_received: number;
    total_shares: number;
    rooms_created: number;
    participants_in_rooms: number;
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [newPrescription, setNewPrescription] = useState('');
  const [activityMetrics, setActivityMetrics] = useState<ActivityMetrics | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Fetch profile, prescriptions, and metrics in parallel
        const [profileRes, prescriptionsRes, metricsRes] = await Promise.all([
            supabase.from('profiles').select('nickname, interest_tags, status_symptoms, height, weight, age_group').eq('id', user.id).single(),
            supabase.from('prescriptions').select('id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('user_activity_metrics').select('*').eq('user_id', user.id).single()
        ]);

        if (profileRes.error) console.error('Error fetching profile:', profileRes.error);
        else if (profileRes.data) {
            setNickname(profileRes.data.nickname || '');
            setInterestTags(profileRes.data.interest_tags || []);
            setSymptoms(profileRes.data.status_symptoms || '');
            setHeight(profileRes.data.height || '');
            setWeight(profileRes.data.weight || '');
            setAgeGroup(profileRes.data.age_group || '');
        }

        if (prescriptionsRes.error) console.error('Error fetching prescriptions:', prescriptionsRes.error);
        else setPrescriptions(prescriptionsRes.data || []);

        if (metricsRes.error) console.error('Error fetching metrics:', metricsRes.error);
        else setActivityMetrics(metricsRes.data);

      } else {
        router.replace('/login');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.rpc('update_my_profile', {
        nickname_new: nickname,
        tags_new: interestTags,
        symptoms_new: symptoms,
        height_new: height ? parseFloat(height) : null,
        weight_new: weight ? parseFloat(weight) : null,
        age_group_new: ageGroup
    });

    if (error) {
        alert('프로필 업데이트 중 오류가 발생했습니다: ' + error.message);
    } else {
        alert('프로필이 성공적으로 업데이트되었습니다.');
    }
    setLoading(false);
  };

  const handleAddPrescription = async () => {
    if (!newPrescription.trim() || !user) return;
    const { error } = await supabase.rpc('add_prescription_text', { content_new: newPrescription });

    if (error) {
        alert('처방전 저장 중 오류가 발생했습니다: ' + error.message);
    } else {
        alert('처방전이 저장되었습니다.');
        const { data: newPrescriptionData } = await supabase.from('prescriptions').select('id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
        if(newPrescriptionData) setPrescriptions(newPrescriptionData);
        setNewPrescription('');
    }
  };

  const addInterest = () => {
    if (newInterest && !interestTags.includes(newInterest)) {
      setInterestTags([...interestTags, newInterest]);
      setNewInterest('');
    }
  };

  const removeInterest = (interestToRemove: string) => {
    setInterestTags(interestTags.filter(interest => interest !== interestToRemove));
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="p-2 md:p-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md">
        
        <div className="p-4 md:p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 mb-4">프로필</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">닉네임</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="닉네임을 입력하세요" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">관심사 태그</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {interestTags.map(interest => (
                  <span key={interest} className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full">
                    {interest}
                    <button onClick={() => removeInterest(interest)} className="ml-2 text-blue-600 hover:text-blue-800">x</button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex">
                <input type="text" value={newInterest} onChange={(e) => setNewInterest(e.target.value)} className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="태그 추가" />
                <button onClick={addInterest} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300">추가</button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 mb-4">사용자 정보</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">상태/증상</label>
                    <input type="text" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="현재 상태나 증상을 입력하세요" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">키(cm)</label>
                        <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">몸무게(kg)</label>
                        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">연령대</label>
                        <input type="text" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                    </div>
                </div>
            </div>
        </div>

        <div className="p-4 md:p-6 border-b">
            <button onClick={handleSaveProfile} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">프로필 저장</button>
        </div>

        <div className="p-4 md:p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 mb-4">약 처방전</h2>
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">새 처방전 추가</h3>
                    <textarea value={newPrescription} onChange={(e) => setNewPrescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" rows={4} placeholder="처방받은 약에 대한 내용을 입력하세요."></textarea>
                    <button onClick={handleAddPrescription} className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">처방전 저장</button>
                </div>
                <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">저장된 처방전 목록</h3>
                    <ul className="space-y-2">
                        {prescriptions.map(p => (
                            <li key={p.id} className="p-3 bg-gray-50 rounded-md border">
                                <p className="text-gray-800 whitespace-pre-wrap">{p.content}</p>
                                <p className="text-xs text-gray-500 mt-2">{new Date(p.created_at).toLocaleString('ko-KR')}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">또는 사진 업로드 (개발 예정)</label>
                    <input type="file" disabled className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700"/>
                </div>
            </div>
        </div>

        <div className="p-4 md:p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 mb-4">사용자 활동 지수</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-100 p-3 rounded-lg"><strong>총 활동 시간:</strong> <span>{activityMetrics?.total_activity_time_minutes || '-'} 분</span></div>
            <div className="bg-gray-100 p-3 rounded-lg"><strong>총 대화 횟수:</strong> <span>{activityMetrics?.total_messages || '-'} 개</span></div>
            <div className="bg-gray-100 p-3 rounded-lg"><strong>받은 리액션:</strong> <span>{activityMetrics?.total_reactions_received || '-'} 개</span></div>
            <div className="bg-gray-100 p-3 rounded-lg"><strong>메시지 공유 횟수:</strong> <span>{activityMetrics?.total_shares || '-'} 회</span></div>
            <div className="bg-gray-100 p-3 rounded-lg"><strong>개설한 대화방:</strong> <span>{activityMetrics?.rooms_created || '-'} 개</span></div>
            <div className="bg-gray-100 p-3 rounded-lg"><strong>방 참여자수:</strong> <span>{activityMetrics?.participants_in_rooms || '-'} 명</span></div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">앱 설정</h2>
          <ul className="divide-y divide-gray-200">
            <li className="py-3 flex justify-between items-center">
              <span className="font-medium text-gray-700">알림</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"/>
              </button>
            </li>
            <li className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50">
              <span className="font-medium text-gray-700">공지사항</span>
              <span className="text-gray-400">&gt;</span>
            </li>
            <li className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50">
              <span className="font-medium text-gray-700">고객센터/운영정책</span>
              <span className="text-gray-400">&gt;</span>
            </li>
            <li className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50">
              <span className="font-medium text-gray-700">앱 관리</span>
              <span className="text-gray-400">&gt;</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
