import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Interest {
  value: string;
  description: string;
}

interface CreateChatroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatroomCreated: () => void;
}

const CreateChatroomModal: React.FC<CreateChatroomModalProps> = ({ isOpen, onClose, onChatroomCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchInterests = async () => {
        // 1. Fetch all possible interests from common_code
        const { data: commonCodes, error: commonCodeError } = await supabase
          .from('common_code')
          .select('value, description')
          .eq('category', 'INTERESTS');

        if (commonCodeError) {
          console.error('Error fetching interests:', commonCodeError);
          return;
        }

        // 2. Fetch interests that are already used by existing chatrooms
        const { data: existingChatrooms, error: chatroomsError } = await supabase
          .from('chatrooms')
          .select('interest')
          .not('interest', 'is', null);

        if (chatroomsError) {
          console.error('Error fetching existing chatroom interests:', chatroomsError);
          return;
        }

        const usedInterests = new Set(existingChatrooms.map(c => c.interest));

        // 3. Filter out used interests
        const availableInterests = commonCodes.filter(i => !usedInterests.has(i.value));
        
        setInterests(availableInterests);
        if (availableInterests.length > 0) {
          setSelectedInterest(availableInterests[0].value);
        }
      };

      fetchInterests();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!name.trim() || !selectedInterest) {
      alert('채팅방 이름과 관심사는 필수 항목입니다.');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // 1. Create chatroom
      const { data: newChatroom, error: createError } = await supabase
        .from('chatrooms')
        .insert({
          name,
          description,
          interest: selectedInterest,
          is_activate: true,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // 2. Add creator as participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({ chatroom_id: newChatroom.id, user_id: user.id });

      if (participantError) throw participantError;

      // 3. Add creator as admin
      const { error: adminError } = await supabase
        .from('chatroom_ad')
        .insert({ chatroom_id: newChatroom.id, user_id: user.id, role: 'RA' });

      if (adminError) throw adminError;

      alert('채팅방이 성공적으로 만들어졌습니다.');
      onChatroomCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating chatroom:', error);
      alert(`채팅방 만들기에 실패했습니다: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">새 채팅방 만들기</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">채팅방 이름</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">채팅방 설명</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="interest" className="block text-sm font-medium text-gray-700">관심사 선택</label>
            <select
              id="interest"
              value={selectedInterest}
              onChange={(e) => setSelectedInterest(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {interests.length > 0 ? (
                interests.map(interest => (
                  <option key={interest.value} value={interest.value}>
                    {interest.description} ({interest.value})
                  </option>
                ))
              ) : (
                <option disabled>사용 가능한 관심사가 없습니다.</option>
              )}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isCreating ? '만드는 중...' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChatroomModal;
