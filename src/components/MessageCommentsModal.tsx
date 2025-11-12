import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Comment } from '../types';

interface MessageCommentsModalProps {
  messageId: string;
  onClose: () => void;
  onCommentAdded: (newComment: Comment) => void;
}

const MessageCommentsModal: React.FC<MessageCommentsModalProps> = ({ messageId, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('message_comments')
          .select(`
            *,
            profiles ( nickname )
          `)
          .eq('message_id', messageId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setComments(data || []);
      } catch (error: any) {
        console.error('Error fetching comments:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [messageId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedComment = newComment.trim();
    if (trimmedComment === '') return;

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('message_comments')
      .insert({ message_id: messageId, user_id: user.id, content: trimmedComment })
      .select(`
        *,
        profiles ( nickname )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error.message);
      setSubmitting(false);
      return;
    }

    onCommentAdded(data);
    setNewComment('');
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">댓글</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>
        <div className="space-y-4 h-64 overflow-y-auto">
          {loading ? (
            <p>댓글을 불러오는 중...</p>
          ) : comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="bg-gray-100 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <span className="font-semibold text-sm text-gray-800">{comment.profiles?.nickname || '알 수 없는 사용자'}</span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(comment.created_at).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p>아직 댓글이 없습니다.</p>
          )}
        </div>
        <form onSubmit={handleAddComment} className="mt-4 flex items-center">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-grow border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="댓글을 입력하세요..."
          />
          <button type="submit" className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={!newComment.trim() || submitting}>
            {submitting ? '등록 중...' : '등록'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageCommentsModal;
