-- =================================================================
-- Supabase Cron Job Setup Script
-- =================================================================
-- This script schedules the cron jobs for the AI curator features.
--
-- IMPORTANT:
-- 1. Before running, ensure the 'pg_cron' and 'pg_net' extensions are enabled in your Supabase dashboard.
-- 2. Replace the placeholders <YOUR_PROJECT_REF> and <YOUR_SUPABASE_SERVICE_ROLE_KEY> with your actual project details.
-- =================================================================

-- 1. 'idle-starter' 스케줄 등록 (매시간 실행, 테스트용)
-- Finds idle chatrooms and posts a conversation starter.
SELECT cron.schedule(
  'hourly-idle-starter', -- Job name
  '0 * * * *',           -- Schedule: Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://ufczyvtyrtrzolwwnfhf.supabase.co/functions/v1/idle-starter',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmY3p5dnR5cnRyem9sd3duZmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg0NTA3NCwiZXhwIjoyMDc2NDIxMDc0fQ.k5xWWqEdbHhgTpDt56SK-ihPyrzGHtbQUjP_8O4k-zc"}'::jsonb
    )
  $$
);

-- 2. 'news-sharer' 스케줄 등록 (매일 자정에 실행)
-- Finds and shares relevant news articles to chatrooms.
SELECT cron.schedule(
  'daily-news-share', -- Job name
  '0 0 * * *',         -- Schedule: Once a day at midnight UTC
  $$
  SELECT
    net.http_post(
      url:='https://ufczyvtyrtrzolwwnfhf.supabase.co/functions/v1/news-sharer',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmY3p5dnR5cnRyem9sd3duZmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg0NTA3NCwiZXhwIjoyMDc2NDIxMDc0fQ.k5xWWqEdbHhgTpDt56SK-ihPyrzGHtbQUjP_8O4k-zc"}'::jsonb
    )
  $$
);
