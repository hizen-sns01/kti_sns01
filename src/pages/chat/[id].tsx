import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import botcall from '../../botcall.json';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown

import { Comment, Message } from '../../types';
import MessageCommentsModal from '../../components/MessageCommentsModal';
import { useChatroomAdmin } from '../../context/ChatroomAdminContext';

const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date);
};

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
};

const ChatroomPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, messageId: null as string | null });
  const [showDropdown, setShowDropdown] = useState(false); // State for dropdown menu
  const [chatroomName, setChatroomName] = useState('채팅방'); // State for chatroom name

  const { isAdmin, setAdminStatus } = useChatroomAdmin(); // Use chatroom admin context

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const MESSAGES_PER_PAGE = 30;

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Effect to save state to localStorage on unmount
  useEffect(() => {
    const saveState = () => {
        if (id && messages.length > 0 && scrollContainerRef.current) {
            localStorage.setItem(`chat_messages_${id}`, JSON.stringify(messages));
            localStorage.setItem(`chat_scroll_position_${id}`, scrollContainerRef.current.scrollTop.toString());
        }
    };

    window.addEventListener('beforeunload', saveState);

    return () => {
        saveState();
        window.removeEventListener('beforeunload', saveState);
    };
  }, [id, messages]);

  useEffect(() => {
    const setupUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    setupUser();

    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenu.visible) {
            setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
        }
        // Close dropdown if click is outside the dropdown and its toggle button
        const target = event.target as HTMLElement;
        if (showDropdown && !target.closest('.relative')) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
        document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible, showDropdown]);

  // Effect to check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!id || !currentUser) return;

      const { data, error } = await supabase
        .from('chatroom_ad')
        .select('id')
        .eq('chatroom_id', id)
        .eq('user_id', currentUser.id)
        .eq('role', 'RA')
        .eq('is_active', true); // Removed .single()
      
      if (error) {
        console.error('Error checking admin status:', error.message);
        setAdminStatus(false);
      } else if (data && data.length > 0) { // Check if data array is not empty
        setAdminStatus(true);
      } else {
        setAdminStatus(false);
      }
    };

    checkAdminStatus();
  }, [id, currentUser, setAdminStatus]);

  // Effect to fetch chatroom name
  useEffect(() => {
    const fetchChatroomName = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('chatrooms')
        .select('name')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching chatroom name:', error.message);
      } else if (data) {
        setChatroomName(data.name);
      }
    };
    fetchChatroomName();
  }, [id]);

  const processMessages = async (data: any[]) => {
    if (!data || data.length === 0) {
      return [];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return data.map(item => ({
        ...item,
        like_count: item.message_likes?.[0]?.count || 0,
        dislike_count: item.message_dislikes?.[0]?.count || 0,
        user_has_liked: false,
        user_has_disliked: false,
      }));
    }

    const messageIds = data.map(m => m.id);

    const { data: likesData, error: likesError } = await supabase
      .from('message_likes')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', messageIds);

    const { data: dislikesData, error: dislikesError } = await supabase
      .from('message_dislikes')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', messageIds);

    if (likesError) console.error('Error fetching likes:', likesError);
    if (dislikesError) console.error('Error fetching dislikes:', dislikesError);

    const likedIds = new Set(likesData?.map(l => l.message_id) || []);
    const dislikedIds = new Set(dislikesData?.map(d => d.message_id) || []);

    return data.map(item => ({
      ...item,
      like_count: item.message_likes?.[0]?.count || 0,
      dislike_count: item.message_dislikes?.[0]?.count || 0,
      user_has_liked: likedIds.has(item.id),
      user_has_disliked: dislikedIds.has(item.id),
    }));
  };

  const fetchInitialMessages = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles ( nickname, is_ai_curator ),
          message_likes ( count ),
          message_dislikes ( count ),
          parent_message:replying_to_message_id ( content, profiles ( nickname ) )
        `)
        .eq('chatroom_id', id)
        .order('created_at', { ascending: false })
        .range(0, MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      if (data) {
        const processed = await processMessages(data);
        setMessages(processed.reverse());
      }
      await supabase.rpc('update_last_read_at', { chatroom_id_param: id });
    } catch (error: any) {
      console.error('Error fetching initial messages:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreMessages = async () => {
    if (!id) return;
    setLoadingMore(true);

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles ( nickname, is_ai_curator ),
        message_likes ( count ),
        message_dislikes ( count ),
        parent_message:replying_to_message_id ( content, profiles ( nickname ) )
      `)
      .eq('chatroom_id', id)
      .order('created_at', { ascending: false })
      .range(page * MESSAGES_PER_PAGE, (page + 1) * MESSAGES_PER_PAGE - 1);

    if (error) {
      console.error('Error fetching more messages:', error);
      setLoadingMore(false);
      return;
    }

    if (data && data.length > 0) {
      const processed = await processMessages(data);
      const scrollContainer = scrollContainerRef.current;
      const oldScrollHeight = scrollContainer?.scrollHeight || 0;

      setMessages(prev => [...processed.reverse(), ...prev]);
      setPage(prev => prev + 1);

      if (scrollContainer) {
        requestAnimationFrame(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight - oldScrollHeight;
        });
      }
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

    // Main effect for initialization and subscriptions

    useEffect(() => {

      if (!id) return;

  

      fetchInitialMessages();

  

      const channel = supabase.channel(`chatroom:${id}`);

      const messageSubscription = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatroom_id=eq.${id}` }, async (payload) => {

        

        const scrollContainer = scrollContainerRef.current;

        const isAtBottom = scrollContainer ? (scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight) < 100 : true;

  

        // First, fetch the new message itself

        const { data: newMessage, error } = await supabase

          .from('messages')

          .select(`

            *,

            profiles ( nickname, is_ai_curator ),

            message_likes ( count ),

            message_dislikes ( count )

          `)

          .eq('id', payload.new.id)

          .single();

  

        if (error) {

          console.error('Error fetching new message:', error);

          return;

        }

  

        if (newMessage) {

          // If it's a reply, fetch the parent message data in a separate query to avoid race conditions

          if (newMessage.replying_to_message_id) {

            const { data: parentData, error: parentError } = await supabase

              .from('messages')

              .select('content, profiles (nickname)')

              .eq('id', newMessage.replying_to_message_id)

              .single();

  

            if (parentError) {

              console.error('Error fetching parent message for realtime update:', parentError);

            } else {

              // Manually attach the parent message data

              newMessage.parent_message = parentData;

            }

          }

  

          const processedPayload = await processMessages([newMessage]);

          setMessages(prev => [...prev, ...processedPayload]);

          if (isAtBottom) {

              setTimeout(() => scrollToBottom('smooth'), 0);

          } else {

              setShowNewMessageButton(true);

          }

        }

      });

  

      channel.subscribe();

      return () => { supabase.removeChannel(channel); };

    }, [id]);

  useLayoutEffect(() => {
    const cachedScroll = localStorage.getItem(`chat_scroll_position_${id}`);
    if (cachedScroll) {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = parseInt(cachedScroll, 10);
        }
        localStorage.removeItem(`chat_scroll_position_${id}`);
    } else if (!loading && page === 1 && messages.length > 0) {
        scrollToBottom('auto');
    }
  }, [id, loading, page, messages.length]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        if (scrollContainer.scrollTop === 0 && hasMore && !loadingMore) {
            fetchMoreMessages();
        }
        if (scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 1) {
            setShowNewMessageButton(false);
        }
      }
    };

    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.addEventListener('scroll', handleScroll);
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, page]);

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

    const messageToInsert: any = {
      chatroom_id: id,
      user_id: currentUser.id,
      content: trimmedMessage,
      curator_message_type: 'user',
    };

    if (replyingTo) {
      messageToInsert.replying_to_message_id = replyingTo.id;
    }

    const { error } = await supabase.from('messages').insert([messageToInsert]);
    
    if (error) {
      console.error('Error sending message:', error.message);
      return;
    }

    setNewMessage('');
    setReplyingTo(null);
    setShowSuggestions(false);
    scrollToBottom('smooth');
  };

  const handleLike = async (messageId: string) => {
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

  const handleDislike = async (messageId: string) => {
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

  const handleReplyClick = (messageId: string) => {
    const messageToReply = messages.find(m => m.id === messageId);
    if (messageToReply) {
      setReplyingTo(messageToReply);
    }
    setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
  };

  const handleShare = (messageId: string) => {
    const url = `${window.location.origin}/chat/${id}?message=${messageId}`;
    navigator.clipboard.writeText(url)
      .then(() => alert('메시지 링크가 클립보드에 복사되었습니다.'))
      .catch(err => console.error('클립보드 복사 실패:', err));
    setContextMenu({ visible: false, x: 0, y: 0, messageId: null }); // Close context menu
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => alert('클립보드에 복사되었습니다.'))
      .catch(err => console.error('클립보드 복사 실패:', err));
    setContextMenu({ visible: false, x: 0, y: 0, messageId: null }); // Close context menu
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, messageId });
  };

  const handleNewMessageButtonClick = () => {
    scrollToBottom('smooth');
    setShowNewMessageButton(false);
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  console.log('TEST: ChatroomPage rendered'); // Add this line

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Chatroom Header with Hamburger Menu */}
      <div className="flex justify-between items-center p-4 border-b bg-white relative">
        <Link href="/chat" className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30">
          <a className="text-blue-500 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            목록
          </a>
        </Link>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white py-1 px-4 shadow-lg z-10" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 75% 100%, 0% 100%)' }}>
          <h1 className="text-lg font-bold">{chatroomName}</h1>
        </div>
        <div className="relative ml-auto z-20">
          <button onClick={() => setShowDropdown(!showDropdown)} className="p-2 rounded-full hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
              {isAdmin && (
                <Link href={`/chat/${id}/settings`}>
                  <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">채팅방 설정</a>
                </Link>
              )}
              {/* Add other menu items here if needed */}
            </div>
          )}
        </div>
      </div>

      {contextMenu.visible && (
            <div style={{ top: contextMenu.y, left: contextMenu.x }} className="absolute z-50 bg-white border rounded-lg shadow-lg p-2 flex flex-col space-y-1">
                <button onClick={() => { handleLike(contextMenu.messageId!); }} className="p-2 text-left hover:bg-gray-100 rounded">👍 좋아요</button>
                <button onClick={() => { handleDislike(contextMenu.messageId!); }} className="p-2 text-left hover:bg-gray-100 rounded">👎 싫어요</button>
                <button onClick={() => { handleReplyClick(contextMenu.messageId!); }} className="p-2 text-left hover:bg-gray-100 rounded">💬 답장</button>
                <button onClick={() => { handleShare(contextMenu.messageId!); }} className="p-2 text-left hover:bg-gray-100 rounded">🔗 공유</button>
                <button onClick={() => { handleCopy(messages.find(m => m.id === contextMenu.messageId!)?.content || ''); }} className="p-2 text-left hover:bg-gray-100 rounded">복사</button>
            </div>
        )}
      <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-2 md:p-4">
        {loadingMore && <div className="text-center p-2">이전 대화 로딩 중...</div>}
        <div className="space-y-4">
          {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const nextMessage = messages[index + 1];

            const showDateSeparator = !previousMessage || new Date(message.created_at).toDateString() !== new Date(previousMessage.created_at).toDateString();

            const isSameUserAsNext = nextMessage && nextMessage.user_id === message.user_id;
            const isSameMinuteAsNext = nextMessage && new Date(nextMessage.created_at).getMinutes() === new Date(message.created_at).getMinutes() && new Date(nextMessage.created_at).getHours() === new Date(message.created_at).getHours() && new Date(nextMessage.created_at).toDateString() === new Date(message.created_at).toDateString();

            const showTimestamp = !isSameUserAsNext || !isSameMinuteAsNext;

            const isCurrentUser = message.user_id === currentUser?.id;
            const isAiCurator = message.profiles?.is_ai_curator === true;
            
            // --- Style Definitions ---
            let bubbleClasses = 'px-4 py-2 rounded-lg inline-block';
            let quoteClasses = 'p-2 mb-2 border-l-2';
            let quoteAuthorClasses = 'text-xs font-semibold';
            let quoteTextClasses = 'text-sm max-h-12 overflow-hidden'; // Fix: Use max-height instead of truncate

            if (isAiCurator) {
                bubbleClasses += ' bg-yellow-200 text-yellow-900 font-mono';
                quoteClasses += ' border-yellow-400 bg-yellow-50';
                quoteAuthorClasses += ' text-yellow-800';
                quoteTextClasses += ' text-yellow-800';
            } else if (isCurrentUser) {
                bubbleClasses += ' bg-[#E8F5E9] text-black';
                quoteClasses += ' bg-[#D9FDD3] border-l-[#40B340]';
                quoteAuthorClasses += ' text-[#555555]';
                quoteTextClasses += ' text-[#555555]';
            } else {
                bubbleClasses += ' bg-white text-black shadow-sm';
                quoteClasses += ' bg-[#F1F5F9] border-l-[#0088CC]';
                quoteAuthorClasses += ' text-black';
                quoteTextClasses += ' text-black';
            }
            // --- End Style Definitions ---

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="text-center my-4">
                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">{formatDateSeparator(message.created_at)}</span>
                  </div>
                )}
                <div onContextMenu={(e) => handleContextMenu(e, message.id)} className={`flex items-end ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col space-y-1 text-base w-full max-w-[80%] mx-2 ${isCurrentUser ? 'order-2 items-end' : 'order-1 items-start'}`}>
                    {!isCurrentUser && <span className="text-xs text-gray-500 mb-1">{message.profiles?.nickname || '사용자'}</span>}
                    <div className={bubbleClasses}>
                        {message.parent_message && (
                          <div className={quoteClasses}>
                            <p className={quoteAuthorClasses}>{message.parent_message.profiles?.nickname || '이름없음'}</p>
                            <p className={quoteTextClasses}>{message.parent_message.content}</p>
                          </div>
                        )}
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    {(message.like_count > 0 || message.dislike_count > 0) && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            {message.like_count > 0 && <span className="flex items-center">👍 {message.like_count}</span>}
                            {message.dislike_count > 0 && <span className="flex items-center">👎 {message.dislike_count}</span>}
                        </div>
                    )}
                  </div>
                  {showTimestamp && <span className={`text-xs text-gray-400 ${isCurrentUser ? 'order-1' : 'order-2'}`}>{formatTime(message.created_at)}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {showCommentsModal && selectedMessageId && (
        <MessageCommentsModal
          messageId={selectedMessageId}
          onClose={() => setShowCommentsModal(false)}
          onCommentAdded={(newComment) => {
            // This logic is now handled by the new reply feature
          }}
        />
      )}

      <div className="p-2 md:p-4 bg-white border-t relative">
        {replyingTo && (
          <div className="p-2 bg-gray-100 border-b border-gray-200 rounded-t-lg">
            <div className="flex justify-between items-center text-sm">
              <p className="text-gray-600">
                <span className="font-semibold">{replyingTo.profiles?.nickname || '사용자'}</span>님에게 답장
              </p>
              <button onClick={() => setReplyingTo(null)} className="font-bold text-gray-500 hover:text-gray-700">X</button>
            </div>
            <p className="text-xs text-gray-500 truncate mt-1">{replyingTo.content}</p>
          </div>
        )}
        {showNewMessageButton && (
            <button 
                onClick={handleNewMessageButtonClick}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg text-sm animate-bounce"
            >
                ↓ 새 메시지
            </button>
        )}
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