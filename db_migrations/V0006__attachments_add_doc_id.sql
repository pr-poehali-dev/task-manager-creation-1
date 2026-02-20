ALTER TABLE t_p54371197_task_manager_creatio.attachments
  ADD COLUMN IF NOT EXISTS doc_id TEXT NULL;

UPDATE t_p54371197_task_manager_creatio.attachments
  SET task_id = '' WHERE task_id IS NULL;
