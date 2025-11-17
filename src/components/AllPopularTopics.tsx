import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import { Comment as ThreadedComment } from '../types'; // Use the updated type

// --- Interfaces ---
interface Topic {
  id: number;
  topic: string;
  sources: string[];
  summary: string;
  type: 'weekly' | 'daily';
  chatroom_id?: string;
  message_id?: number;
}

// --- Helper function to build a tree from the flat list of comments ---
const buildCommentTree = (comments: Omit<ThreadedComment, 'children'>[]): ThreadedComment[] => {
  const commentMap = new Map<number, ThreadedComment>();
  const rootComments: ThreadedComment[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id)!;
    if (comment.replying_to_message_id && commentMap.has(comment.replying_to_message_id)) {
      const parent = commentMap.get(comment.replying_to_message_id)!;
      parent.children.push(commentNode);
    } else {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
};

// --- Recursive CommentItem Component ---
interface CommentItemProps {
  comment: ThreadedComment;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => Promise<void>;
  onUpdate: (commentId: number, newContent: string) => Promise<void>;
  currentUserId: string | undefined;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, onDelete, onUpdate, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const handleUpdate = async () => {
    if (editedContent.trim() === '') return;
    await onUpdate(comment.id, editedContent);
    setIsEditing(false);
  };

  const isOwner = comment.user_id === currentUserId;

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center mb-1">
        <span className="font-semibold text-sm text-gray-800">{comment.is_deleted ? '삭제된 사용자' : comment.nickname || '알 수 없는 사용자'}</span>
      </div>
      {isEditing ? (
        <div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500">취소</button>
            <button onClick={handleUpdate} className="text-sm text-blue-500">저장</button>
          </div>
        </div>
      ) : (
        <p className={`text-gray-700 text-sm ${comment.is_deleted ? 'italic' : ''}`}>{comment.is_deleted ? '삭제된 댓글입니다.' : comment.content}</p>
      )}
      <div className="text-xs text-gray-400 mt-2 flex items-center space-x-4">
        <span>{new Date(comment.created_at).toLocaleString()}</span>
        {!comment.is_deleted && (
          <>
            <button onClick={() => onReply(comment.id)} className="hover:underline">답글 달기</button>
            {isOwner && (
              <>
                <button onClick={() => setIsEditing(true)} className="hover:underline">수정</button>
                <button onClick={() => onDelete(comment.id)} className="hover:underline text-red-500">삭제</button>
              </>
            )}
          </>
        )}
      </div>
      <div className="pl-4 border-l-2 border-gray-200 mt-2 space-y-2">
        {comment.children.map(child => (
          <CommentItem key={child.id} comment={child} onReply={onReply} onDelete={onDelete} onUpdate={onUpdate} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
};

// --- ThreadedCommentList Component ---
const ThreadedCommentList = ({ messageId, chatroomId }: { messageId: number, chatroomId: string | undefined }) => {
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const user = useUser();

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_comments_for_message', { root_id: messageId });

    if (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } else {
      const commentTree = buildCommentTree(data || []);
      setComments(commentTree);
    }
    setLoading(false);
  }, [messageId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedComment = newComment.trim();
    if (trimmedComment === '' || !user) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('messages')
      .insert({
        content: trimmedComment,
        user_id: user.id,
        replying_to_message_id: replyingTo || messageId,
        chatroom_id: chatroomId,
      });

    if (error) {
      console.error('Error adding comment:', error.message);
      alert('댓글 등록에 실패했습니다.');
    } else {
      setNewComment('');
      setReplyingTo(null);
      await fetchComments();
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    const { data: children, error: childrenError } = await supabase
      .from('messages').select('id').eq('replying_to_message_id', commentId);

    if (childrenError) {
      console.error('Error checking for children:', childrenError.message);
      return;
    }

    if (children && children.length > 0) {
      const { error } = await supabase.from('messages')
        .update({ content: '삭제된 댓글입니다.', is_deleted: true }).eq('id', commentId);
      if (error) console.error('Error soft deleting comment:', error.message);
    } else {
      const { error } = await supabase.from('messages').delete().eq('id', commentId);
      if (error) console.error('Error deleting comment:', error.message);
    }
    await fetchComments();
  };

  const handleUpdateComment = async (commentId: number, newContent: string) => {
    const { error } = await supabase.from('messages').update({ content: newContent }).eq('id', commentId);
    if (error) console.error('Error updating comment:', error.message);
    await fetchComments();
  };

  if (loading) return <div className="text-sm text-gray-500 p-2">댓글을 불러오는 중...</div>;

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="space-y-2">
        {comments.length > 0 ? (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} onReply={setReplyingTo} onDelete={handleDeleteComment} onUpdate={handleUpdateComment} currentUserId={user?.id} />
          ))
        ) : (
          <div className="text-sm text-gray-500 p-2">아직 댓글이 없습니다.</div>
        )}
      </div>
      {user && (
        <form onSubmit={handleAddComment} className="mt-4">
          {replyingTo && (
            <div className="text-sm text-gray-600 mb-2">
              선택된 댓글에 답글 다는 중...
              <button type="button" onClick={() => setReplyingTo(null)} className="ml-2 text-red-500 font-semibold">취소</button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-grow border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={replyingTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
            />
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={submitting || !newComment.trim()}>
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// --- TopicCard Component ---
const TopicCard = ({ topic, sources, summary, message_id, chatroom_id }: Topic) => {
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="mb-2">
        <span className="text-lg font-bold text-gray-800">{topic}</span>
      </div>
      {sources && sources.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-gray-500">출처: {sources.join(', ')}</span>
        </div>
      )}
      <p className="text-gray-600 text-sm">{summary}</p>
      <div className="mt-4 flex justify-start">
        {message_id && (
          <button onClick={() => setIsCommentsVisible(p => !p)} className="text-blue-500 hover:text-blue-700 text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.606 1.123 2.987 2.675 3.124h14.15c1.552-.137 2.675-1.518 2.675-3.124s-1.123-2.987-2.675-3.124H4.925C3.373 9.773 2.25 11.154 2.25 12.76z" /></svg>
            {isCommentsVisible ? '댓글 숨기기' : '댓글 펼치기'}
          </button>
        )}
      </div>
      {isCommentsVisible && message_id && <ThreadedCommentList messageId={message_id} chatroomId={chatroom_id} />}
    </div>
  );
};

// --- AllPopularTopics Component ---
const AllPopularTopics: React.FC = () => {
  const [weeklyTopics, setWeeklyTopics] = useState<Topic[]>([]);
  const [dailyTopics, setDailyTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('popular_topics')
          .select('*, chatroom_id, message_id')
          .in('type', ['weekly', 'daily'])
          .order('score', { ascending: false });

        if (error) throw error;

        setWeeklyTopics(data.filter(t => t.type === 'weekly').slice(0, 3));
        setDailyTopics(data.filter(t => t.type === 'daily').slice(0, 5));

      } catch (err: any) {
        console.error('Error fetching popular topics:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">인기 토픽을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">실시간 토픽</h2>
        <div className="space-y-4">
          {weeklyTopics.length > 0 ? (
            weeklyTopics.map((item) => (
              <TopicCard key={`weekly-${item.id}`} {...item} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">아직 집계된 주간 인기 토픽이 없습니다.</p>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">일일 인기 토픽</h2>
        <div className="space-y-4">
          {dailyTopics.length > 0 ? (
            dailyTopics.map((item) => (
              <TopicCard key={`daily-${item.id}`} {...item} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">아직 집계된 일일 인기 토픽이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllPopularTopics;
