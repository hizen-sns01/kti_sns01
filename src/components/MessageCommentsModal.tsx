import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Comment } from '../types';
import { useUser } from '@supabase/auth-helpers-react';

// Helper function to build a tree from the flat list of comments
const buildCommentTree = (comments: Omit<Comment, 'children'>[]): Comment[] => {
  const commentMap = new Map<number, Comment>();
  const rootComments: Comment[] = [];

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

interface CommentItemProps {
  comment: Comment;
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
            className="w-full border rounded-lg p-2"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500">취소</button>
            <button onClick={handleUpdate} className="text-sm text-blue-500">저장</button>
          </div>
        </div>
      ) : (
        <p className={`text-gray-700 ${comment.is_deleted ? 'italic' : ''}`}>{comment.is_deleted ? '삭제된 댓글입니다.' : comment.content}</p>
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


interface MessageCommentsModalProps {
  messageId: number; // Changed to number to match DB
  onClose: () => void;
}

const MessageCommentsModal: React.FC<MessageCommentsModalProps> = ({ messageId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const user = useUser();

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_comments_for_message', { root_id: messageId });

      if (error) throw error;

      const commentTree = buildCommentTree(data || []);
      setComments(commentTree);
    } catch (error: any) {
      console.error('Error fetching comments:', error.message);
    } finally {
      setLoading(false);
    }
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
        replying_to_message_id: replyingTo || messageId, // Reply to selected comment or root message
      });

    if (error) {
      console.error('Error adding comment:', error.message);
    } else {
      setNewComment('');
      setReplyingTo(null);
      await fetchComments(); // Refetch all comments to show the new one
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;

    // First, check if the comment has children
    const { data: children, error: childrenError } = await supabase
      .from('messages')
      .select('id')
      .eq('replying_to_message_id', commentId);

    if (childrenError) {
      console.error('Error checking for children:', childrenError.message);
      return;
    }

    if (children && children.length > 0) {
      // Soft delete: update content and set is_deleted flag
      const { error } = await supabase
        .from('messages')
        .update({ content: '삭제된 댓글입니다.', is_deleted: true })
        .eq('id', commentId);
      if (error) console.error('Error soft deleting comment:', error.message);
    } else {
      // Hard delete: no children, so just delete the row
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', commentId);
      if (error) console.error('Error deleting comment:', error.message);
    }
    await fetchComments(); // Refetch to update UI
  };

  const handleUpdateComment = async (commentId: number, newContent: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ content: newContent })
      .eq('id', commentId);
    if (error) console.error('Error updating comment:', error.message);
    await fetchComments();
  };

  const handleReply = (commentId: number) => {
    setReplyingTo(commentId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl h-3/4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">댓글</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>
        <div className="space-y-4 flex-grow overflow-y-auto pr-2">
          {loading ? (
            <p>댓글을 불러오는 중...</p>
          ) : comments.length > 0 ? (
            comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} onReply={handleReply} onDelete={handleDeleteComment} onUpdate={handleUpdateComment} currentUserId={user?.id} />
            ))
          ) : (
            <p>아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
          )}
        </div>
        <form onSubmit={handleAddComment} className="mt-4">
          {replyingTo && (
            <div className="text-sm text-gray-600 mb-2">
              선택된 댓글에 답글 다는 중...
              <button onClick={() => setReplyingTo(null)} className="ml-2 text-red-500 font-semibold">취소</button>
            </div>
          )}
          <div className="flex items-center">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-grow border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={replyingTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
            />
            <button type="submit" className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={!newComment.trim() || submitting}>
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageCommentsModal;