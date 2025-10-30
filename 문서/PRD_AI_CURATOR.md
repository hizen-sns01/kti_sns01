



1\. \*\*프로젝트 개요 및 목표:\*\* AI 큐레이터의 세 가지 핵심 역할 명시.

&nbsp;   

2\. \*\*아키텍처 및 기술 스택:\*\* Next.js, Vercel Cron Jobs, Supabase (Realtime, Postgres), Gemini API 역할 정의 및 매핑.

&nbsp;   

3\. \*\*Supabase 데이터베이스 스키마 (핵심):\*\* `users`, `rooms`, `messages` 테이블 및 `last\_message\_at` 칼럼 설계.

&nbsp;   

4\. \*\*기능별 세부 구현 계획:\*\*

&nbsp;   

&nbsp;   - \*\*유휴 대화:\*\* Vercel Cron Jobs을 이용한 5분 간격 감지 및 30분 초과 시 Gemini 호출.

&nbsp;       

&nbsp;   - \*\*기사 공유:\*\* 4시간 간격 스케줄링 및 Google Search API 또는 RSS를 통한 기사 수집 후 Gemini를 이용한 요약/유도 멘트 생성.

&nbsp;       

&nbsp;   - \*\*키워드 호출:\*\* Supabase Realtime을 통한 실시간 키워드 감지 및 Gemini API를 통한 전문적인 Q\&A 처리.

&nbsp;       

5\. \*\*LLM 활용 및 프롬프트 전략:\*\* `gemini-2.5-flash` 모델 추천, System Instruction을 활용한 관심사 적합성 강화, 기능별 핵심 프롬프트 예시 제시.

&nbsp;   



이제 이 세부 계획을 바탕으로 개발을 진행하시면 됩니다. 성공적인 프로젝트가 되기를 응원합니다!



Google Keep LLM\_PRD: AI 큐레이터 기능 세부 개발 계획LLM\_PRD.md: 관심사 기반 SNS (채팅 및 게시글) AI 큐레이터 기능 프로젝트 세부 계획



1\. 프로젝트 개요



\- 프로젝트명: 관심사 기반 SNS 앱 (채팅 및 게시글 포함)



\- 개발 목표: Vercel과 Supabase를 활용하여 실시간 채팅 및 게시글 기능을 제공하는 SNS를 개발하고, 채팅방에 3가지 핵심 역할을 수행하는 AI 큐레이터를 통합합니다.



\- 핵심 기술 스택: Next.js (Vercel), Supabase (Postgres, Realtime, Edge Functions), Google Gemini API



\- AI 큐레이터 역할:



1\. 유휴 시간 대화 시작 (기본 30분)



2\. 관심사 기반 인기 기사 공유 (4시간 간격)



3\. 키워드 호출 질문 답변 (Gemini API 활용)



4\. 아키텍처 및 데이터베이스 설계



2.1. 기술 스택 매핑





| 기능 영역     | 기술/서비스            | 세부 사용 목적                                           |

| :-------- | :---------------- | :------------------------------------------------- |

| 프론트엔드/API | Next.js / Vercel  | 채팅 UI, 게시글 피드, 사용자 인증 관리, 큐레이터 로직을 위한 API Route 구현 |

| 데이터베이스    | Supabase Postgres | 사용자, 채팅방, 게시글, 메시지 데이터 저장                          |

| 실시간 통신    | Supabase Realtime | 채팅 메시지 실시간 동기화, 큐레이터 호출 키워드 감지                     |

| 자동화/스케줄링  | Vercel Cron Jobs  | 유휴 시간/기사 공유 로직 주기적 실행                              |

| AI 모델     | Google Gemini API | 대화 시작 주제 생성, 기사 요약, 사용자 질문 답변 생성                   |



2.2. Supabase 데이터베이스 스키마 (핵심 테이블)



| 테이블명     | 주요 칼럼                                                    | 설명                                                  |

| :------- | :------------------------------------------------------- | :-------------------------------------------------- |

| users    | id, username, profile\_image                              | 사용자 정보                                              |

| rooms    | id, name, topic\_keyword, last\_message\_at                 | 채팅방 정보 및 핵심 관심사 키워드. last\_message\_at는 유휴 시간 감지에 사용. |

| messages | id, room\_id, user\_id, content, is\_ai\_curator, created\_at | 채팅 메시지. is\_ai\_curator로 AI가 보낸 메시지 식별.               |



3\. AI 큐레이터 기능별 세부 구현 계획



3.1. 기능 1: 유휴 시간 대화 시작 (Idle Conversation Starter)



| 구분        | 내용                                                                                                               | 구현 기술                                        |

| :-------- | :--------------------------------------------------------------------------------------------------------------- | :------------------------------------------- |

| 감지 로직     | 1. rooms 테이블의 last\_message\_at와 현재 시간을 비교하여 30분 이상 차이 나는 채팅방 목록을 조회.                                              | SQL 쿼리 (Supabase)                            |

| 스케줄링      | 5분 간격으로 실행되는 Vercel Cron Job 설정.                                                                                 | Vercel Cron Jobs                             |

| Gemini 호출 | 감지된 채팅방의 topic\_keyword를 System Instruction으로 활용하여, "이 주제에 대해 참여자들이 대화를 시작할 만한 흥미로운 질문/랜덤 주제를 2줄 이내로 생성해줘."라고 요청. | Next.js API Route (Serverless) -> Gemini API |

