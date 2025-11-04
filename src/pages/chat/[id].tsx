import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import botcall from '../../botcall.json';

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  chatroom_id: string;
  is_deleted?: boolean;
  like_count?: number;
  user_has_liked?: boolean;
  profiles: {
    nickname: string;
  } | null;
}

const ChatroomPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    setupUser();
  }, []);

  const fetchMessages = async () => {
    if (!id || !currentUser) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles ( nickname ),
          user_has_liked:message_likes ( user_id )
        `)
        .eq('chatroom_id', id)
        .eq('message_likes.user_id', currentUser.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const processedMessages = data.map(msg => ({
        ...msg,
        user_has_liked: msg.user_has_liked.length > 0,
      }));

      setMessages(processedMessages || []);

      await supabase.rpc('update_last_read_at', { chatroom_id_param: id });

    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && currentUser) {
      fetchMessages();
    }
  }, [id, currentUser]);

  useEffect(() => {
    if (!id) return;

    const handleNewOrUpdatedMessage = (payload: any) => {
      const updatedMessage = payload.new as Message;
      setMessages(prevMessages => {
        const messageExists = prevMessages.find(m => m.id === updatedMessage.id);
        if (messageExists) {
          // It's an update
          return prevMessages.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m);
        } else {
          // It's an insert
          return [...prevMessages, updatedMessage];
        }
      });
    };

    const messageSubscription = supabase
      .channel(`chatroom:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `chatroom_id=eq.${id}` },
        handleNewOrUpdatedMessage
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSoftDelete = async (messageId: number) => {
    const { error } = await supabase.rpc('soft_delete_message', { p_message_id: messageId });
    if (error) {
      console.error('Error deleting message:', error);
      alert('메시지 삭제에 실패했습니다.');
    }
  };

  const handleToggleLike = async (message: Message) => {
    if (!currentUser) return;

    // Optimistic UI update
    setMessages(messages.map(m => {
      if (m.id === message.id) {
        return {
          ...m,
          like_count: m.user_has_liked ? (m.like_count ?? 1) - 1 : (m.like_count ?? 0) + 1,
          user_has_liked: !m.user_has_liked,
        };
      }
      return m;
    }));

    const { error } = await supabase.rpc('toggle_like_message', { p_message_id: message.id });
    if (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setMessages(messages.map(m => {
        if (m.id === message.id) {
          return { ...m }; // Revert to original state before the click
        }
        return m;
      }));
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || !currentUser || !id) return;

    const keywords = botcall.keywords;
    let isBotCall = false;
    let question = '';

    for (const keyword of keywords) {
      if (trimmedMessage.startsWith(keyword)) {
        question = trimmedMessage.substring(keyword.length).trim();
        isBotCall = true;
        break;
      }
    }

    if (isBotCall) {
      setNewMessage('');
      if (question) {
        try {
          const response = await fetch('/api/curator/qa-handler', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: question,
              chatroomId: id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI 응답 생성 중 서버에서 오류가 발생했습니다.');
          }

        } catch (error: any) {
          const errorMessage: Message = {
            id: Date.now(),
            user_id: '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79', // AI Curator's user ID
            content: `오류: AI 큐레이터 호출에 실패했습니다. (${error.message})`,
            created_at: new Date().toISOString(),
            chatroom_id: id as string,
            profiles: { nickname: 'AI 큐레이터' } // Manually set profile for display
          };
          setMessages((prevMessages) => [...prevMessages, errorMessage]);
        }
      }
      return;
    }

    const { error } = await supabase.from('messages').insert([
      { chatroom_id: id, user_id: currentUser.id, content: trimmedMessage },
    ]);

    if (error) {
      console.error('Error sending message:', error.message);
    }
    else {
      setNewMessage('');
    }
  };

  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  const handleCopyMessage = async (messageContent: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy message: ', err);
      alert('메시지 복사에 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Message display area */}
      <div className="flex-grow overflow-y-auto p-2 md:p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.user_id === currentUser?.id;
            const isAiCurator = message.user_id === '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';

            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser || isAiCurator ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end max-w-xs md:max-w-md">
                  {!isCurrentUser && !isAiCurator && (
                     <div className="mr-2 text-xs text-gray-500 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 mb-1"></div>
                        {message.profiles?.nickname || '...'}
                     </div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : isAiCurator
                        ? 'bg-green-500 text-white rounded-bl-none' // Different color for AI
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {isAiCurator && <strong className='block text-xs mb-1'>AI 큐레이터</strong>}
                    {message.is_deleted ? '삭제된 메시지입니다.' : message.content}
                    <div className="flex justify-end items-center mt-1 space-x-2 text-xs">
                      {!message.is_deleted && (
                        <>
                          <button
                            onClick={() => handleToggleLike(message)}
                            className={`flex items-center space-x-1 ${message.user_has_liked ? 'text-red-400' : 'text-gray-300'} hover:text-white focus:outline-none`}
                          >
                            <span>♥</span>
                            <span>{message.like_count ?? 0}</span>
                          </button>
                          <button
                            onClick={() => handleCopyMessage(message.content, message.id)}
                            className="text-gray-300 hover:text-white focus:outline-none"
                          >
                            {copiedMessageId === message.id ? '복사됨!' : '복사'}
                          </button>
                        </>
                      )}
                      {isCurrentUser && !message.is_deleted && (
                        <button
                          onClick={() => handleSoftDelete(message.id)}
                          className="text-gray-300 hover:text-white focus:outline-none"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Message input form */}
      <div className="p-2 md:p-4 bg-white border-t">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`메시지를 입력하세요... (${botcall.keywords.join(', ')}로 질문 가능)`}
          />
          <button
            type="submit"
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={!newMessage.trim()}
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatroomPage;
