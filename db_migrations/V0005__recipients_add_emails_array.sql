ALTER TABLE t_p54371197_task_manager_creatio.recipients
  ADD COLUMN IF NOT EXISTS emails TEXT[] NOT NULL DEFAULT '{}';

UPDATE t_p54371197_task_manager_creatio.recipients
  SET emails = ARRAY[email]
  WHERE email IS NOT NULL AND email != '';
