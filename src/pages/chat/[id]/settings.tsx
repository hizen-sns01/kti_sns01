import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabaseClient';
import { useChatroomAdmin } from '../../../context/ChatroomAdminContext';

const ChatroomSettingsPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query; // chatroom ID
  const [chatroomName, setChatroomName] = useState('');
  const [curatorPersona, setCuratorPersona] = useState('');
  const [idleThresholdMinutes, setIdleThresholdMinutes] = useState<number | ''>(0);
  const [isIdleDetectionEnabled, setIsIdleDetectionEnabled] = useState(false);
  const [enableArticleSummary, setEnableArticleSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useChatroomAdmin(); // Check admin status

  const [error, setError] = useState<string | null>(null);

  const fetchChatroomDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('chatrooms')
      .select('name, persona, idle_threshold_minutes, enable_article_summary')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching chatroom details:', error.message);
      setError('채팅방 정보를 불러오는 데 실패했습니다.');
    } else if (data) {
      setChatroomName(data.name);
      setCuratorPersona(data.persona || '');
      const threshold = data.idle_threshold_minutes || 0;
      setIdleThresholdMinutes(threshold);
      setIsIdleDetectionEnabled(threshold > 0);
      setEnableArticleSummary(data.enable_article_summary || false);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchChatroomDetails();
  }, [fetchChatroomDetails]);

  const handleSave = useCallback(async (settings: Partial<any>) => {
    if (!id || !isAdmin) return;

    setSaving(true);
    const { error } = await supabase
      .from('chatrooms')
      .update(settings)
      .eq('id', id);

    if (error) {
      console.error('Error updating chatroom settings:', error.message);
      alert('채팅방 설정 업데이트 실패: ' + error.message);
    } else {
      // alert('채팅방 설정이 성공적으로 업데이트되었습니다.');
    }
    setSaving(false);
  }, [id, isAdmin]);

  const handleIdleDetectionToggle = () => {
    const newEnabledState = !isIdleDetectionEnabled;
    setIsIdleDetectionEnabled(newEnabledState);

    if (newEnabledState) {
      // Turning ON: Set default to 1440 minutes (24 hours)
      setIdleThresholdMinutes(1440);
    } else {
      // Turning OFF: Display 0, actual save will happen on form submit
      setIdleThresholdMinutes(0);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isAdmin || saving) return;

    setSaving(true);

    const thresholdValue = isIdleDetectionEnabled 
      ? (idleThresholdMinutes === '' ? 0 : idleThresholdMinutes) 
      : 0;

    const settingsToUpdate = {
      name: chatroomName,
      persona: curatorPersona,
      idle_threshold_minutes: thresholdValue,
      enable_article_summary: enableArticleSummary,
    };

    console.log('Updating chatroom with settings:', settingsToUpdate);

    const { error } = await supabase
      .from('chatrooms')
      .update(settingsToUpdate)
      .eq('id', id);

    if (error) {
      console.error('Error updating chatroom settings:', error.message);
      alert('채팅방 설정 업데이트 실패: ' + error.message);
    } else {
      alert('채팅방 설정이 성공적으로 업데이트되었습니다.');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (!isAdmin) {
    return <div className="p-4 text-center text-red-500">관리자만 이 페이지에 접근할 수 있습니다.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">채팅방 설정</h1>

      <form onSubmit={handleFormSubmit} className="space-y-8">
        <div>
          <label htmlFor="chatroomName" className="block text-lg font-medium text-gray-700 mb-2">
            채팅방 이름
          </label>
          <input
            type="text"
            id="chatroomName"
            value={chatroomName}
            onChange={(e) => setChatroomName(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={saving}
            required
          />
        </div>

        <div>
          <label htmlFor="curatorPersona" className="block text-lg font-medium text-gray-700 mb-2">
            큐레이터 페르소나
          </label>
          <textarea
            id="curatorPersona"
            value={curatorPersona}
            onChange={(e) => setCuratorPersona(e.target.value)}
            rows={5}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={saving}
          />
        </div>

        <div className="space-y-4 p-4 border rounded-md">
          <div className="flex items-center justify-between">
            <label htmlFor="enableIdleDetection" className="flex-grow text-lg font-medium text-gray-700">
              채팅 유휴 시간 감지 기능
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="enableIdleDetection"
                checked={isIdleDetectionEnabled}
                onChange={handleIdleDetectionToggle}
                className="sr-only peer"
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div>
            <label htmlFor="idleThresholdMinutes" className={`block text-sm font-medium mb-2 ${isIdleDetectionEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
              유휴 시간 (분)
            </label>
            <input
              type="number"
              id="idleThresholdMinutes"
              value={isIdleDetectionEnabled ? idleThresholdMinutes : 0}
              onChange={(e) => setIdleThresholdMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              disabled={!isIdleDetectionEnabled || saving}
              min="0"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-md">
          <label htmlFor="enableArticleSummary" className="flex-grow text-lg font-medium text-gray-700">
            관심사 대상 기사 요약 출력 기능
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="enableArticleSummary"
              checked={enableArticleSummary}
              onChange={() => setEnableArticleSummary(prev => !prev)}
              className="sr-only peer"
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? '저장 중...' : '변경 사항 저장'}
        </button>
      </form>
    </div>
  );
};

export default ChatroomSettingsPage;
