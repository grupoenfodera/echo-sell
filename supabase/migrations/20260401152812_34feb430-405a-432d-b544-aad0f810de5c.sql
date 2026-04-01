-- Schedule daily cleanup at midnight UTC
SELECT cron.schedule(
  'daily-cleanup-svp',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bouzzszmopkzvcoqkqqx.supabase.co/functions/v1/daily-cleanup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdXp6c3ptb3BrenZjb3FrcXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDkyOTUsImV4cCI6MjA5MDYyNTI5NX0.uJkIbzdOIn2Ul4WOzeAVXEdTaA2GV6knI0HVgUSiBxo"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);