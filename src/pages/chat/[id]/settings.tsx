import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabaseClient';
import { useChatroomAdmin } from '../../../context/ChatroomAdminContext';

const ChatroomSettingsPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query; // chatroom ID
  const [chatroomName, setChatroomName] = useState('');
  const [curatorPersona, setCuratorPersona] = useState('');
  const [idleThresholdMinutes, setIdleThresholdMinutes] = useState<number | ''>(0);
  const [enableArticleSummary, setEnableArticleSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useChatroomAdmin(); // Check admin status

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchChatroomDetails = async () => {
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
        setIdleThresholdMinutes(data.idle_threshold_minutes || 0);
        setEnableArticleSummary(data.enable_article_summary || false);
      }
      setLoading(false);
    };

    fetchChatroomDetails();
  }, [id]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatroomName(e.target.value);
  };

  const handlePersonaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCuratorPersona(e.target.value);
  };

  const handleIdleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdleThresholdMinutes(value === '' ? '' : Number(value));
  };

  const handleEnableArticleSummaryChange = () => {
    setEnableArticleSummary(prev => !prev);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isAdmin || saving) return; // Only admin can save

    setSaving(true);
    const { error } = await supabase
      .from('chatrooms')
      .update({
        name: chatroomName,
        persona: curatorPersona,
        idle_threshold_minutes: idleThresholdMinutes === '' ? null : idleThresholdMinutes,
        enable_article_summary: enableArticleSummary,
      })
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

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label htmlFor="chatroomName" className="block text-lg font-medium text-gray-700 mb-2">
            채팅방 이름
          </label>
          <input
            type="text"
            id="chatroomName"
            value={chatroomName}
            onChange={handleNameChange}
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
            onChange={handlePersonaChange}
            rows={5}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={saving}
          />
        </div>

        <div>
          <label htmlFor="idleThresholdMinutes" className="block text-lg font-medium text-gray-700 mb-2">
            채팅 유휴 시간 감지 (분)
          </label>
          <input
            type="number"
            id="idleThresholdMinutes"
            value={idleThresholdMinutes}
            onChange={handleIdleThresholdChange}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={saving}
            min="0"
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="enableArticleSummary" className="flex-grow text-lg font-medium text-gray-700">
            관심사 대상 기사 요약 출력 기능 활성화
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="enableArticleSummary"
              checked={enableArticleSummary}
              onChange={handleEnableArticleSummaryChange}
              className="sr-only peer"
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? '저장 중...' : '변경 사항 저장'}
        </button>
      </form>
    </div>
  );
};

export default ChatroomSettingsPage;
