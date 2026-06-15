CREATE TABLE IF NOT EXISTS service_tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO service_tags (name) VALUES
  ('Лицензия'),
  ('Отчёт'),
  ('Работа'),
  ('Экспертиза'),
  ('Консультация')
ON CONFLICT (name) DO NOTHING;