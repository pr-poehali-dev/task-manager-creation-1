CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  report_year INTEGER NOT NULL,
  report_month INTEGER NOT NULL,
  month_label TEXT NOT NULL,
  department TEXT NOT NULL,
  rows_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);