| 데이터 처리    | 생성된 대화 시작 메시지를 is\_ai\_curator: true로 설정하여 messages 테이블에 삽입.                                                       | Supabase Client (PostgREST)                  |



3.2. 기능 2: 관심사 기반 인기 기사 공유 (Curated News Sharer)



| 구분        | 내용                                                                                                                        | 구현 기술                                               |

| :-------- | :------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------- |

| 스케줄링      | 4시간 간격으로 실행되는 Vercel Cron Job 설정.                                                                                         | Vercel Cron Jobs                                    |

| 기사 수집     | 모든 rooms의 topic\_keyword를 순회하며, Google Search API 또는 RSS/뉴스 API를 통해 최신/인기 기사 1개를 검색. (Gemini는 검색 결과가 아닌 수집된 기사를 가공하는 데 사용) | Next.js API Route (Serverless) -> Google Search API |

| Gemini 호출 | 수집된 기사의 제목, URL, 본문 일부를 Gemini API에 전달하며 "이 기사의 핵심 요약과 함께 채팅방 참여자들의 대화를 유도할 멘트를 3줄로 작성해줘."라고 요청.                          | Next.js API Route -> Gemini API                     |

| 데이터 처리    | 생성된 요약 및 유도 멘트를 메시지 형태로 messages 테이블에 삽입.                                                                                 | Supabase Client (PostgREST)                         |



3.3. 기능 3: 키워드 호출 질문 답변 (Keyword Invocation Q\&A)



| 구분 | 내용 | 구현 기술 |

| :--- | :--- | :--- |

| 감지 및 파싱 | Supabase Realtime의 messages 구독을 통해 새로운 메시지 도착 즉시 감지. 메시지 내용에 호출 키워드 (@큐레이터 등) 포함 여부 확인 및 질문 내용 추출. | Supabase Realtime + Supabase Edge Function (또는 Next.js API Route Webhook) |

| Gemini 호출 | 추출된 질문과 채팅방의 topic\_keyword를 System Instruction으로 넣어 Gemini API 호출. 관심사에 대한 전문적인 답변을 요청. | Next.js API Route -> Gemini API |

| 데이터 처리 | Gemini 응답을 messages 테이블에 삽입하여 채팅방에 즉시 출력. | Supabase Client (PostgREST) |



4\. LLM 활용 및 프롬프트 전략



4.1. Gemini API 모델 선택



\- Chatting/Q\&A: gemini-2.5-flash (빠른 응답 속도와 우수한 추론 능력으로 실시간성이 중요한 채팅방에 적합)



\- System Instruction 활용: 모든 API 호출 시, 해당 채팅방의 topic\_keyword를 System Instruction으로 제공하여 답변의 관심사 적합성을 높입니다.



4.2. 핵심 프롬프트 예시 (Korean)



| 기능     | 목적            | System Instruction (예시: "개발")                                 | User Prompt                                                   |

| :----- | :------------ | :------------------------------------------------------------ | :------------------------------------------------------------ |

| 유휴 대화  | 흥미로운 대화 주제 생성 | "당신은 개발 채팅방의 큐레이터입니다. 참여자들의 대화를 유도하는 멘트를 생성하세요."              | "현재 채팅방에 30분간 활동이 없습니다. 개발 주제와 관련된 랜덤 질문 하나를 2줄 이내로 생성해줘."    |

| 기사 공유  | 기사 요약 및 유도 멘트 | "당신은 개발 채팅방의 큐레이터입니다. 요약은 객관적으로, 유도 멘트는 친근하게 작성하세요."          | "제목: \[기사 제목]. 본문: \[기사 요약]. 이 정보를 바탕으로 요약 1줄, 유도 멘트 2줄을 생성해줘." |

| 키워드 호출 | 사용자 질문 답변     | "당신은 개발 분야에 대한 전문 지식을 가진 AI 큐레이터입니다. 질문에 대해 상세하고 정확하게 답변하세요." | "\[사용자가 질문한 내용]"                                               |



5\. 배포 및 운영



| 구분       | 내용                                                               |

| :------- | :--------------------------------------------------------------- |

| 프론트엔드 배포 | Next.js 애플리케이션을 Vercel에 연결하여 CI/CD 자동화.                          |

| 백엔드 배포   | Supabase는 자체적으로 호스팅되며, Edge Functions 및 Realtime 서비스 활용.         |

| 크론잡 모니터링 | Vercel Cron Jobs 대시보드를 통해 주기적인 작업의 성공/실패 여부를 모니터링 및 로깅.          |

| API 키 관리 | Gemini API 키를 Vercel 환경 변수(Environment Variables)에 안전하게 저장 및 관리. |



6\. 추가 고려 사항



\- 비용 최적화: Gemini API 호출이 잦으므로, 프롬프트의 토큰 사용량을 최소화하도록 설계하고, 답변 길이를 제한합니다.



\- AI 페르소나: AI 큐레이터에게 친근하고 일관성 있는 페르소나를 부여하여 사용자 경험을 향상시킵니다. (System Instruction에 페르소나 명시)



\- 오류 처리: API 호출 실패, 뉴스 검색 실패 등 모든 백엔드 로직에 대한 견고한 오류 처리 및 로깅 시스템을 구축합니다.

