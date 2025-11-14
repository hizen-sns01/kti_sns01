ALTER TABLE public.popular_topics
ADD COLUMN chatroom_id UUID,
ADD COLUMN message_id BIGINT;

-- 외래 키 제약 조건 추가 (선택 사항이지만 데이터 무결성을 위해 권장)
-- chatroom_id는 public.chatrooms 테이블의 id를 참조합니다.
ALTER TABLE public.popular_topics
ADD CONSTRAINT fk_popular_topics_chatroom_id
FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id)
ON DELETE SET NULL; -- 채팅방이 삭제되면 해당 토픽의 chatroom_id를 NULL로 설정

-- message_id는 public.messages 테이블의 id를 참조합니다.
ALTER TABLE public.popular_topics
ADD CONSTRAINT fk_popular_topics_message_id
FOREIGN KEY (message_id) REFERENCES public.messages(id)
ON DELETE SET NULL; -- 메시지가 삭제되면 해당 토픽의 message_id를 NULL로 설정
