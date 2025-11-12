export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  message_id: string;
  profiles: {
    nickname: string;
  } | null;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  chatroom_id: string;
  curator_message_type: 'idle' | 'news' | 'user' | null;
  profiles: {
    nickname: string;
    is_ai_curator: boolean;
  } | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  user_has_liked: boolean;
  user_has_disliked: boolean;
  message_comments: Comment[];
}
