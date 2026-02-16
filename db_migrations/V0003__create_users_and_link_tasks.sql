
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE tasks ADD COLUMN user_id TEXT;
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

ALTER TABLE attachments ADD COLUMN user_id TEXT;
