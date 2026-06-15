CREATE TABLE IF NOT EXISTS paid_services (
  id SERIAL PRIMARY KEY,
  service_name TEXT NOT NULL,
  applicant_name TEXT NOT NULL DEFAULT '',
  hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 1420,
  is_fixed_price BOOLEAN NOT NULL DEFAULT FALSE,
  fixed_price NUMERIC(12,2),
  extra_costs JSONB NOT NULL DEFAULT '[]',
  tag_ids INTEGER[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  contract_draft_url TEXT,
  contract_final_url TEXT,
  service_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
