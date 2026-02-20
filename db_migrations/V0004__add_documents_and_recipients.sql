
CREATE TABLE t_p54371197_task_manager_creatio.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES t_p54371197_task_manager_creatio.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category VARCHAR(20) NOT NULL DEFAULT 'other' CHECK (category IN ('letters', 'internal', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p54371197_task_manager_creatio.recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES t_p54371197_task_manager_creatio.users(id),
  full_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
