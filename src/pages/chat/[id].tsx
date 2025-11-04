import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import botcall from '../../botcall.json';

import MessageCommentsModal from '../../components/MessageCommentsModal';

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  chatroom_id: string;
  profiles: {
    nickname: string;
  } | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  user_has_liked: boolean;
  user_has_disliked: boolean;
}

const messagesCache: { [key: string]: Message[] } = {};

const ChatroomPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  
  // For suggestions feature
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    setupUser();
  }, []);

  const fetchMessages = async () => {
    if (!id) return;

    if (messagesCache[id as string]) {
      setMessages(messagesCache[id as string]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('messages')
        .select(`*,
          profiles(nickname),
          message_likes(count),
          message_dislikes(count),
          message_comments(count)
        `)
        .eq('chatroom_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithLikes = await Promise.all(data.map(async (item) => {
        const { data: likeData } = await supabase
          .from('message_likes')
          .select('*')
          .eq('message_id', item.id)
          .eq('user_id', user?.id)
          .single();

        const { data: dislikeData } = await supabase
          .from('message_dislikes')
          .select('*')
          .eq('message_id', item.id)
          .eq('user_id', user?.id)
          .single();

        return {
          ...item,
          like_count: item.message_likes[0]?.count || 0,
          dislike_count: item.message_dislikes[0]?.count || 0,
          comment_count: item.message_comments[0]?.count || 0,
          user_has_liked: !!likeData,
          user_has_disliked: !!dislikeData,
        };
      }));

      messagesCache[id as string] = messagesWithLikes || [];
      setMessages(messagesWithLikes || []);
      await supabase.rpc('update_last_read_at', { chatroom_id_param: id });
    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchMessages();

    const channel = supabase.channel(`chatroom:${id}`);
    const messageSubscription = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatroom_id=eq.${id}` }, async (payload) => {
      const newMessagePayload = payload.new as Message;
      const { data: profileData, error } = await supabase.from('profiles').select('nickname').eq('id', newMessagePayload.user_id).single();
      if (error) {
        console.error("Error fetching profile for new message:", error);
      } else {
        newMessagePayload.profiles = profileData;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { data: likeData } = await supabase
        .from('message_likes')
        .select('*')
        .eq('message_id', newMessagePayload.id)
        .eq('user_id', user?.id)
        .single();

      const { data: dislikeData } = await supabase
        .from('message_dislikes')
        .select('*')
        .eq('message_id', newMessagePayload.id)
        .eq('user_id', user?.id)
        .single();

      const { count: likeCount } = await supabase
        .from('message_likes')
        .select('count', { count: 'exact' })
        .eq('message_id', newMessagePayload.id);

      const { count: dislikeCount } = await supabase
        .from('message_dislikes')
        .select('count', { count: 'exact' })
        .eq('message_id', newMessagePayload.id);

      const { count: commentCount } = await supabase
        .from('message_comments')
        .select('count', { count: 'exact' })
        .eq('message_id', newMessagePayload.id);

      newMessagePayload.like_count = likeCount || 0;
      newMessagePayload.dislike_count = dislikeCount || 0;
      newMessagePayload.comment_count = commentCount || 0;
      newMessagePayload.user_has_liked = !!likeData;
      newMessagePayload.user_has_disliked = !!dislikeData;

      setMessages((prev) => [...prev, newMessagePayload]);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value.startsWith('/')) {
      const search = value.substring(1).toLowerCase();
      const filteredSuggestions = botcall.keywords.filter(keyword => keyword.substring(1).toLowerCase().startsWith(search));
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(`${suggestion} `);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || !currentUser || !id) return;

    const { error } = await supabase.from('messages').insert([{ chatroom_id: id, user_id: currentUser.id, content: trimmedMessage }]);
    
    if (error) {
      console.error('Error sending message:', error.message);
      return;
    }

    setNewMessage('');
    setShowSuggestions(false);

    for (const keyword of botcall.keywords) {
      if (trimmedMessage.startsWith(keyword)) {
        const question = trimmedMessage.substring(keyword.length).trim();
        if (question) {
          fetch('/api/curator/qa-handler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, chatroomId: id }),
          }).catch(err => console.error('QA handler call failed:', err));
        }
        break;
      }
    }
  };

  const handleLike = async (messageId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const newMessages = messages.map(m => {
      if (m.id === messageId) {
        const user_has_disliked = m.user_has_disliked;
        return {
          ...m,
          like_count: m.user_has_liked ? m.like_count - 1 : m.like_count + 1,
          user_has_liked: !m.user_has_liked,
          dislike_count: user_has_disliked ? m.dislike_count - 1 : m.dislike_count,
          user_has_disliked: false,
        };
      }
      return m;
    });
    setMessages(newMessages);

    if (message.user_has_liked) {
      await supabase.from('message_likes').delete().eq('message_id', messageId).eq('user_id', user.id);
    } else {
      await supabase.from('message_likes').insert({ message_id: messageId, user_id: user.id });
      if (message.user_has_disliked) {
        await supabase.from('message_dislikes').delete().eq('message_id', messageId).eq('user_id', user.id);
      }
    }
  };

  const handleDislike = async (messageId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const newMessages = messages.map(m => {
      if (m.id === messageId) {
        const user_has_liked = m.user_has_liked;
        return {
          ...m,
          dislike_count: m.user_has_disliked ? m.dislike_count - 1 : m.dislike_count + 1,
          user_has_disliked: !m.user_has_disliked,
          like_count: user_has_liked ? m.like_count - 1 : m.like_count,
          user_has_liked: false,
        };
      }
      return m;
    });
    setMessages(newMessages);

    if (message.user_has_disliked) {
      await supabase.from('message_dislikes').delete().eq('message_id', messageId).eq('user_id', user.id);
    } else {
      await supabase.from('message_dislikes').insert({ message_id: messageId, user_id: user.id });
      if (message.user_has_liked) {
        await supabase.from('message_likes').delete().eq('message_id', messageId).eq('user_id', user.id);
      }
    }
  };

  const handleCommentClick = (messageId: number) => {
    setSelectedMessageId(messageId);
    setShowCommentsModal(true);
  };

  const handleCloseCommentsModal = () => {
    setSelectedMessageId(null);
    setShowCommentsModal(false);
  };

  const handleShare = (messageId: number) => {
    const url = `${window.location.origin}/chat/${id}?message=${messageId}`;
    navigator.clipboard.writeText(url)
      .then(() => alert('메시지 링크가 클립보드에 복사되었습니다.'))
      .catch(err => console.error('클립보드 복사 실패:', err));
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => alert('클립보드에 복사되었습니다.'))
      .catch(err => console.error('클립보드 복사 실패:', err));
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="flex-grow overflow-y-auto p-2 md:p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.user_id === currentUser?.id;
            const isAiCurator = message.user_id === '4bb3e1a3-099b-4b6c-bf3a-8b60c51baa79';
            const isCommand = !isAiCurator && botcall.keywords.some(keyword => message.content.startsWith(keyword));

            return (
              <div key={message.id} className={`flex w-full items-end ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end max-w-xs md:max-w-md ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar Area */}
                  <div className="mx-2 flex shrink-0 flex-col items-center self-center text-xs text-gray-500">
                    {!isCurrentUser && (
                      <>
                        {isAiCurator ? (
                          <div className="relative h-8 w-8 rounded-full bg-green-200">
                            <svg className="h-full w-full p-1.5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300"></div>
                        )}
                        <div className="mt-1 w-12 truncate">{message.profiles?.nickname || (isAiCurator ? 'AI' : '...')}</div>
                      </>
                    )}
                  </div>

                  {/* Bubble Area */}
                  <div className="group relative">
                    {isCommand ? (
                      <div className="bg-gray-700 text-gray-100 px-4 py-3 rounded-lg shadow-md flex items-center font-mono">
                        <svg className="w-5 h-5 mr-3 text-yellow-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M9 3v4M7 5h4m5 3v4m-2-2h4m-7 7v4m-2-2h4" />
                        </svg>
                        <span>{message.content}</span>
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-lg ${isCurrentUser ? 'bg-blue-500 text-white rounded-br-none' : isAiCurator ? 'bg-green-500 text-white rounded-bl-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                        {isAiCurator && <strong className='block text-xs mb-1'>AI 큐레이터</strong>}
                        {message.content}
                      </div>
                    )}
                    <div className={`absolute top-0 bottom-0 -left-2 transform -translate-x-full flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ${isCurrentUser ? 'hidden' : ''}`}>
                        <button onClick={() => handleLike(message.id)} className={`p-1 rounded-full bg-gray-100 hover:bg-gray-200 ${message.user_has_liked ? 'text-blue-500' : 'text-gray-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.787l.25.125a2 2 0 002.29-1.787V12.5a2 2 0 012-2h3.362a2 2 0 001.788-1.106l.25-.5a2 2 0 00-1.788-2.894H14.5a2 2 0 00-2 2v1.333H6z" />
                            </svg>
                        </button>
                        <button onClick={() => handleDislike(message.id)} className={`p-1 rounded-full bg-gray-100 hover:bg-gray-200 ${message.user_has_disliked ? 'text-blue-500' : 'text-gray-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V4.237a2 2 0 00-1.106-1.787l-.25-.125a2 2 0 00-2.29 1.787V7.5a2 2 0 01-2 2H5.138a2 2 0 00-1.788 1.106l-.25.5a2 2 0 001.788 2.894H7.5a2 2 0 002-2V9.667H14z" />
                            </svg>
                        </button>
                        <button onClick={() => handleCommentClick(message.id)} className="p-1 rounded-full bg-gray-100 hover:bg-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button onClick={() => handleShare(message.id)} className="p-1 rounded-full bg-gray-100 hover:bg-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                            </svg>
                        </button>
                        <button onClick={() => handleCopy(message.content)} className="p-1 rounded-full bg-gray-100 hover:bg-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                            </svg>
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {showCommentsModal && selectedMessageId && (
        <MessageCommentsModal messageId={selectedMessageId} onClose={handleCloseCommentsModal} />
      )}

      <div className="p-2 md:p-4 bg-white border-t relative">
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 p-2 bg-white border rounded-lg shadow-lg">
            <p className="text-xs text-gray-500 mb-1 px-2">명령어 제안</p>
            {suggestions.map(suggestion => (
              <div key={suggestion} onClick={() => handleSuggestionClick(suggestion)} className="p-2 hover:bg-gray-100 rounded cursor-pointer font-mono">
                {suggestion}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            className="flex-grow border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`메시지를 입력하세요... (${botcall.keywords.join(', ')}로 질문 가능)`}
          />
          <button type="submit" className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={!newMessage.trim()}>
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatroomPage;