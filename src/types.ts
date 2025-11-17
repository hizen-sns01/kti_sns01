export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  nickname: string | null;
  replying_to_message_id: number | null;
  is_deleted: boolean;
  children: Comment[];
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  chatroom_id: string;
  image_url?: string | null;
  replying_to_message_id: string | null;
  parent_message: {
    content: string;
    profiles: {
      nickname: string;
    } | null;
  } | null;
  curator_message_type: 'idle' | 'news' | 'user' | 'QA_RESPONSE' | null;
  is_ai_curator: boolean; // Add this line
  profiles: {
    nickname: string;
    is_ai_curator: boolean;
  } | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  user_has_liked: boolean;
  user_has_disliked: boolean;
}

